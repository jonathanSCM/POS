"use server"

import { prisma } from "@/lib/prisma"

export async function searchCustomers(query: string) {
  try {
    if (!query.trim()) return []

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
        ],
      },
      take: 10,
    })

    return customers
  } catch (error) {
    console.error("Error buscando clientes:", error)
    throw error
  }
}

export async function createCustomer(data: {
  name: string
  phone: string
  email?: string
  address?: string
}) {
  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
      },
    })

    return customer
  } catch (error) {
    console.error("Error creando cliente:", error)
    throw error
  }
}

export async function getCustomerById(id: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    })
    return customer
  } catch (error) {
    console.error("Error obteniendo cliente:", error)
    throw error
  }
}
