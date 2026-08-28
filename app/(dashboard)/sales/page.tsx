import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Decimal from "decimal.js"

export default async function SalesPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Historial de Ventas</h1>
            <p className="text-gray-600">Últimas {totalCount} ventas completadas</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Total Ventas</p>
            <p className="text-3xl font-bold text-black">${totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Cantidad de Ventas</p>
            <p className="text-3xl font-bold text-black">{totalCount}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Ticket Promedio</p>
            <p className="text-3xl font-bold text-black">
              ${totalCount > 0 ? totalSales.div(totalCount).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>

        {/* Tabla de ventas */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Código</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Cliente</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-black">Artículos</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-black">Monto</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Método</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-black">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, idx) => (
                  <tr
                    key={sale.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-black">{sale.code}</td>
                    <td className="px-6 py-4 text-sm text-black">
                      {sale.customerName || "Cliente Anónimo"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-black font-medium">
                      {sale.lines.length}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-black">
                      ${new Decimal(sale.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {sale.payments[0]?.method === "CASH"
                        ? "💵 Efectivo"
                        : sale.payments[0]?.method === "CARD"
                        ? "💳 Tarjeta"
                        : sale.payments[0]?.method === "QR"
                        ? "📱 QR"
                        : "🏦 Transferencia"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/sales/${sale.id}/receipt`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
