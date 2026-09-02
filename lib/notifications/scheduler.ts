import { prisma } from "@/lib/prisma"
import Decimal from "decimal.js"
import { startOfBoliviaDay, formatDate } from "@/lib/dates"
import { calculateLinesProfit } from "@/lib/profit"
import { renderEmailLayout } from "./email-template"
import { getNotificationSettings } from "./settings"
import {
  notifyDailySummary,
  notifyWeeklySummary,
  notifyReceivableOverdue,
  notifyPayableDue,
} from "./events"

const REVENUE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED"] as const

function boliviaNow(): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { hour, weekday: weekdayMap[weekdayStr] ?? 1 }
}

// Llamado cada hora en punto (ver instrumentation.ts): compara la hora
// actual (Bolivia) contra lo configurado en Configuración y solo corre el
// chequeo real si coincide. runDailyChecks/runWeeklyDigest ya deduplican
// por día internamente, así que da igual si esto se llama de más.
export async function runDailyChecksIfDue() {
  const settings = await prisma.storeSettings.findFirst()
  const { hour } = boliviaNow()
  if (hour !== (settings?.dailyCheckHour ?? 20)) return
  await runDailyChecks()
}

export async function runWeeklyDigestIfDue() {
  const settings = await prisma.storeSettings.findFirst()
  const { hour, weekday } = boliviaNow()
  if (weekday !== 1) return // solo lunes
  if (hour !== (settings?.weeklyCheckHour ?? 8)) return
  await runWeeklyDigest()
}

// Se corre una vez por dia (ver instrumentation.ts): resumen de ventas del
// dia + chequeo de cuentas por cobrar vencidas y por pagar proximas a
// vencer. notifyReceivableOverdue/notifyPayableDue ya deduplican por dia
// internamente, asi que es seguro llamarlas todos los dias sin volver a
// spamear la misma deuda.
export async function runDailyChecks() {
  const now = new Date()
  const todayStart = startOfBoliviaDay(now)

  const salesToday = await prisma.sale.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: todayStart, lte: now } },
    select: { total: true },
  })
  const total = salesToday.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const avgTicket = salesToday.length > 0 ? total.div(salesToday.length) : new Decimal(0)

  await notifyDailySummary({
    total: total.toFixed(2),
    count: salesToday.length,
    avgTicket: avgTicket.toFixed(2),
  })

  // Cuentas por cobrar vencidas: clientes con saldo negativo cuya venta a
  // credito pendiente mas antigua ya paso su creditDueDate.
  const debtors = await prisma.customer.findMany({ where: { storeCreditBalance: { lt: 0 } } })
  for (const customer of debtors) {
    const oldestPending = await prisma.sale.findFirst({
      where: { customerId: customer.id, paymentStatus: "PENDING", creditDueDate: { not: null } },
      orderBy: { createdAt: "asc" },
    })
    if (!oldestPending?.creditDueDate) continue
    const daysOverdue = Math.floor((now.getTime() - oldestPending.creditDueDate.getTime()) / 86400000)
    if (daysOverdue <= 0) continue

    await notifyReceivableOverdue({
      customerId: customer.id,
      customerName: customer.name,
      amount: new Decimal(customer.storeCreditBalance).abs().toFixed(2),
      daysOverdue,
    })
  }

  // Cuentas por pagar proximas a vencer: ordenes recibidas, no pagadas del
  // todo, con vencimiento dentro de los proximos 3 dias.
  const soon = new Date(now.getTime() + 3 * 86400000)
  const duePOs = await prisma.purchaseOrder.findMany({
    where: {
      status: "RECEIVED",
      paymentStatus: { not: "PAID" },
      dueDate: { not: null, lte: soon },
    },
    include: { supplier: true, payments: true },
  })
  for (const po of duePOs) {
    const paid = po.payments.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0))
    const remaining = new Decimal(po.totalAmount).minus(paid)
    if (remaining.lte(0)) continue

    await notifyPayableDue({
      purchaseOrderId: po.id,
      supplierName: po.supplier.name,
      when: formatDate(po.dueDate!),
      amount: remaining.toFixed(2),
    })
  }
}

// Resumen semanal (email, ver notifyWeeklySummary) -- ventas, utilidad,
// productos mas vendidos y stock critico de los ultimos 7 dias.
export async function runWeeklyDigest() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const sales = await prisma.sale.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: weekAgo, lte: now } },
    include: { lines: true },
  })
  const total = sales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))

  const soldProductIds = [...new Set(sales.flatMap((s) => s.lines.map((l) => l.productId)))]
  const costByProductId = new Map(
    (
      await prisma.product.findMany({ where: { id: { in: soldProductIds } }, select: { id: true, costPrice: true } })
    ).map((p) => [p.id, new Decimal(p.costPrice)])
  )
  const profit = calculateLinesProfit(sales.flatMap((s) => s.lines), costByProductId)

  const topProducts = await prisma.saleLine.groupBy({
    by: ["productName"],
    where: { sale: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: weekAgo, lte: now } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  })

  const lowStockCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM products p
    WHERE p.active = true
    AND COALESCE((SELECT SUM(qty) FROM product_stocks ps WHERE ps."productId" = p.id), 0) <= p."minStockAlert"
  `

  const { storeName, currencySymbol } = await getNotificationSettings()

  const topProductsHtml =
    topProducts.length > 0
      ? `
        <p style="margin:20px 0 8px;color:#111827;font-size:13px;font-weight:700;">Más vendidos</p>
        <table style="width:100%;border-collapse:collapse;">
          ${topProducts
            .map(
              (p, idx) => `
              <tr>
                <td style="padding:8px 0;${idx > 0 ? "border-top:1px solid #f0f0f0;" : ""}color:#374151;font-size:13px;">${p.productName}</td>
                <td style="padding:8px 0;${idx > 0 ? "border-top:1px solid #f0f0f0;" : ""}text-align:right;color:#6b7280;font-size:13px;">${(p._sum.quantity || 0).toString()} unid.</td>
              </tr>`
            )
            .join("")}
        </table>`
      : ""

  const html = renderEmailLayout({
    storeName,
    emoji: "📈",
    title: "Resumen semanal",
    mainText: "Así te fue en los últimos 7 días:",
    rows: [
      { label: "Ventas", value: `${currencySymbol}${total.toFixed(2)} (${sales.length} ventas)`, emphasize: true },
      { label: "Utilidad estimada", value: `${currencySymbol}${profit.toFixed(2)}` },
      { label: "Productos con stock crítico", value: String(Number(lowStockCount[0]?.count ?? 0)) },
    ],
    extraHtml: topProductsHtml,
  })

  await notifyWeeklySummary(html)
}
