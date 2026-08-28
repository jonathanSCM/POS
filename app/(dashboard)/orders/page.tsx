import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Decimal from "decimal.js"

const statusLabels: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "🆕 Nuevo", color: "bg-blue-100 text-blue-800" },
  CONFIRMADO: { label: "✅ Confirmado", color: "bg-green-100 text-green-800" },
  ENTREGADO: { label: "📦 Entregado", color: "bg-white/10 text-text" },
  CANCELADO: { label: "❌ Cancelado", color: "bg-red-100 text-red-800" },
}

export default async function OrdersPage() {
  const orders = await prisma.whatsAppOrder.findMany({
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Pedidos por WhatsApp</h1>
            <p className="text-muted">Panel básico de pedidos digitales</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Código</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Teléfono</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-text">Entrega</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-text">Estado</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-text">Total</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-white/10 text-text" }
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-text">{order.code}</td>
                    <td className="px-6 py-4 text-sm text-text">{order.customerName || "Sin nombre"}</td>
                    <td className="px-6 py-4 text-sm text-muted">{order.customerPhone}</td>
                    <td className="px-6 py-4 text-center text-sm text-text">
                      {order.deliveryType === "ENTREGA" ? "🚚 Entrega" : "🏪 Recoger"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-text">${new Decimal(order.total).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted">
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
