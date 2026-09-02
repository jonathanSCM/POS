"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { notifyNewWhatsAppOrder, notifyOrderStatusChange } from "@/lib/notifications/events"

// Alta manual de un pedido: util mientras no existe el bot conversacional
// (Etapa 2) -- si un pedido llega por telefono o en persona, se puede
// cargar aca igual y usar el mismo flujo de estados/notificaciones. Cuando
// el bot este listo, solo tiene que llamar a esta misma funcion en vez de
// loguear el payload del webhook.
export async function createWhatsAppOrder(data: {
  customerPhone: string
  customerName?: string
  deliveryType: "RECOGER" | "ENTREGA"
  lines: Array<{ productId: string; productName: string; quantity: number; unitPrice: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  if (data.lines.length === 0) throw new Error("El pedido necesita al menos un producto")

  const code = `WA-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  const total = data.lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.quantity).times(l.unitPrice)),
    new Decimal(0)
  )

  const order = await prisma.whatsAppOrder.create({
    data: {
      code,
      customerPhone: data.customerPhone,
      customerName: data.customerName || null,
      deliveryType: data.deliveryType,
      total: new Prisma.Decimal(total.toString()),
      lines: {
        create: data.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: new Prisma.Decimal(l.quantity),
          unitPrice: new Prisma.Decimal(l.unitPrice),
          lineTotal: new Prisma.Decimal(new Decimal(l.quantity).times(l.unitPrice).toString()),
        })),
      },
    },
    include: { lines: true },
  })

  notifyNewWhatsAppOrder({ orderId: order.id, code: order.code, total: total.toFixed(2) })

  return { ...order, total: order.total.toString() }
}

export async function updateWhatsAppOrderStatus(
  id: string,
  status: "NUEVO" | "CONFIRMADO" | "ENTREGADO" | "CANCELADO"
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const order = await prisma.whatsAppOrder.update({ where: { id }, data: { status } })

  notifyOrderStatusChange({
    orderId: order.id,
    code: order.code,
    status,
    customerPhone: order.customerPhone,
  })

  return { ...order, total: order.total.toString() }
}

export async function getWhatsAppOrders() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autorizado")

  const orders = await prisma.whatsAppOrder.findMany({
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return orders.map((o) => ({ ...o, total: o.total.toString() }))
}
