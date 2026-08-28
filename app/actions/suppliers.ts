"use server"

import { prisma } from "@/lib/prisma"
import { supplierSchema } from "@/lib/validations"
import { requireRoleAction } from "@/lib/authz"

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
  return prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
  })
}
