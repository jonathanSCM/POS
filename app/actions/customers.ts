"use server"

import { prisma } from "@/lib/prisma"
import { customerSchema } from "@/lib/validations"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

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
  }
}
