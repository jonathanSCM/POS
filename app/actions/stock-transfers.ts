"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { requireRoleAction } from "@/lib/authz"
import { requireBranchAccess } from "@/lib/branch-context"

function serializeTransfer(t: any) {
  return {
    ...t,
    lines: (t.lines || []).map((l: any) => ({ ...l, quantity: l.quantity?.toString() })),
  }
}

export async function getStockTransfers() {
  const transfers = await prisma.stockTransfer.findMany({
    include: {
      fromBranch: true,
      toBranch: true,
      requestedBy: { select: { name: true } },
      receivedBy: { select: { name: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return transfers.map(serializeTransfer)
}

export async function createStockTransfer(data: {
  fromBranchId: string
  toBranchId: string
  notes?: string
  lines: Array<{ productId: string; productName: string; quantity: number }>
}) {
  const session = await requireRoleAction(["ADMIN", "MANAGER"])
  await requireBranchAccess(data.fromBranchId)

  if (data.fromBranchId === data.toBranchId) {
    throw new Error("La sucursal de origen y destino no pueden ser la misma")
  }
  if (data.lines.length === 0) {
    throw new Error("Agrega al menos un producto a transferir")
  }

  const userId = (session.user as any).id as string
  const code = `TR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

  const transfer = await prisma.stockTransfer.create({
    data: {
      code,
      fromBranchId: data.fromBranchId,
      toBranchId: data.toBranchId,
      requestedById: userId,
      notes: data.notes || null,
      lines: {
        create: data.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: new Prisma.Decimal(l.quantity),
        })),
      },
    },
    include: { lines: true, fromBranch: true, toBranch: true },
  })

  return serializeTransfer(transfer)
}

// Envia la transferencia: descuenta stock de la sucursal de origen ahora
// (queda "en camino"), registra el movimiento TRANSFER_OUT ahi.
export async function sendStockTransfer(id: string) {
  const session = await requireRoleAction(["ADMIN", "MANAGER"])
  const userId = (session.user as any).id as string

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { lines: true } })
    if (!transfer) throw new Error("Transferencia no encontrada")
    if (transfer.status !== "PENDING") {
      throw new Error(`No se puede enviar: la transferencia está en estado ${transfer.status}`)
    }

    await requireBranchAccess(transfer.fromBranchId)

    for (const line of transfer.lines) {
      const stock = await tx.productStock.findUnique({
        where: { productId_branchId: { productId: line.productId, branchId: transfer.fromBranchId } },
      })
      const qtyBefore = stock?.qty ?? new Prisma.Decimal(0)
      if (new Decimal(qtyBefore.toString()).lt(line.quantity.toString())) {
        throw new Error(`Stock insuficiente de ${line.productName} en la sucursal de origen (disponible: ${qtyBefore})`)
      }
      const qtyAfter = qtyBefore.minus(line.quantity)

      await tx.productStock.update({
        where: { productId_branchId: { productId: line.productId, branchId: transfer.fromBranchId } },
        data: { qty: qtyAfter },
      })

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          branchId: transfer.fromBranchId,
          type: "TRANSFER_OUT",
          quantity: new Prisma.Decimal(new Decimal(line.quantity.toString()).negated().toString()),
          qtyBefore,
          qtyAfter,
          userId,
          reason: `Transferencia ${transfer.code} enviada a otra sucursal`,
        },
      })
    }

    return tx.stockTransfer.update({
      where: { id },
      data: { status: "IN_TRANSIT", sentAt: new Date() },
      include: { lines: true, fromBranch: true, toBranch: true },
    }).then(serializeTransfer)
  })
}

// Recibe la transferencia en destino: suma el stock ahi, TRANSFER_IN.
export async function receiveStockTransfer(id: string) {
  const session = await requireRoleAction(["ADMIN", "MANAGER"])
  const userId = (session.user as any).id as string

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { lines: true } })
    if (!transfer) throw new Error("Transferencia no encontrada")
    if (transfer.status !== "IN_TRANSIT") {
      throw new Error(`No se puede recibir: la transferencia está en estado ${transfer.status}`)
    }

    await requireBranchAccess(transfer.toBranchId)

    for (const line of transfer.lines) {
      const stock = await tx.productStock.findUnique({
        where: { productId_branchId: { productId: line.productId, branchId: transfer.toBranchId } },
      })
      const qtyBefore = stock?.qty ?? new Prisma.Decimal(0)
      const qtyAfter = qtyBefore.plus(line.quantity)

      await tx.productStock.upsert({
        where: { productId_branchId: { productId: line.productId, branchId: transfer.toBranchId } },
        create: { productId: line.productId, branchId: transfer.toBranchId, qty: qtyAfter },
        update: { qty: qtyAfter },
      })

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          branchId: transfer.toBranchId,
          type: "TRANSFER_IN",
          quantity: line.quantity,
          qtyBefore,
          qtyAfter,
          userId,
          reason: `Transferencia ${transfer.code} recibida de otra sucursal`,
        },
      })
    }

    return tx.stockTransfer.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date(), receivedById: userId },
      include: { lines: true, fromBranch: true, toBranch: true },
    }).then(serializeTransfer)
  })
}

// Solo se puede cancelar antes de enviar (todavia no se toco stock).
export async function cancelStockTransfer(id: string) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  const transfer = await prisma.stockTransfer.findUnique({ where: { id } })
  if (!transfer) throw new Error("Transferencia no encontrada")
  if (transfer.status !== "PENDING") {
    throw new Error("Solo se puede cancelar una transferencia que todavía no se envió")
  }

  await requireBranchAccess(transfer.fromBranchId)

  return prisma.stockTransfer.update({ where: { id }, data: { status: "CANCELLED" } })
}
