"use server"

import { prisma } from "@/lib/prisma"
import { purchaseOrderSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"

let poCounter = 0

async function generatePOCode(): Promise<string> {
  const count = await prisma.purchaseOrder.count()
  return `PO-${String(count + 1).padStart(6, "0")}`
}

export async function createPurchaseOrder(data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const user = session.user as any
  const validated = purchaseOrderSchema.parse(data)

  const code = await generatePOCode()

  return prisma.purchaseOrder.create({
    data: {
      code,
      supplierId: validated.supplierId,
      createdById: user.id,
      notes: validated.notes,
      lines: {
        create: validated.lines.map((line: any) => ({
          productId: line.productId,
          quantity: new Prisma.Decimal(line.quantity),
          unitCost: new Prisma.Decimal(line.unitCost),
        })),
      },
    },
    include: {
      lines: true,
      supplier: true,
    },
  })
}

export async function receivePurchaseOrder(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const user = session.user as any
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  })

  if (!po) throw new Error("PO no encontrada")

  // Actualizar productos y crear stock movements
  const updates = po.lines.map((line) =>
    prisma.product.findUnique({
      where: { id: line.productId },
    })
  )

  const products = await Promise.all(updates)

  const productUpdates = po.lines.map((line, idx) => {
    const product = products[idx]!
    const newQty = product!.stockQty.plus(line.quantity)

    return prisma.product.update({
      where: { id: line.productId },
      data: {
        stockQty: newQty,
        costPrice: line.unitCost,
      },
    })
  })

  const movements = po.lines.map((line, idx) => {
    const product = products[idx]!
    const newQty = product!.stockQty.plus(line.quantity)

    return prisma.stockMovement.create({
      data: {
        productId: line.productId,
        type: "PURCHASE_IN",
        quantity: line.quantity,
        qtyBefore: product!.stockQty,
        qtyAfter: newQty,
        purchaseOrderId: id,
        userId: user.id,
      },
    })
  })

  const poUpdate = prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  })

  await prisma.$transaction([...productUpdates, poUpdate, ...movements] as any)

  return { success: true }
}

export async function getPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      createdBy: true,
      lines: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: true,
      lines: { include: { product: true } },
    },
  })
}
