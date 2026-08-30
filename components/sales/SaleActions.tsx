"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Decimal from "decimal.js"
import { getSaleForActions } from "@/app/actions/sales"
import { voidSale, createReturn } from "@/app/actions/returns"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

// Esta pantalla vive dentro del recibo (fondo blanco, pensado para
// imprimirse), no dentro del panel de tema oscuro -- por eso usa clases
// claras de Tailwind en vez de las variables del tema (glass, btn-*, etc.),
// que quedarían invisibles sobre blanco.
export function SaleActions({ saleId }: { saleId: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const currency = useCurrencySymbol()
  const role = (session?.user as any)?.role

  const [sale, setSale] = useState<any>(null)
  const [mode, setMode] = useState<"none" | "void" | "return">("none")
  const [voidReason, setVoidReason] = useState("")
  const [returnReason, setReturnReason] = useState("")
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "QR" | "TRANSFER">("CASH")
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    const data = await getSaleForActions(saleId)
    setSale(data)
  }

  useEffect(() => {
    load()
  }, [saleId])

  if (!sale) return null

  const returnedByLine = new Map<string, Decimal>()
  for (const ret of sale.returns || []) {
    for (const l of ret.lines) {
      const prev = returnedByLine.get(l.saleLineId) || new Decimal(0)
      returnedByLine.set(l.saleLineId, prev.plus(new Decimal(l.quantity)))
    }
  }

  const returnableLines = sale.lines
    .map((l: any) => {
      const returned = returnedByLine.get(l.id) || new Decimal(0)
      const max = new Decimal(l.quantity).minus(returned)
      return { ...l, alreadyReturned: returned, maxReturnable: max }
    })
    .filter((l: any) => l.maxReturnable.gt(0))

  const handleVoid = async () => {
    setError("")
    if (!voidReason.trim()) {
      setError("Indica un motivo")
      return
    }
    setIsSaving(true)
    try {
      await voidSale(saleId, voidReason.trim())
      setMode("none")
      setVoidReason("")
      await load()
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al anular la venta")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReturn = async () => {
    setError("")
    const lines = Object.entries(returnQtys)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([saleLineId, quantity]) => ({ saleLineId, quantity }))

    if (lines.length === 0) {
      setError("Indica al menos una cantidad a devolver")
      return
    }

    setIsSaving(true)
    try {
      await createReturn({ saleId, lines, reason: returnReason.trim() || undefined, refundMethod })
      setMode("none")
      setReturnQtys({})
      setReturnReason("")
      await load()
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al procesar la devolución")
    } finally {
      setIsSaving(false)
    }
  }

  if (sale.status === "VOIDED") {
    return (
      <div className="max-w-sm mx-auto mt-4 bg-red-50 border border-red-300 rounded-lg p-4 text-sm text-red-700 print:hidden">
        🚫 Esta venta fue anulada{sale.voidReason ? `: ${sale.voidReason}` : ""}
      </div>
    )
  }

  if (sale.status === "RETURNED") {
    return (
      <div className="max-w-sm mx-auto mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-sm text-yellow-800 print:hidden">
        ↩️ Esta venta fue devuelta en su totalidad
      </div>
    )
  }

  if (!["COMPLETED", "PARTIALLY_RETURNED"].includes(sale.status)) return null

  return (
    <div className="max-w-sm mx-auto mt-4 space-y-3 print:hidden">
      {sale.status === "PARTIALLY_RETURNED" && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
          ↩️ Esta venta tiene una devolución parcial registrada
        </div>
      )}

      {mode === "none" && (
        <div className="flex gap-2">
          {returnableLines.length > 0 && (
            <button
              onClick={() => setMode("return")}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium text-sm transition"
            >
              ↩️ Registrar Devolución
            </button>
          )}
          {sale.status === "COMPLETED" && (role === "ADMIN" || role === "MANAGER") && (
            <button
              onClick={() => setMode("void")}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition"
            >
              🚫 Anular Venta
            </button>
          )}
        </div>
      )}

      {mode === "void" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-sm text-gray-800 font-medium">
            Anula toda la venta: repone el stock completo{sale.paymentStatus === "PAID" ? " y revierte la caja si sigue abierta" : ""}.
          </p>
          <input
            type="text"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Motivo de la anulación *"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button onClick={() => setMode("none")} className="flex-1 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg" disabled={isSaving}>
              Cancelar
            </button>
            <button onClick={handleVoid} disabled={isSaving} className="flex-1 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-40">
              {isSaving ? "Anulando..." : "Confirmar Anulación"}
            </button>
          </div>
        </div>
      )}

      {mode === "return" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-sm text-gray-800 font-medium">Cantidades a devolver:</p>
          {returnableLines.map((l: any) => (
            <div key={l.id} className="flex justify-between items-center gap-3 text-sm">
              <div className="flex-1">
                <p className="text-gray-900">{l.productName}</p>
                <p className="text-xs text-gray-500">
                  Vendido: {l.quantity} {l.alreadyReturned.gt(0) && `• ya devuelto: ${l.alreadyReturned.toString()}`}
                </p>
              </div>
              <input
                type="number"
                min="0"
                max={l.maxReturnable.toString()}
                step="any"
                value={returnQtys[l.id] || ""}
                onChange={(e) => setReturnQtys({ ...returnQtys, [l.id]: e.target.value })}
                placeholder="0"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center text-gray-900"
                disabled={isSaving}
              />
            </div>
          ))}
          <p className="text-sm text-gray-800">
            Total a reembolsar:{" "}
            <span className="font-bold">
              {currency}
              {returnableLines
                .reduce((sum: Decimal, l: any) => {
                  const qty = new Decimal(returnQtys[l.id] || 0)
                  return sum.plus(qty.isNaN() ? new Decimal(0) : qty.times(new Decimal(l.unitPrice)))
                }, new Decimal(0))
                .toFixed(2)}
            </span>
          </p>
          <select
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as any)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900"
            disabled={isSaving}
          >
            <option value="CASH">💵 Reembolso en Efectivo</option>
            <option value="CARD">💳 Reembolso a Tarjeta</option>
            <option value="QR">📱 Reembolso por QR</option>
            <option value="TRANSFER">🏦 Reembolso por Transferencia</option>
          </select>
          <input
            type="text"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button onClick={() => setMode("none")} className="flex-1 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg" disabled={isSaving}>
              Cancelar
            </button>
            <button onClick={handleReturn} disabled={isSaving} className="flex-1 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-40">
              {isSaving ? "Procesando..." : "Confirmar Devolución"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
