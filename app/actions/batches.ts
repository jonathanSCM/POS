"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Decimal } from "@prisma/client/runtime/library"

export async function createProductBatch(data: {
  productId: string
  batchNumber: string
  quantity: number
  expiryDate?: string
  supplierId?: string
  purchaseOrderId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const qty = new Decimal(data.quantity)

  const batch = await prisma.productBatch.create({
    data: {
      productId: data.productId,
      batchNumber: data.batchNumber,
      quantity: qty,
      qtyRemaining: qty,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
    },
  })

  // Actualizar stock del producto
  await prisma.product.update({
    where: { id: data.productId },
    data: {
      stockQty: {
        increment: qty,
      },
    },
  })

  // Registrar movimiento de stock
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { stockQty: true },
  })

  await prisma.stockMovement.create({
    data: {
      productId: data.productId,
      batchId: batch.id,
      type: "PURCHASE_IN",
      quantity: qty,
      qtyBefore: product!.stockQty.sub(qty),
      qtyAfter: product!.stockQty,
      reason: `Lote ${data.batchNumber} ingresado`,
      userId: (session.user as any).id,
      purchaseOrderId: data.purchaseOrderId,
    },
  })

  return batch
}

export async function getProductBatches(productId: string) {
  return await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getAllBatches() {
  return await prisma.productBatch.findMany({
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getBatchesNearExpiry(daysThreshold: number = 30) {
  const today = new Date()
  const threshold = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000)

  return await prisma.productBatch.findMany({
    where: {
      expiryDate: {
        lte: threshold,
        gte: today,
      },
      qtyRemaining: {
        gt: 0,
      },
    },
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getExpiredBatches() {
  const today = new Date()

  return await prisma.productBatch.findMany({
    where: {
      expiryDate: {
        lt: today,
      },
      qtyRemaining: {
        gt: 0,
      },
    },
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getBatchMovements(batchId: string) {
  return await prisma.stockMovement.findMany({
    where: { batchId },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      sale: true,
    },
  })
}
