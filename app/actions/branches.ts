"use server"

import { prisma } from "@/lib/prisma"
import { requireRoleAction } from "@/lib/authz"

export async function getBranches() {
  return prisma.branch.findMany({ orderBy: { name: "asc" } })
}

export async function createBranch(data: { name: string; address?: string }) {
  await requireRoleAction(["ADMIN"])
  if (!data.name.trim()) throw new Error("El nombre de la sucursal es obligatorio")
  return prisma.branch.create({
    data: { name: data.name.trim(), address: data.address?.trim() || null },
  })
}

export async function updateBranch(
  id: string,
  data: { name?: string; address?: string; active?: boolean }
) {
  await requireRoleAction(["ADMIN"])
  return prisma.branch.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })
}

// Desactivar (no se borra: hay ventas/stock/historial ligados a la sucursal).
export async function deactivateBranch(id: string) {
  await requireRoleAction(["ADMIN"])

  const openSession = await prisma.cashRegisterSession.findFirst({
    where: { branchId: id, status: "OPEN" },
  })
  if (openSession) {
    throw new Error("No se puede desactivar: esta sucursal tiene una caja abierta")
  }

  return prisma.branch.update({ where: { id }, data: { active: false } })
}
