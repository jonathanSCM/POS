"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { requireRoleAction } from "@/lib/authz"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"

function serializeReturn(ret: any) {
  return {
    ...ret,
    totalRefunded: ret.totalRefunded?.toString(),
    lines: (ret.lines || []).map((l: any) => ({
      ...l,
      quantity: l.quantity?.toString(),
      refundAmount: l.refundAmount?.toString(),
    })),
  }
}

// Cuanto de cada linea ya se devolvio antes (para no dejar devolver mas de
// lo que realmente se vendio).
async function getReturnedQuantities(saleId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const existing = await tx.returnLine.findMany({
    where: { return: { saleId } },
  })
  const byLine = new Map<string, Decimal>()
  for (const rl of existing) {
    const prev = byLine.get(rl.saleLineId) || new Decimal(0)
    byLine.set(rl.saleLineId, prev.plus(new Decimal(rl.quantity)))
  }
  return byLine
}

// Anula una venta completa: repone TODO el stock, revierte el efecto en caja
// (si fue en efectivo) o el saldo del cliente (si fue a credito), y marca la
// venta como VOIDED. Pensado para corregir un error justo despues de
// venderlo, no para "devoluciones" parciales de mercaderia ya entregada
// (eso es createReturn).
export async function voidSale(saleId: string, reason: string) {
  const session = await requireRoleAction(["ADMIN", "MANAGER"])
  const userId = (session.user as any).id as string

  if (!reason.trim()) throw new Error("Hay que indicar un motivo para anular la venta")

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { lines: true, payments: true },
    })
    if (!sale) throw new Error("Venta no encontrada")
    if (sale.status !== "COMPLETED") {
      throw new Error(`No se puede anular: la venta ya está en estado ${sale.status}`)
    }

    const branchId = sale.branchId
    for (const line of sale.lines) {
      const productStock = await tx.productStock.findUnique({
        where: { productId_branchId: { productId: line.productId, branchId } },
      })
      const qtyBefore = productStock?.qty ?? new Prisma.Decimal(0)
      const qtyAfter = qtyBefore.plus(line.quantity)
      await tx.productStock.upsert({
        where: { productId_branchId: { productId: line.productId, branchId } },
        create: { productId: line.productId, branchId, qty: qtyAfter },
        update: { qty: qtyAfter },
      })
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          branchId,
          type: "VOID_RESTOCK",
          quantity: line.quantity,
          qtyBefore,
          qtyAfter,
          userId,
          saleId,
          reason: `Anulación de venta ${sale.code}: ${reason}`,
        },
      })
    }

    // Revertir efecto en caja (solo si esa sesion sigue abierta -- no se
    // toca una caja ya cerrada y reconciliada) o en el saldo del cliente.
    const cashPayment = sale.payments.find((p: any) => p.method === "CASH")
    if (cashPayment && sale.registerSessionId) {
      const regSession = await tx.cashRegisterSession.findUnique({ where: { id: sale.registerSessionId } })
      if (regSession?.status === "OPEN") {
        await tx.cashRegisterSession.update({
          where: { id: regSession.id },
          data: { expectedCash: { decrement: cashPayment.amount } },
        })
        await tx.cashMovement.create({
          data: {
            sessionId: regSession.id,
            type: "REFUND_CASH_OUT",
            amount: cashPayment.amount,
            note: `Anulación de venta ${sale.code}`,
            userId,
          },
        })
      }
    }

    if (sale.paymentStatus === "PENDING" && sale.customerId) {
      // Era a credito: se le perdona la deuda que habia quedado por esta venta.
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { storeCreditBalance: { increment: sale.total } },
      })
    }

    const updated = await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "VOIDED",
        voidedById: userId,
        voidedAt: new Date(),
        voidReason: reason,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "SALE_VOID",
        userId,
        entityType: "Sale",
        entityId: saleId,
        description: `Venta ${sale.code} anulada: ${reason}`,
      },
    })

    return { ...updated, total: updated.total.toString(), subtotal: updated.subtotal.toString() }
  })
}

