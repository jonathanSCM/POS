"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registerSupplierPayment } from "@/app/actions/purchase-orders"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

export function RegisterSupplierPaymentForm({
  purchaseOrderId,
  remaining,
  onDone,
}: {
  purchaseOrderId: string
  remaining: string
  onDone?: () => void
}) {
  const router = useRouter()
  const currency = useCurrencySymbol()
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<"CASH" | "CARD" | "QR" | "TRANSFER">("CASH")
  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSaving(true)
    try {
      await registerSupplierPayment({ purchaseOrderId, amount, method, note: note.trim() || undefined })
      router.refresh()
      onDone?.()
    } catch (err: any) {
      setError(err.message || "Error al registrar el pago")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-border rounded-lg p-4 space-y-3 mt-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Monto ({currency})</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-1.5 text-sm text-text"
            disabled={isSaving}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="w-full px-3 py-1.5 text-sm text-text"
            disabled={isSaving}
          >
            <option value="CASH">💵 Efectivo</option>
            <option value="CARD">💳 Tarjeta</option>
            <option value="QR">📱 QR</option>
            <option value="TRANSFER">🏦 Transferencia</option>
          </select>
        </div>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="w-full px-3 py-1.5 text-sm text-text placeholder-muted"
        disabled={isSaving}
      />
      <div className="flex gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost flex-1 py-2 text-sm" disabled={isSaving}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={isSaving} className="btn-accent flex-1 py-2 text-sm font-bold disabled:opacity-40">
          {isSaving ? "Guardando..." : "Registrar Pago"}
        </button>
      </div>
    </form>
  )
}
