"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Decimal } from "@prisma/client/runtime/library"
import { getActiveBranchId } from "@/lib/branch-context"

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

  const branchId = await getActiveBranchId()
  const qty = new Decimal(data.quantity)

  const batch = await prisma.productBatch.create({
    data: {
      productId: data.productId,
      branchId,
      batchNumber: data.batchNumber,
      quantity: qty,
      qtyRemaining: qty,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
    },
  })

  // Actualizar stock del producto en esta sucursal
  const productStock = await prisma.productStock.findUnique({
    where: { productId_branchId: { productId: data.productId, branchId } },
  })
  const qtyBefore = productStock?.qty ?? new Decimal(0)
  const qtyAfter = qtyBefore.add(qty)

  await prisma.productStock.upsert({
    where: { productId_branchId: { productId: data.productId, branchId } },
    create: { productId: data.productId, branchId, qty: qtyAfter },
    update: { qty: qtyAfter },
  })

  // Registrar movimiento de stock
  await prisma.stockMovement.create({
    data: {
      productId: data.productId,
      branchId,
      batchId: batch.id,
      type: "PURCHASE_IN",
      quantity: qty,
      qtyBefore,
      qtyAfter,
      reason: `Lote ${data.batchNumber} ingresado`,
      userId: (session.user as any).id,
      purchaseOrderId: data.purchaseOrderId,
    },
  })

  return batch
}

export async function getProductBatches(productId: string) {
  const branchId = await getActiveBranchId()
  return await prisma.productBatch.findMany({
    where: { productId, branchId },
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getAllBatches() {
  const branchId = await getActiveBranchId()
  return await prisma.productBatch.findMany({
    where: { branchId },
    orderBy: { expiryDate: "asc" },
    include: {
      product: true,
      supplier: true,
    },
  })
}

export async function getBatchesNearExpiry(daysThreshold: number = 30) {
  const branchId = await getActiveBranchId()
  const today = new Date()
  const threshold = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000)

  return await prisma.productBatch.findMany({
    where: {
      branchId,
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
  const branchId = await getActiveBranchId()
  const today = new Date()

  return await prisma.productBatch.findMany({
    where: {
      branchId,
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
