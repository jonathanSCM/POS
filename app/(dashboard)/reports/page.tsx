import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import Link from "next/link"
import Decimal from "decimal.js"
import { SalesTrendChart, PaymentMethodChart } from "@/components/reports/SalesCharts"
import { calculateLinesProfit, calculateProfitMargin } from "@/lib/profit"
import { startOfBoliviaDay, endOfBoliviaDay, formatShortDate } from "@/lib/dates"

function getDateRange(preset: string | undefined, from: string | undefined, to: string | undefined) {
  const now = new Date()
  if (from || to) {
    return {
      from: from ? startOfBoliviaDay(new Date(from)) : new Date(0),
      to: to ? endOfBoliviaDay(new Date(to)) : now,
    }
  }
  if (preset === "week") {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return { from: start, to: now }
  }
  if (preset === "month") {
    const start = new Date(now)
    start.setMonth(start.getMonth() - 1)
    return { from: start, to: now }
  }
  if (preset === "all") {
    return { from: new Date(0), to: now }
  }
  // default: hoy (medianoche de HOY en hora de Bolivia, no la del servidor)
  return { from: startOfBoliviaDay(now), to: now }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const preset = params.preset || "today"
  const { from, to } = getDateRange(preset, params.from, params.to)
  const currency = await getCurrencySymbol()

  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
    include: { lines: true, payments: true },
  })

  const totalSales = sales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const totalCount = sales.length
  const avgTicket = totalCount > 0 ? totalSales.div(totalCount) : new Decimal(0)

  const invoicedSales = sales.filter((s) => s.isInvoiced)
  const nonInvoicedSales = sales.filter((s) => !s.isInvoiced)
  const invoicedTotal = invoicedSales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const nonInvoicedTotal = nonInvoicedSales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))

  // Ganancia = precio de venta - costo actual del producto, por cada línea
  // vendida en el periodo. Usa el costo de HOY (no el costo histórico al
  // momento de la venta, que no se guarda), así que si los costos cambiaron
  // recientemente el número es una aproximación, no un valor contable exacto.
  const soldProductIds = [...new Set(sales.flatMap((s) => s.lines.map((l) => l.productId)))]
  const costByProductId = new Map(
    (
      await prisma.product.findMany({
        where: { id: { in: soldProductIds } },
        select: { id: true, costPrice: true },
      })
    ).map((p) => [p.id, new Decimal(p.costPrice)])
  )
  const allSoldLines = sales.flatMap((s) => s.lines)
  const totalProfit = calculateLinesProfit(allSoldLines, costByProductId)
  const profitMargin = calculateProfitMargin(totalProfit, totalSales)

  const topProducts = await prisma.saleLine.groupBy({
    by: ["productName"],
    where: { sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } } },
    _sum: { quantity: true, lineTotal: true },
    _count: true,
    orderBy: { _sum: { quantity: "desc" } },
    take: 15,
  })

  const paymentMethods = await prisma.payment.groupBy({
    by: ["method"],
    where: { sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } } },
    _sum: { amount: true },
    _count: true,
  })

  // Ventas por día para el gráfico de tendencia
  const salesByDayMap = new Map<string, number>()
  for (const s of sales) {
    const key = formatShortDate(s.createdAt)
    salesByDayMap.set(key, (salesByDayMap.get(key) || 0) + Number(s.total))
  }
  const salesTrendData = [...salesByDayMap.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => {
      const [da, ma] = a.date.split("/").map(Number)
      const [db, mb] = b.date.split("/").map(Number)
      return ma - mb || da - db
    })

  const paymentMethodChartData = paymentMethods.map((p) => ({
    method: p.method,
    amount: Number(p._sum.amount || 0),
  }))

  const presetLink = (p: string) => `/reports?preset=${p}`
  const exportUrl = `/api/reports/general/export?from=${from.toISOString()}&to=${to.toISOString()}`

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Reportes</h1>
            <p className="text-muted">Análisis de ventas y resultados</p>
          </div>
          <div className="flex gap-2">
            <Link href="/reports/contador" className="px-4 py-2 bg-primary hover:brightness-110 text-white rounded-lg font-medium transition">
              📊 Reporte del Contador
            </Link>
            <Link href="/" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <Link href={presetLink("today")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "today" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Hoy</Link>
          <Link href={presetLink("week")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "week" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Última semana</Link>
          <Link href={presetLink("month")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "month" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Último mes</Link>
          <Link href={presetLink("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "all" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Todo</Link>
          <a href={exportUrl} className="ml-auto px-4 py-2 bg-success hover:brightness-110 text-white rounded-lg text-sm font-medium">
            ⬇️ Exportar a Excel
          </a>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total de Ventas</p>
            <p className="text-3xl font-bold text-text">{currency}{totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Cantidad Ventas</p>
            <p className="text-3xl font-bold text-text">{totalCount}</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Ticket Promedio</p>
            <p className="text-3xl font-bold text-text">{currency}{avgTicket.toFixed(2)}</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Artículos Vendidos</p>
            <p className="text-3xl font-bold text-text">{sales.reduce((sum, s) => sum + s.lines.length, 0)}</p>
          </div>
        </div>

        {/* Ganancia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Ganancia del Periodo</p>
            <p className="text-3xl font-bold text-success">{currency}{totalProfit.toFixed(2)}</p>
            <p className="text-xs text-muted mt-1">Precio de venta − costo actual del producto</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Margen de Ganancia</p>
            <p className="text-3xl font-bold text-success">{profitMargin.toFixed(1)}%</p>
            <p className="text-xs text-muted mt-1">Ganancia sobre el total vendido</p>
          </div>
        </div>

        {/* Con/Sin factura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Ventas con Factura</p>
            <p className="text-2xl font-bold text-text">{currency}{invoicedTotal.toFixed(2)} <span className="text-sm text-muted font-normal">({invoicedSales.length} ventas)</span></p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Ventas sin Factura</p>
            <p className="text-2xl font-bold text-text">{currency}{nonInvoicedTotal.toFixed(2)} <span className="text-sm text-muted font-normal">({nonInvoicedSales.length} ventas)</span></p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-text mb-4">Tendencia de Ventas</h2>
            <SalesTrendChart data={salesTrendData} currency={currency} />
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-text mb-4">Distribución por Método de Pago</h2>
            <PaymentMethodChart data={paymentMethodChartData} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ventas por Producto */}
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-text mb-1">Ventas por Producto</h2>
            <p className="text-xs text-muted mb-6">Qué se está vendiendo más en el periodo, por unidades e ingresos</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-text font-medium">{p.productName}</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text">{p._sum.quantity?.toString() || "0"} <span className="text-xs font-normal text-muted">unid.</span></p>
                    <p className="text-xs text-primary-2">{currency}{new Decimal(p._sum.lineTotal || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-muted text-sm text-center py-6">No hay ventas en este periodo.</p>
              )}
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-text mb-6">Métodos de Pago</h2>
            <div className="space-y-3">
              {paymentMethods.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-text font-medium">
                    {p.method === "CASH" ? "💵 Efectivo" : p.method === "CARD" ? "💳 Tarjeta" : p.method === "QR" ? "📱 QR" : p.method === "TRANSFER" ? "🏦 Transferencia" : "🧾 Crédito"}
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-text">{currency}{new Decimal(p._sum.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted">{p._count} transacciones</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
