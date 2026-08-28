"use server"

import { prisma } from "@/lib/prisma"
import { productSchema, stockAdjustmentSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"

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
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoryId && { categoryId }),
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  })

  // Serializar Decimals a strings para pasar a componentes cliente
  return products.map((p) => ({
    ...p,
    costPrice: p.costPrice.toString(),
    salePrice: p.salePrice.toString(),
    stockQty: p.stockQty.toString(),
    minStockAlert: p.minStockAlert.toString(),
  }))
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!product) return null

  // Serializar Decimals a strings para pasar a componentes cliente
  return {
    ...product,
    costPrice: product.costPrice.toString(),
    salePrice: product.salePrice.toString(),
    stockQty: product.stockQty.toString(),
    minStockAlert: product.minStockAlert.toString(),
  }
}

export async function adjustStock(data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const user = session.user as any
  const validated = stockAdjustmentSchema.parse(data)

  const product = await prisma.product.findUnique({
    where: { id: validated.productId },
  })

  if (!product) throw new Error("Producto no encontrado")

  const newQty = product.stockQty.plus(validated.quantity)
  if (newQty.lt(0)) {
    throw new Error(
      `El ajuste dejaría el stock en negativo (disponible: ${product.stockQty}, ajuste: ${validated.quantity})`
    )
  }
  const movementType =
    validated.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT"

  await prisma.$transaction([
    prisma.product.update({
      where: { id: validated.productId },
      data: { stockQty: newQty },
    }),
    prisma.stockMovement.create({
      data: {
        productId: validated.productId,
        type: movementType,
        quantity: new Prisma.Decimal(validated.quantity),
        qtyBefore: product.stockQty,
        qtyAfter: newQty,
        reason: validated.reason,
        userId: user.id,
      },
    }),
  ])

  return { success: true }
}
