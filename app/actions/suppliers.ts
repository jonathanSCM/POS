"use server"

import { prisma } from "@/lib/prisma"
import { supplierSchema } from "@/lib/validations"
import { requireRoleAction } from "@/lib/authz"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Decimal from "decimal.js"

export async function createSupplier(data: any) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  const validated = supplierSchema.parse(data)

  return prisma.supplier.create({
    data: validated,
  })
}

export async function updateSupplier(id: string, data: any) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  const validated = supplierSchema.parse(data)

  return prisma.supplier.update({
    where: { id },
    data: validated,
  })
}

export async function deleteSupplier(id: string) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  try {
    return await prisma.supplier.delete({ where: { id } })
  } catch (error: any) {
    if (error?.code === "P2003" || error?.code === "P2014") {
      throw new Error("No se puede eliminar: hay compras u otros registros asociados a este proveedor")
    }
    throw error
  }
}

export async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      purchaseOrders: {
        where: { status: "RECEIVED", paymentStatus: { not: "PAID" } },
        include: { payments: true },
      },
    },
  })

  return suppliers.map((s) => {
    const owed = s.purchaseOrders.reduce((sum, po) => {
      const paid = po.payments.reduce((pSum, p) => pSum.plus(new Decimal(p.amount)), new Decimal(0))
      return sum.plus(new Decimal(po.totalAmount).minus(paid))
    }, new Decimal(0))
    const { purchaseOrders, ...rest } = s
    return { ...rest, owed: owed.toString() }
  })
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
  })
}

export async function getSupplierWithPurchaseOrders(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        include: {
          payments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!supplier) return null

  return {
    ...supplier,
    purchaseOrders: supplier.purchaseOrders.map((po) => {
      const paid = po.payments.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0))
      return {
        ...po,
        totalAmount: po.totalAmount.toString(),
        paidSoFar: paid.toString(),
        remaining: new Decimal(po.totalAmount).minus(paid).toString(),
        payments: po.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
      }
    }),
  }
}

// Total que se le debe a todos los proveedores juntos, para la tarjeta de
// "Cuentas por Pagar".
export async function getAccountsPayableTotal() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const orders = await prisma.purchaseOrder.findMany({
    where: { status: "RECEIVED", paymentStatus: { not: "PAID" } },
    include: { payments: true },
  })

  const total = orders.reduce((sum, po) => {
    const paid = po.payments.reduce((pSum, p) => pSum.plus(new Decimal(p.amount)), new Decimal(0))
    return sum.plus(new Decimal(po.totalAmount).minus(paid))
  }, new Decimal(0))

  return { total: total.toString(), ordersOwing: orders.length }
}
