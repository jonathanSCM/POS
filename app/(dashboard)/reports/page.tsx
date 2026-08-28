import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Decimal from "decimal.js"

function getDateRange(preset: string | undefined, from: string | undefined, to: string | undefined) {
  const now = new Date()
  if (from || to) {
    return {
      from: from ? new Date(from) : new Date(0),
      to: to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : now,
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
  // default: hoy
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return { from: start, to: now }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const preset = params.preset || "today"
  const { from, to } = getDateRange(preset, params.from, params.to)

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

  const topProducts = await prisma.saleLine.groupBy({
    by: ["productName"],
    where: { sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } } },
    _sum: { quantity: true },
    _count: true,
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  })

  const paymentMethods = await prisma.payment.groupBy({
    by: ["method"],
    where: { sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } } },
    _sum: { amount: true },
    _count: true,
  })

  const presetLink = (p: string) => `/reports?preset=${p}`
  const exportUrl = `/api/reports/general/export?from=${from.toISOString()}&to=${to.toISOString()}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Reportes</h1>
            <p className="text-gray-600">Análisis de ventas y resultados</p>
          </div>
          <div className="flex gap-2">
            <Link href="/reports/contador" className="px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition">
              📊 Reporte del Contador
            </Link>
            <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <Link href={presetLink("today")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "today" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Hoy</Link>
          <Link href={presetLink("week")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "week" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Última semana</Link>
          <Link href={presetLink("month")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "month" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Último mes</Link>
          <Link href={presetLink("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "all" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Todo</Link>
          <a href={exportUrl} className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            ⬇️ Exportar a Excel
          </a>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Total de Ventas</p>
            <p className="text-3xl font-bold text-black">${totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Cantidad Ventas</p>
            <p className="text-3xl font-bold text-black">{totalCount}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Ticket Promedio</p>
            <p className="text-3xl font-bold text-black">${avgTicket.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Artículos Vendidos</p>
            <p className="text-3xl font-bold text-black">{sales.reduce((sum, s) => sum + s.lines.length, 0)}</p>
          </div>
        </div>

        {/* Con/Sin factura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Ventas con Factura</p>
            <p className="text-2xl font-bold text-black">${invoicedTotal.toFixed(2)} <span className="text-sm text-gray-500 font-normal">({invoicedSales.length} ventas)</span></p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Ventas sin Factura</p>
            <p className="text-2xl font-bold text-black">${nonInvoicedTotal.toFixed(2)} <span className="text-sm text-gray-500 font-normal">({nonInvoicedSales.length} ventas)</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Productos */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Productos Más Vendidos</h2>
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-black font-medium">{p.productName}</span>
                  <span className="text-lg font-bold text-black">{p._sum.quantity?.toString() || "0"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Métodos de Pago</h2>
            <div className="space-y-3">
              {paymentMethods.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-black font-medium">
                    {p.method === "CASH" ? "💵 Efectivo" : p.method === "CARD" ? "💳 Tarjeta" : p.method === "QR" ? "📱 QR" : "🏦 Transferencia"}
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-black">${new Decimal(p._sum.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-600">{p._count} transacciones</p>
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
