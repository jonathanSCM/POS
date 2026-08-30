"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registerCustomerPayment } from "@/app/actions/customers"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

export function RegisterPaymentForm({ customerId }: { customerId: string }) {
  const router = useRouter()
  const currency = useCurrencySymbol()
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"CASH" | "CARD" | "QR" | "TRANSFER">("CASH")
  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSaving(true)
    try {
      await registerCustomerPayment({ customerId, amount, method, note: note.trim() || undefined })
      setAmount("")
      setNote("")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al registrar el abono")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold text-text">Registrar Abono</h2>
      {error && (
        <div className="text-sm text-danger bg-red-100 border border-red-300 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Monto ({currency})</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-4 py-2 text-text placeholder-muted"
          placeholder="0.00"
          disabled={isSaving}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Método</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className="w-full px-4 py-2 text-text"
          disabled={isSaving}
        >
          <option value="CASH">💵 Efectivo</option>
          <option value="CARD">💳 Tarjeta</option>
          <option value="QR">📱 QR</option>
          <option value="TRANSFER">🏦 Transferencia</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Nota (opcional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-2 text-text placeholder-muted"
          placeholder="Ej: abono parcial"
          disabled={isSaving}
        />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="btn-accent w-full py-2.5 font-bold disabled:opacity-40"
      >
        {isSaving ? "Guardando..." : "Registrar Abono"}
      </button>
    </form>
  )
}
