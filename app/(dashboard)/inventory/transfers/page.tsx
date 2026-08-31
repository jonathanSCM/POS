"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  getStockTransfers,
  sendStockTransfer,
  receiveStockTransfer,
  cancelStockTransfer,
} from "@/app/actions/stock-transfers"
import { formatDateTime } from "@/lib/dates"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "🟡 Pendiente", className: "bg-warning/15 text-warning" },
  IN_TRANSIT: { label: "🚚 En tránsito", className: "bg-primary-2/15 text-primary-2" },
  RECEIVED: { label: "✅ Recibida", className: "bg-success/15 text-success" },
  CANCELLED: { label: "❌ Cancelada", className: "bg-white/10 text-muted" },
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setTransfers(await getStockTransfers())
  }

  async function handleAction(id: string, action: "send" | "receive" | "cancel") {
    setBusyId(id)
    setError("")
    try {
      if (action === "send") await sendStockTransfer(id)
      if (action === "receive") await receiveStockTransfer(id)
      if (action === "cancel") await cancelStockTransfer(id)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Transferencias de Inventario</h1>
            <p className="text-muted">Mover stock de una sucursal a otra</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/transfers/new" className="px-4 py-2 bg-primary hover:brightness-110 text-white rounded-lg font-medium transition">
              + Nueva Transferencia
            </Link>
            <Link href="/inventory" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
              ← Atrás
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-danger px-4 py-3 rounded">{error}</div>
        )}

        <div className="space-y-4">
          {transfers.map((t) => {
            const status = STATUS_LABELS[t.status] || { label: t.status, className: "" }
            return (
              <div key={t.id} className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-sm text-muted">{t.code}</p>
                    <p className="font-semibold text-text">
                      {t.fromBranch.name} → {t.toBranch.name}
                    </p>
                    <p className="text-xs text-muted">
                      Solicitada por {t.requestedBy.name} el {formatDateTime(t.createdAt)}
                    </p>
                    {t.notes && <p className="text-sm text-muted mt-1">{t.notes}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
                </div>

                <div className="text-sm text-muted mb-4">
                  {t.lines.map((l: any) => (
                    <div key={l.id}>
                      {l.productName}: {l.quantity}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {t.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleAction(t.id, "send")}
                        disabled={busyId === t.id}
                        className="px-4 py-2 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
                      >
                        Enviar
                      </button>
                      <button
                        onClick={() => handleAction(t.id, "cancel")}
                        disabled={busyId === t.id}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-danger rounded-lg text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {t.status === "IN_TRANSIT" && (
                    <button
                      onClick={() => handleAction(t.id, "receive")}
                      disabled={busyId === t.id}
                      className="px-4 py-2 bg-success hover:brightness-110 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
                    >
                      Marcar como Recibida
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {transfers.length === 0 && (
            <p className="text-center py-12 text-muted">Todavía no hay transferencias registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