// Devolucion parcial o total de mercaderia ya entregada: repone stock solo
// de las lineas/cantidades indicadas y da un reembolso (no necesariamente
// del mismo metodo con el que se pago).
export async function createReturn(data: {
  saleId: string
  lines: Array<{ saleLineId: string; quantity: string }>
  reason?: string
  refundMethod: "CASH" | "CARD" | "QR" | "TRANSFER"
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autenticado")
  const userId = (session.user as any).id as string

  if (data.lines.length === 0) throw new Error("Selecciona al menos un producto a devolver")

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: data.saleId },
      include: { lines: true },
    })
    if (!sale) throw new Error("Venta no encontrada")
    if (!["COMPLETED", "PARTIALLY_RETURNED"].includes(sale.status)) {
      throw new Error(`No se puede devolver: la venta está en estado ${sale.status}`)
    }

    const returnedSoFar = await getReturnedQuantities(data.saleId, tx)
    const saleLineById = new Map(sale.lines.map((l) => [l.id, l]))

    let totalRefunded = new Decimal(0)
    const lineData: Array<{
      saleLineId: string
      productId: string
      quantity: Decimal
      refundAmount: Decimal
    }> = []

    for (const requested of data.lines) {
      const saleLine = saleLineById.get(requested.saleLineId)
      if (!saleLine) throw new Error("Línea de venta no encontrada en esta venta")

      const qty = new Decimal(requested.quantity)
      if (qty.lte(0)) continue

      const alreadyReturned = returnedSoFar.get(saleLine.id) || new Decimal(0)
      const maxReturnable = new Decimal(saleLine.quantity).minus(alreadyReturned)
      if (qty.gt(maxReturnable)) {
        throw new Error(
          `${saleLine.productName}: solo se puede devolver hasta ${maxReturnable.toString()} (ya devuelto: ${alreadyReturned.toString()})`
        )
      }

      const refundAmount = qty.times(new Decimal(saleLine.unitPrice))
      totalRefunded = totalRefunded.plus(refundAmount)
      lineData.push({ saleLineId: saleLine.id, productId: saleLine.productId, quantity: qty, refundAmount })
    }

    if (lineData.length === 0) throw new Error("No hay cantidades válidas para devolver")

    const code = `DEV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    const ret = await tx.return.create({
      data: {
        code,
        saleId: data.saleId,
        processedById: userId,
        reason: data.reason || null,
        totalRefunded: new Prisma.Decimal(totalRefunded.toString()),
        refundMethod: data.refundMethod,
        lines: {
          create: lineData.map((l) => ({
            saleLineId: l.saleLineId,
            productId: l.productId,
            quantity: new Prisma.Decimal(l.quantity.toString()),
            refundAmount: new Prisma.Decimal(l.refundAmount.toString()),
          })),
        },
      },
      include: { lines: true },
    })

    const branchId = sale.branchId
    for (const l of lineData) {
      const productStock = await tx.productStock.findUnique({
        where: { productId_branchId: { productId: l.productId, branchId } },
      })
      const qtyBefore = productStock?.qty ?? new Prisma.Decimal(0)
      const qtyAfter = qtyBefore.plus(l.quantity.toString())
      await tx.productStock.upsert({
        where: { productId_branchId: { productId: l.productId, branchId } },
        create: { productId: l.productId, branchId, qty: qtyAfter },
        update: { qty: qtyAfter },
      })
      await tx.stockMovement.create({
        data: {
          productId: l.productId,
          branchId,
          type: "RETURN_IN",
          quantity: new Prisma.Decimal(l.quantity.toString()),
          qtyBefore,
          qtyAfter,
          userId,
          saleId: data.saleId,
          returnId: ret.id,
          reason: data.reason || `Devolución ${code}`,
        },
      })
    }

    if (data.refundMethod === "CASH") {
      const openSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN", branchId },
        orderBy: { openedAt: "desc" },
      })
      if (openSession) {
        await tx.cashRegisterSession.update({
          where: { id: openSession.id },
          data: { expectedCash: { decrement: new Prisma.Decimal(totalRefunded.toString()) } },
        })
        await tx.cashMovement.create({
          data: {
            sessionId: openSession.id,
            type: "REFUND_CASH_OUT",
            amount: new Prisma.Decimal(totalRefunded.toString()),
            note: `Devolución ${code} (venta ${sale.code})`,
            userId,
          },
        })
      }
    }

    // Decidir si la venta queda totalmente o parcialmente devuelta.
    const allReturned = await getReturnedQuantities(data.saleId, tx)
    const fullyReturned = sale.lines.every((sl) => {
      const returned = allReturned.get(sl.id) || new Decimal(0)
      return returned.gte(new Decimal(sl.quantity))
    })

    await tx.sale.update({
      where: { id: data.saleId },
      data: { status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED" },
    })

    await tx.auditLog.create({
      data: {
        action: "RETURN_PROCESSED",
        userId,
        entityType: "Sale",
        entityId: data.saleId,
        description: `Devolución ${code} de venta ${sale.code}${data.reason ? `: ${data.reason}` : ""} (${totalRefunded.toFixed(2)})`,
      },
    })

    return serializeReturn(ret)
  })
}
