"use server"

import { prisma } from "@/lib/prisma"
import { customerSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"

function serializeCustomer(customer: any) {
  return {
    ...customer,
    storeCreditBalance: customer.storeCreditBalance?.toString(),
  }
}

export async function searchCustomers(query: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  if (!query.trim()) return []

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { taxId: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
  })

  return customers.map(serializeCustomer)
}

export async function createCustomer(data: unknown) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const validated = customerSchema.parse(data)

  const customer = await prisma.customer.create({
    data: {
      name: validated.name,
      phone: validated.phone,
      taxId: validated.taxId || null,
      email: validated.email || null,
      address: validated.address || null,
    },
  })

  return serializeCustomer(customer)
}

export async function updateCustomer(id: string, data: unknown) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const validated = customerSchema.parse(data)

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: validated.name,
      phone: validated.phone,
      taxId: validated.taxId || null,
      email: validated.email || null,
      address: validated.address || null,
    },
  })

  return serializeCustomer(customer)
}

export async function getCustomers() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sales: true } } },
  })

  return customers.map(serializeCustomer)
}

export async function getCustomerWithHistory(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { status: "COMPLETED" },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!customer) return null

  return {
    ...serializeCustomer(customer),
    sales: customer.sales.map((s) => ({
      ...s,
      subtotal: s.subtotal.toString(),
      total: s.total.toString(),
      lines: s.lines.map((l) => ({
        ...l,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        lineTotal: l.lineTotal.toString(),
      })),
    })),
    payments: customer.payments.map((p) => ({
      ...p,
      amount: p.amount.toString(),
    })),
  }
}

// Abono del cliente a su cuenta corriente. Si es en efectivo y hay una caja
// abierta, tambien se refleja ahi (mismo patron que las ventas en efectivo).
export async function registerCustomerPayment(data: {
  customerId: string
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
    const payment = await tx.customerPayment.create({
      data: {
        customerId: data.customerId,
        amount: new Prisma.Decimal(amount.toString()),
        method: data.method,
        note: data.note || null,
        userId,
      },
    })

    await tx.customer.update({
      where: { id: data.customerId },
      data: { storeCreditBalance: { increment: new Prisma.Decimal(amount.toString()) } },
    })

    if (data.method === "CASH") {
      const openSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
      })
      if (openSession) {
        await tx.cashRegisterSession.update({
          where: { id: openSession.id },
          data: { expectedCash: { increment: new Prisma.Decimal(amount.toString()) } },
        })
        await tx.cashMovement.create({
          data: {
            sessionId: openSession.id,
            type: "PAID_IN",
            amount: new Prisma.Decimal(amount.toString()),
            note: `Abono de cliente${data.note ? `: ${data.note}` : ""}`,
            userId,
          },
        })
      }
    }

    return { ...payment, amount: payment.amount.toString() }
  })
}

// Total que deben todos los clientes juntos (suma de saldos negativos), para
// la tarjeta de "Cuentas por Cobrar".
export async function getAccountsReceivableTotal() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const customers = await prisma.customer.findMany({
    where: { storeCreditBalance: { lt: 0 } },
    select: { storeCreditBalance: true },
  })

  const total = customers.reduce(
    (sum, c) => sum.plus(new Decimal(c.storeCreditBalance).abs()),
    new Decimal(0)
  )

  return { total: total.toString(), customersOwing: customers.length }
}
