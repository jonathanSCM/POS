"use server"

import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/lib/validations"
import { requireRoleAction } from "@/lib/authz"

export async function createCategory(data: any) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  const validated = categorySchema.parse(data)

  try {
    return await prisma.category.create({ data: validated })
  } catch (error: any) {
    if (error?.code === "P2002") throw new Error("Ya existe una categoría con ese nombre")
    throw error
  }
}

export async function updateCategory(id: string, data: any) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  const validated = categorySchema.parse(data)

  try {
    return await prisma.category.update({ where: { id }, data: validated })
  } catch (error: any) {
    if (error?.code === "P2002") throw new Error("Ya existe una categoría con ese nombre")
    throw error
  }
}

export async function deleteCategory(id: string) {
  await requireRoleAction(["ADMIN", "MANAGER"])

  try {
    return await prisma.category.delete({ where: { id } })
  } catch (error: any) {
    if (error?.code === "P2003" || error?.code === "P2014") {
      throw new Error("No se puede eliminar: hay productos asociados a esta categoría")
    }
    throw error
  }
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
}
