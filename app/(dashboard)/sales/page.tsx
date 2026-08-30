import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { formatDateTime } from "@/lib/dates"
import Link from "next/link"
import Decimal from "decimal.js"

export default async function SalesPage() {
  const currency = await getCurrencySymbol()
  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED" },
    include: {
      lines: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const totalSales = sales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const totalCount = sales.length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Historial de Ventas</h1>
            <p className="text-muted">Últimas {totalCount} ventas completadas</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total Ventas</p>
            <p className="text-3xl font-bold text-text">{currency}{totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Cantidad de Ventas</p>
            <p className="text-3xl font-bold text-text">{totalCount}</p>
          </div>
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Ticket Promedio</p>
            <p className="text-3xl font-bold text-text">
              {currency}{totalCount > 0 ? totalSales.div(totalCount).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>

        {/* Tabla de ventas */}
        <div className="bg-surface backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10 border-b-2 border-border">
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Código</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Cliente</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Artículos</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Monto</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Método</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, idx) => (
                  <tr
                    key={sale.id}
                    className={`border-b border-border hover:bg-white/5 transition ${
                      idx % 2 === 0 ? "bg-surface backdrop-blur-md" : "bg-white/5"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-text">{sale.code}</td>
                    <td className="px-6 py-4 text-sm text-text">
                      {sale.customerName || "Cliente Anónimo"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-text font-medium">
                      {sale.lines.length}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-text">
                      {currency}{new Decimal(sale.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text">
                      {sale.payments[0]?.method === "CASH"
                        ? "💵 Efectivo"
                        : sale.payments[0]?.method === "CARD"
                        ? "💳 Tarjeta"
                        : sale.payments[0]?.method === "QR"
                        ? "📱 QR"
                        : sale.payments[0]?.method === "TRANSFER"
                        ? "🏦 Transferencia"
                        : "🧾 Crédito"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/sales/${sale.id}/receipt`}
                        className="text-primary-2 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
