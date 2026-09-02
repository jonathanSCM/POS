"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getWhatsAppOrders, updateWhatsAppOrderStatus } from "@/app/actions/whatsapp-orders"
import { formatDateTime } from "@/lib/dates"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

const statusLabels: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "🆕 Nuevo", color: "bg-blue-100 text-blue-800" },
  CONFIRMADO: { label: "✅ Confirmado", color: "bg-green-100 text-green-800" },
  ENTREGADO: { label: "📦 Entregado", color: "bg-white/10 text-text" },
  CANCELADO: { label: "❌ Cancelado", color: "bg-red-100 text-red-800" },
}

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  NUEVO: [
    { status: "CONFIRMADO", label: "Confirmar" },
    { status: "CANCELADO", label: "Cancelar" },
  ],
  CONFIRMADO: [
    { status: "ENTREGADO", label: "Marcar entregado" },
    { status: "CANCELADO", label: "Cancelar" },
  ],
}

export default function OrdersPage() {
  const currency = useCurrencySymbol()
  const [orders, setOrders] = useState<any[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setOrders(await getWhatsAppOrders())
  }

  async function handleStatusChange(id: string, status: string) {
    setBusyId(id)
    try {
      await updateWhatsAppOrderStatus(id, status as any)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Pedidos por WhatsApp</h1>
            <p className="text-muted">
              Panel de pedidos digitales — se pueden cargar manualmente mientras el bot de pedidos (Etapa 2) no esté conectado
            </p>
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
                <th className="px-6 py-3 text-center text-sm font-semibold text-text">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-white/10 text-text" }
                const nextActions = NEXT_STATUS[order.status] || []
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
                    <td className="px-6 py-4 text-right text-sm font-bold text-text">{currency}{Number(order.total).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted">{formatDateTime(order.createdAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        {nextActions.map((a) => (
                          <button
                            key={a.status}
                            onClick={() => handleStatusChange(order.id, a.status)}
                            disabled={busyId === order.id}
                            className="px-3 py-1 text-xs font-medium rounded bg-white/15 text-text hover:bg-white/20 transition disabled:opacity-40"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted">
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
