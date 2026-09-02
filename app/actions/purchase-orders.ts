"use server"

import { prisma } from "@/lib/prisma"
import { purchaseOrderSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { getActiveBranchId } from "@/lib/branch-context"
import { notifyPurchaseOrderReceived } from "@/lib/notifications/events"

let poCounter = 0

async function generatePOCode(): Promise<string> {
  const count = await prisma.purchaseOrder.count()
  return `PO-${String(count + 1).padStart(6, "0")}`
}

// createPurchaseOrder se llama desde una pagina "use client": el valor que
// devuelve una Server Action se serializa de vuelta al navegador, y Decimal
// no es un tipo serializable por React Server Components.
function serializePO(po: any) {
  return {
    ...po,
    totalAmount: po.totalAmount?.toString(),
    lines: (po.lines || []).map((l: any) => ({
      ...l,
      quantity: l.quantity?.toString(),
      unitCost: l.unitCost?.toString(),
    })),
  }
}

export async function createPurchaseOrder(data: any) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const user = session.user as any
  const validated = purchaseOrderSchema.parse(data)
  const branchId = await getActiveBranchId()

  const code = await generatePOCode()

  const totalAmount = validated.lines.reduce(
    (sum: Decimal, line: any) => sum.plus(new Decimal(line.quantity).times(line.unitCost)),
    new Decimal(0)
  )

  const po = await prisma.purchaseOrder.create({
    data: {
      code,
      supplierId: validated.supplierId,
      branchId,
      createdById: user.id,
      notes: validated.notes,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      totalAmount: new Prisma.Decimal(totalAmount.toString()),
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

  return serializePO(po)
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

  const branchId = po.branchId

  // Traer el stock actual (en la sucursal de la orden) de cada producto
  const currentStocks = await Promise.all(
    po.lines.map((line) =>
      prisma.productStock.findUnique({
        where: { productId_branchId: { productId: line.productId, branchId } },
      })
    )
  )

  const productUpdates = po.lines.map((line, idx) => {
    const qtyBefore = currentStocks[idx]?.qty ?? new Prisma.Decimal(0)
    const newQty = qtyBefore.plus(line.quantity)

    return prisma.productStock.upsert({
      where: { productId_branchId: { productId: line.productId, branchId } },
      create: { productId: line.productId, branchId, qty: newQty },
      update: { qty: newQty },
    })
  })

  const costUpdates = po.lines.map((line) =>
    prisma.product.update({
      where: { id: line.productId },
      data: { costPrice: line.unitCost },
    })
  )

  const movements = po.lines.map((line, idx) => {
    const qtyBefore = currentStocks[idx]?.qty ?? new Prisma.Decimal(0)
    const newQty = qtyBefore.plus(line.quantity)

    return prisma.stockMovement.create({
      data: {
        productId: line.productId,
        branchId,
        type: "PURCHASE_IN",
        quantity: line.quantity,
        qtyBefore,
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

  await prisma.$transaction([...productUpdates, ...costUpdates, poUpdate, ...movements] as any)

  const supplier = await prisma.supplier.findUnique({ where: { id: po.supplierId } })
  const totalUnits = po.lines.reduce((sum, l) => sum.plus(l.quantity.toString()), new Decimal(0))
  notifyPurchaseOrderReceived({
    purchaseOrderId: po.id,
    supplierName: supplier?.name || "?",
    totalUnits: totalUnits.toString(),
  })

  return { success: true }
}

export async function getPurchaseOrders() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  const branchId = role === "ADMIN" ? undefined : await getActiveBranchId()

  return prisma.purchaseOrder.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      supplier: true,
      createdBy: true,
      branch: true,
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
      branch: true,
      lines: { include: { product: true } },
    },
  })
}

// Abono a una orden de compra puntual. Recalcula el estado de pago de la
// orden (PENDING/PARTIAL/PAID) segun cuanto se le haya abonado en total.
// Si es en efectivo y hay caja abierta, sale de la caja (PAID_OUT) igual
// que un retiro.
export async function registerSupplierPayment(data: {
  purchaseOrderId: string
  amount: string
  method: "CASH" | "CARD" | "QR" | "TRANSFER"
  note?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const amount = new Decimal(data.amount)
  if (amount.lte(0)) throw new Error("El monto debe ser mayor a cero")

  const userId = (session.user as any).id as string

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { payments: true },
    })
    if (!po) throw new Error("Orden de compra no encontrada")

    const alreadyPaid = po.payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0)
    )
    const totalAmount = new Decimal(po.totalAmount)
    const newPaid = alreadyPaid.plus(amount)

    if (newPaid.gt(totalAmount)) {
      throw new Error(
        `El abono supera lo que falta pagar (faltan ${totalAmount.minus(alreadyPaid).toFixed(2)})`
      )
    }

    const payment = await tx.supplierPayment.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        amount: new Prisma.Decimal(amount.toString()),
        method: data.method,
        note: data.note || null,
        userId,
      },
    })

    await tx.purchaseOrder.update({
      where: { id: data.purchaseOrderId },
      data: {
        paymentStatus: newPaid.gte(totalAmount) ? "PAID" : "PARTIAL",
      },
    })

    if (data.method === "CASH") {
      const openSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN", branchId: po.branchId },
        orderBy: { openedAt: "desc" },
      })
      if (openSession) {
        await tx.cashRegisterSession.update({
          where: { id: openSession.id },
          data: { expectedCash: { decrement: new Prisma.Decimal(amount.toString()) } },
        })
        await tx.cashMovement.create({
          data: {
            sessionId: openSession.id,
            type: "PAID_OUT",
            amount: new Prisma.Decimal(amount.toString()),
            note: `Pago a proveedor (${po.code})${data.note ? `: ${data.note}` : ""}`,
            userId,
          },
        })
      }
    }

    return { ...payment, amount: payment.amount.toString() }
  })
}
