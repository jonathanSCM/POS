import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
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
  if (preset === "all") {
    return { from: new Date(0), to: now }
  }
  // default: mes actual
  const start = new Date(now)
  start.setMonth(start.getMonth() - 1)
  return { from: start, to: now }
}

export default async function ContadorReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const preset = params.preset || "month"
  const { from, to } = getDateRange(preset, params.from, params.to)
  const currency = await getCurrencySymbol()

  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", isInvoiced: true, createdAt: { gte: from, lte: to } },
    orderBy: { invoiceNumber: "asc" },
  })

  const total = sales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const presetLink = (p: string) => `/reports/contador?preset=${p}`
  const exportUrl = `/api/reports/contador/export?from=${from.toISOString()}&to=${to.toISOString()}`

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Reporte del Contador</h1>
            <p className="text-muted">Solo ventas registradas con factura</p>
          </div>
          <Link href="/reports" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Reportes
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <Link href={presetLink("week")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "week" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Última semana</Link>
          <Link href={presetLink("month")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "month" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Último mes</Link>
          <Link href={presetLink("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "all" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Todo</Link>
          <a href={exportUrl} className="ml-auto px-4 py-2 bg-success hover:brightness-110 text-white rounded-lg text-sm font-medium">
            ⬇️ Exportar a Excel
          </a>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6 mb-6">
          <p className="text-sm text-muted mb-2">Total Facturado del Periodo</p>
          <p className="text-3xl font-bold text-text">{currency}{total.toFixed(2)} <span className="text-sm text-muted font-normal">({sales.length} facturas)</span></p>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">N° Factura</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Razón Social</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">NIT</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-text">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 text-sm text-muted">{new Date(sale.completedAt || sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-text">{sale.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-text">{sale.customerBusinessName}</td>
                  <td className="px-6 py-4 text-sm text-text">{sale.customerTaxId}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-text">{currency}{new Decimal(sale.total).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">No hay ventas facturadas en este periodo</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
