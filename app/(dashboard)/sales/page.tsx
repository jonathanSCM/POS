import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { formatDateTime } from "@/lib/dates"
import { getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"
import Link from "next/link"
import Decimal from "decimal.js"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completada", className: "bg-success/15 text-success" },
  PARTIALLY_RETURNED: { label: "Devolución parcial", className: "bg-warning/15 text-warning" },
  RETURNED: { label: "Devuelta", className: "bg-warning/15 text-warning" },
  VOIDED: { label: "Anulada", className: "bg-danger/15 text-danger" },
}

export default async function SalesPage() {
  const currency = await getCurrencySymbol()
  const branchFilter = await getActiveBranchFilter()
  const showBranchColumn = branchFilter === ALL_BRANCHES
  const sales = await prisma.sale.findMany({
    where: {
      status: { in: ["COMPLETED", "PARTIALLY_RETURNED", "RETURNED", "VOIDED"] },
      ...(branchFilter !== ALL_BRANCHES ? { branchId: branchFilter } : {}),
    },
    include: {
      lines: true,
      payments: true,
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Las anuladas y devueltas totalmente no cuentan como ingreso real.
  const revenueSales = sales.filter((s) => s.status === "COMPLETED" || s.status === "PARTIALLY_RETURNED")
  const totalSales = revenueSales.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const totalCount = revenueSales.length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Historial de Ventas</h1>
            <p className="text-muted">Últimas {sales.length} ventas (incluye anuladas y devueltas)</p>
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
                  {showBranchColumn && <th className="px-6 py-3 text-left text-sm font-bold text-text">Sucursal</th>}
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Cliente</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Artículos</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Monto</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Método</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-text">Estado</th>
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
                    {showBranchColumn && <td className="px-6 py-4 text-sm text-muted">{sale.branch.name}</td>}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[sale.status]?.className || ""}`}>
                        {STATUS_LABELS[sale.status]?.label || sale.status}
                      </span>
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
