"use server"

import { prisma } from "@/lib/prisma"
import { productSchema, stockAdjustmentSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { getActiveBranchId } from "@/lib/branch-context"
import { getNotificationSettings } from "@/lib/notifications/settings"
import { notifyLowStock, notifyStockOut, notifyBigStockAdjustment } from "@/lib/notifications/events"

export async function createProduct(data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const validated = productSchema.parse(data)

  return prisma.product.create({
    data: {
      ...validated,
      costPrice: new Prisma.Decimal(validated.costPrice),
      salePrice: new Prisma.Decimal(validated.salePrice),
      minStockAlert: new Prisma.Decimal(validated.minStockAlert),
    },
  })
}

export async function updateProduct(id: string, data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const validated = productSchema.parse(data)

  return prisma.product.update({
    where: { id },
    data: {
      ...validated,
      costPrice: new Prisma.Decimal(validated.costPrice),
      salePrice: new Prisma.Decimal(validated.salePrice),
      minStockAlert: new Prisma.Decimal(validated.minStockAlert),
    },
  })
}

export async function getProducts(categoryId?: string) {
  const branchId = await getActiveBranchId()
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoryId && { categoryId }),
    },
    include: {
      category: true,
      stocks: { where: { branchId } },
    },
    orderBy: { name: "asc" },
  })

  // Serializar Decimals a strings para pasar a componentes cliente. El
  // stock mostrado es siempre el de la sucursal activa (una fila
  // inexistente en ProductStock se interpreta como 0).
  return products.map((p) => ({
    ...p,
    costPrice: p.costPrice.toString(),
    salePrice: p.salePrice.toString(),
    stockQty: (p.stocks[0]?.qty ?? new Prisma.Decimal(0)).toString(),
    minStockAlert: p.minStockAlert.toString(),
    stocks: undefined,
  }))
}

export async function getProduct(id: string) {
  const branchId = await getActiveBranchId()
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stocks: { where: { branchId } },
    },
  })
  if (!product) return null

  // Serializar Decimals a strings para pasar a componentes cliente
  return {
    ...product,
    costPrice: product.costPrice.toString(),
    salePrice: product.salePrice.toString(),
    stockQty: (product.stocks[0]?.qty ?? new Prisma.Decimal(0)).toString(),
    minStockAlert: product.minStockAlert.toString(),
    stocks: undefined,
  }
}

export async function adjustStock(data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const user = session.user as any
  const validated = stockAdjustmentSchema.parse(data)
  const branchId = await getActiveBranchId()

  const product = await prisma.product.findUnique({
    where: { id: validated.productId },
  })
  if (!product) throw new Error("Producto no encontrado")

  const productStock = await prisma.productStock.findUnique({
    where: { productId_branchId: { productId: validated.productId, branchId } },
  })
  const currentQty = productStock?.qty ?? new Prisma.Decimal(0)

  const newQty = currentQty.plus(validated.quantity)
  if (newQty.lt(0)) {
    throw new Error(
      `El ajuste dejaría el stock en negativo (disponible: ${currentQty}, ajuste: ${validated.quantity})`
    )
  }
  const movementType =
    validated.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT"

  const [, movement] = await prisma.$transaction([
    prisma.productStock.upsert({
      where: { productId_branchId: { productId: validated.productId, branchId } },
      create: { productId: validated.productId, branchId, qty: newQty },
      update: { qty: newQty },
    }),
    prisma.stockMovement.create({
      data: {
        productId: validated.productId,
        branchId,
        type: movementType,
        quantity: new Prisma.Decimal(validated.quantity),
        qtyBefore: currentQty,
        qtyAfter: newQty,
        reason: validated.reason,
        userId: user.id,
      },
    }),
  ])

  // Notificaciones, siempre después de confirmado el ajuste.
  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  const branchName = branch?.name || branchId
  const minStockAlert = new Decimal(product.minStockAlert.toString())
  if (newQty.lte(0)) {
    notifyStockOut({ productId: product.id, productName: product.name, branchId, branchName })
  } else if (newQty.lte(minStockAlert)) {
    notifyLowStock({
      productId: product.id,
      productName: product.name,
      unitType: product.unitType,
      qty: newQty.toString(),
      branchId,
      branchName,
    })
  }
  const { bigAdjustmentThreshold } = await getNotificationSettings()
  if (Math.abs(validated.quantity) >= bigAdjustmentThreshold) {
    notifyBigStockAdjustment({
      movementId: movement.id,
      productName: product.name,
      branchName,
      quantity: validated.quantity > 0 ? `+${validated.quantity}` : String(validated.quantity),
    })
  }

  return { success: true }
}
