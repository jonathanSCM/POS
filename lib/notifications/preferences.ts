import { prisma } from "@/lib/prisma"

// Catálogo de los tipos de notificación que existen, con una etiqueta
// legible para la pantalla de preferencias y qué canal(es) usa cada uno
// (ver lib/notifications/events.ts -- el canal ya viene fijo por tipo,
// esto no permite elegir canal por canal, solo prender/apagar el tipo).
export const NOTIFICATION_TYPES: Array<{ type: string; label: string; channels: string }> = [
  { type: "LOW_STOCK", label: "Stock bajo", channels: "WhatsApp + Email" },
  { type: "STOCK_OUT", label: "Producto agotado", channels: "WhatsApp" },
  { type: "BIG_SALE", label: "Venta grande o inusual", channels: "WhatsApp" },
  { type: "CASH_CLOSED", label: "Cierre de caja", channels: "WhatsApp + Email" },
  { type: "CASH_DISCREPANCY", label: "Diferencia de caja", channels: "WhatsApp" },
  { type: "RECEIVABLE_OVERDUE", label: "Cuenta por cobrar vencida", channels: "WhatsApp + Email" },
  { type: "PAYABLE_DUE", label: "Cuenta por pagar próxima a vencer", channels: "WhatsApp + Email" },
  { type: "PO_RECEIVED", label: "Nueva orden de compra recibida", channels: "WhatsApp" },
  { type: "NEW_WA_ORDER", label: "Pedido nuevo por WhatsApp", channels: "WhatsApp" },
  { type: "ORDER_STATUS", label: "Pedido confirmado / entregado (al cliente)", channels: "WhatsApp" },
  { type: "CREDIT_SALE", label: "Venta a crédito registrada (al cliente)", channels: "WhatsApp" },
  { type: "PAYMENT_RECEIVED", label: "Pago recibido (al cliente)", channels: "WhatsApp" },
  { type: "DAILY_SUMMARY", label: "Resumen diario", channels: "WhatsApp + Email" },
  { type: "WEEKLY_SUMMARY", label: "Resumen semanal", channels: "Email" },
  { type: "SUSPICIOUS_ACTIVITY", label: "Actividad sospechosa (anulación de venta)", channels: "WhatsApp" },
  { type: "BIG_ADJUSTMENT", label: "Cambio fuerte de inventario", channels: "WhatsApp" },
]

export async function isTypeEnabled(type: string): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({ where: { type } })
  // Sin fila = habilitado (default). Solo se guarda fila cuando el admin
  // apaga algo -- asi no hace falta sembrar 16 filas de entrada.
  return pref?.enabled ?? true
}

export async function getAllPreferences(): Promise<Record<string, boolean>> {
  const rows = await prisma.notificationPreference.findMany()
  const disabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.type))
  const result: Record<string, boolean> = {}
  for (const { type } of NOTIFICATION_TYPES) {
    result[type] = !disabled.has(type)
  }
  return result
}

export async function setTypeEnabled(type: string, enabled: boolean) {
  await prisma.notificationPreference.upsert({
    where: { type },
    create: { type, enabled },
    update: { enabled },
  })
}
