import { prisma } from "@/lib/prisma"

export type NotificationAudience = "owner" | "customer"

export interface NotificationTypeInfo {
  type: string
  label: string
  description: string
  channels: string
  icon: string
  audience: NotificationAudience
  category: string
}

export interface NotificationCategory {
  key: string
  label: string
  icon: string
  types: NotificationTypeInfo[]
}

// Catálogo de los tipos de notificación que existen: etiqueta, explicación
// en criollo de para qué sirve, qué canal(es) usa (ver events.ts -- el
// canal ya viene fijo por tipo, acá solo se prende/apaga el tipo entero),
// y si es un aviso para el dueño o algo que le llega directo al cliente.
const CATALOG: NotificationTypeInfo[] = [
  {
    type: "LOW_STOCK",
    label: "Stock bajo",
    description: "Cuando un producto llega o baja del mínimo que configuraste para reponerlo a tiempo.",
    channels: "WhatsApp + Email",
    icon: "📉",
    audience: "owner",
    category: "inventario",
  },
  {
    type: "STOCK_OUT",
    label: "Producto agotado",
    description: "Cuando un producto se queda directamente en 0 unidades en alguna sucursal.",
    channels: "WhatsApp",
    icon: "🚫",
    audience: "owner",
    category: "inventario",
  },
  {
    type: "BIG_ADJUSTMENT",
    label: "Ajuste fuerte de inventario",
    description: "Cuando alguien corrige manualmente una cantidad grande de stock — para detectar errores o mermas.",
    channels: "WhatsApp",
    icon: "⚖️",
    audience: "owner",
    category: "inventario",
  },
  {
    type: "BIG_SALE",
    label: "Venta grande o inusual",
    description: "Cuando una venta supera el monto que definiste como \"fuera de lo común\".",
    channels: "WhatsApp",
    icon: "🎉",
    audience: "owner",
    category: "caja",
  },
  {
    type: "CASH_CLOSED",
    label: "Cierre de caja",
    description: "Resumen del turno cada vez que un cajero cierra caja: total vendido, efectivo y QR.",
    channels: "WhatsApp + Email",
    icon: "🔒",
    audience: "owner",
    category: "caja",
  },
  {
    type: "CASH_DISCREPANCY",
    label: "Diferencia de caja",
    description: "Cuando lo contado al cerrar no coincide con lo que el sistema esperaba encontrar.",
    channels: "WhatsApp",
    icon: "⚠️",
    audience: "owner",
    category: "caja",
  },
  {
    type: "SUSPICIOUS_ACTIVITY",
    label: "Venta anulada",
    description: "Cada vez que alguien anula una venta ya cobrada — para tener control sobre esas operaciones.",
    channels: "WhatsApp",
    icon: "🚨",
    audience: "owner",
    category: "caja",
  },
  {
    type: "RECEIVABLE_OVERDUE",
    label: "Cuenta por cobrar vencida",
    description: "Clientes que te deben y ya pasaron el plazo de fiado que configuraste.",
    channels: "WhatsApp + Email",
    icon: "🔴",
    audience: "owner",
    category: "cuentas",
  },
  {
    type: "PAYABLE_DUE",
    label: "Cuenta por pagar próxima a vencer",
    description: "Facturas de proveedores que están por vencer en los próximos días.",
    channels: "WhatsApp + Email",
    icon: "🟠",
    audience: "owner",
    category: "cuentas",
  },
  {
    type: "PO_RECEIVED",
    label: "Orden de compra recibida",
    description: "Cuando confirmás la llegada de mercadería de un proveedor.",
    channels: "WhatsApp",
    icon: "📥",
    audience: "owner",
    category: "compras",
  },
  {
    type: "NEW_WA_ORDER",
    label: "Pedido nuevo por WhatsApp",
    description: "Un cliente hizo un pedido y está esperando que lo confirmes.",
    channels: "WhatsApp",
    icon: "🆕",
    audience: "owner",
    category: "compras",
  },
  {
    type: "DAILY_SUMMARY",
    label: "Resumen diario",
    description: "Cuánto vendiste hoy, cuántas ventas y el ticket promedio — todos los días a la hora que elijas.",
    channels: "WhatsApp + Email",
    icon: "📊",
    audience: "owner",
    category: "resumenes",
  },
  {
    type: "WEEKLY_SUMMARY",
    label: "Resumen semanal",
    description: "Ventas, utilidad estimada y productos más vendidos de los últimos 7 días.",
    channels: "Email",
    icon: "📈",
    audience: "owner",
    category: "resumenes",
  },
  {
    type: "ORDER_STATUS",
    label: "Pedido confirmado / entregado",
    description: "Le avisa al cliente cuando confirmás o entregás su pedido.",
    channels: "WhatsApp",
    icon: "✅",
    audience: "customer",
    category: "cliente",
  },
  {
    type: "CREDIT_SALE",
    label: "Compra a crédito registrada",
    description: "Le confirma al cliente el monto de su compra a crédito y cuánto le queda pendiente.",
    channels: "WhatsApp",
    icon: "🧾",
    audience: "customer",
    category: "cliente",
  },
  {
    type: "PAYMENT_RECEIVED",
    label: "Pago recibido",
    description: "Le confirma al cliente que su abono se registró y cuánto le queda de saldo.",
    channels: "WhatsApp",
    icon: "💵",
    audience: "customer",
    category: "cliente",
  },
]

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  inventario: { label: "Inventario", icon: "📦" },
  caja: { label: "Caja y ventas", icon: "💰" },
  cuentas: { label: "Cuentas por cobrar y pagar", icon: "🧮" },
  compras: { label: "Compras y pedidos", icon: "🚚" },
  resumenes: { label: "Resúmenes periódicos", icon: "🗓️" },
  cliente: { label: "Avisos automáticos al cliente", icon: "💬" },
}

export const NOTIFICATION_TYPES = CATALOG

export function getGroupedCatalog(): NotificationCategory[] {
  const byCategory = new Map<string, NotificationTypeInfo[]>()
  for (const item of CATALOG) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, [])
    byCategory.get(item.category)!.push(item)
  }
  return Array.from(byCategory.entries()).map(([key, types]) => ({
    key,
    label: CATEGORY_META[key]?.label || key,
    icon: CATEGORY_META[key]?.icon || "🔔",
    types,
  }))
}

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
  for (const { type } of CATALOG) {
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
