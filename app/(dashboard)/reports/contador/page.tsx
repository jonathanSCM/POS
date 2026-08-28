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

  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", isInvoiced: true, createdAt: { gte: from, lte: to } },
    orderBy: { invoiceNumber: "asc" },
  })

  const total = sales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const presetLink = (p: string) => `/reports/contador?preset=${p}`
  const exportUrl = `/api/reports/contador/export?from=${from.toISOString()}&to=${to.toISOString()}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Reporte del Contador</h1>
            <p className="text-gray-600">Solo ventas registradas con factura</p>
          </div>
          <Link href="/reports" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Reportes
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <Link href={presetLink("week")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "week" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Última semana</Link>
          <Link href={presetLink("month")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "month" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Último mes</Link>
          <Link href={presetLink("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "all" ? "bg-black text-white" : "bg-white border border-gray-300 text-black"}`}>Todo</Link>
          <a href={exportUrl} className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            ⬇️ Exportar a Excel
          </a>
        </div>

        <div className="bg-white border border-gray-300 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">Total Facturado del Periodo</p>
          <p className="text-3xl font-bold text-black">${total.toFixed(2)} <span className="text-sm text-gray-500 font-normal">({sales.length} facturas)</span></p>
        </div>

        <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">N° Factura</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Razón Social</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">NIT</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-black">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.completedAt || sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-black">{sale.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-black">{sale.customerBusinessName}</td>
                  <td className="px-6 py-4 text-sm text-black">{sale.customerTaxId}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-black">${new Decimal(sale.total).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No hay ventas facturadas en este periodo</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
