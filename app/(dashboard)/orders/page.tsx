import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Decimal from "decimal.js"

const statusLabels: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "🆕 Nuevo", color: "bg-blue-100 text-blue-800" },
  CONFIRMADO: { label: "✅ Confirmado", color: "bg-green-100 text-green-800" },
  ENTREGADO: { label: "📦 Entregado", color: "bg-gray-100 text-gray-800" },
  CANCELADO: { label: "❌ Cancelado", color: "bg-red-100 text-red-800" },
}

export default async function OrdersPage() {
  const orders = await prisma.whatsAppOrder.findMany({
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Pedidos por WhatsApp</h1>
            <p className="text-gray-600">Panel básico de pedidos digitales</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Código</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Teléfono</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-black">Entrega</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-black">Estado</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-black">Total</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" }
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-black">{order.code}</td>
                    <td className="px-6 py-4 text-sm text-black">{order.customerName || "Sin nombre"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.customerPhone}</td>
                    <td className="px-6 py-4 text-center text-sm text-black">
                      {order.deliveryType === "ENTREGA" ? "🚚 Entrega" : "🏪 Recoger"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-black">${new Decimal(order.total).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    Aún no hay pedidos por WhatsApp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
