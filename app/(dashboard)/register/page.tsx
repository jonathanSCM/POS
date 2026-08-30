"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Decimal from "decimal.js"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"
import { formatDateTime } from "@/lib/dates"

interface Session {
  id: string
  status: "OPEN" | "CLOSED"
  openedAt: Date
  closedAt?: Date
  startingCash: string
  expectedCash?: string
  countedCash?: string
  discrepancy?: string
}

export default function RegisterPage() {
  const currency = useCurrencySymbol()
  const [session, setSession] = useState<Session | null>(null)
  const [openingFloat, setOpeningFloat] = useState("")
  const [actualCash, setActualCash] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [manualType, setManualType] = useState<"PAID_IN" | "PAID_OUT">("PAID_IN")
  const [manualAmount, setManualAmount] = useState("")
  const [manualNote, setManualNote] = useState("")
  const [isSavingManual, setIsSavingManual] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = async () => {
    try {
      const response = await fetch("/api/register/current")
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error("Error loading session:", error)
    }
  }

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingFloat: new Decimal(openingFloat).toString() }),
      })

      if (response.ok) {
        setMessage("✅ Sesión abierta correctamente")
        setOpeningFloat("")
        await loadSession()
      } else {
        setMessage("❌ Error al abrir sesión")
      }
    } catch (error) {
      setMessage("❌ Error: " + (error as any).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualCash: new Decimal(actualCash).toString() }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(`✅ Sesión cerrada. Discrepancia: ${currency}${new Decimal(data.discrepancy).toFixed(2)}`)
        setActualCash("")
        await loadSession()
      } else {
        setMessage("❌ Error al cerrar sesión")
      }
    } catch (error) {
      setMessage("❌ Error: " + (error as any).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingManual(true)
    setMessage("")

    try {
      const response = await fetch("/api/register/manual-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: manualType,
          amount: new Decimal(manualAmount || 0).toString(),
          note: manualNote,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Movimiento registrado: ${manualType === "PAID_IN" ? "entrada" : "salida"} de ${currency}${new Decimal(manualAmount).toFixed(2)}`)
        setManualAmount("")
        setManualNote("")
        await loadSession()
      } else {
        setMessage(`❌ ${data.error || "Error al registrar el movimiento"}`)
      }
    } catch (error) {
      setMessage("❌ Error: " + (error as any).message)
    } finally {
      setIsSavingManual(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Caja Registradora</h1>
            <p className="text-muted">Sesión: {session?.status === "OPEN" ? "🟢 ABIERTA" : "🔴 CERRADA"}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/register/sessions"
              className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
            >
              🕒 Historial de Sesiones
            </Link>
            <Link
              href="/register/movements"
              className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
            >
              📜 Movimientos
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-sm font-semibold mb-6 ${
              message.includes("✅")
                ? "bg-success/10 text-success border border-success/30"
                : "bg-danger/10 text-danger border border-danger/30"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Abrir sesión */}
          {!session || session.status === "CLOSED" ? (
            <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-text mb-6">Abrir Sesión</h2>
              <form onSubmit={handleOpenSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Fondo Inicial (Efectivo)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white/5 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary-2"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !openingFloat}
                  className="w-full px-4 py-3 bg-success hover:brightness-110 disabled:opacity-40 text-white rounded-lg font-bold transition"
                >
                  {isLoading ? "Abriendo..." : "Abrir Sesión"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-text mb-6">Cerrar Sesión</h2>
              <form onSubmit={handleCloseSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Efectivo Contado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white/5 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary-2"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !actualCash}
                  className="w-full px-4 py-3 bg-danger hover:brightness-110 disabled:opacity-40 text-white rounded-lg font-bold transition"
                >
                  {isLoading ? "Cerrando..." : "Cerrar Sesión"}
                </button>
              </form>
            </div>
          )}

          {/* Estado de sesión */}
          {session && (
            <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-text mb-6">Estado de Sesión</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted">Hora de Entrada</p>
                  <p className="text-lg font-semibold text-text">{formatDateTime(session.openedAt)}</p>
                </div>
                {session.closedAt && (
                  <div>
                    <p className="text-sm text-muted">Hora de Salida</p>
                    <p className="text-lg font-semibold text-text">{formatDateTime(session.closedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted">Fondo Inicial</p>
                  <p className="text-2xl font-bold text-text">{currency}{new Decimal(session.startingCash).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">
                    Efectivo Esperado {session.status === "OPEN" && "(en vivo)"}
                  </p>
                  <p className="text-2xl font-bold text-text">{currency}{new Decimal(session.expectedCash || 0).toFixed(2)}</p>
                  {session.status === "OPEN" && (
                    <p className="text-xs text-muted mt-1">Fondo inicial + ventas en efectivo del turno</p>
                  )}
                </div>
                {session.status === "CLOSED" && (
                  <>
                    <div>
                      <p className="text-sm text-muted">Efectivo Contado</p>
                      <p className="text-2xl font-bold text-text">{currency}{new Decimal(session.countedCash || 0).toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      new Decimal(session.discrepancy || 0).isZero() ? "bg-success/10" : "bg-warning/10"
                    }`}>
                      <p className="text-sm text-muted">Discrepancia</p>
                      <p className={`text-2xl font-bold ${
                        new Decimal(session.discrepancy || 0).isZero() ? "text-success" : "text-warning"
                      }`}>
                        {currency}{new Decimal(session.discrepancy || 0).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Movimiento manual: retiros, gastos menores en efectivo, o meter plata extra al cajón */}
        {session?.status === "OPEN" && (
          <div className="mt-8 bg-surface backdrop-blur-md border border-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-text mb-2">Registrar Movimiento Manual</h2>
            <p className="text-sm text-muted mb-6">
              Para dinero que entra o sale de la caja sin ser una venta, un abono de cliente ni un pago a proveedor — ej. un retiro, un gasto menor pagado en efectivo.
            </p>
            <form onSubmit={handleManualMovement} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Tipo</label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as "PAID_IN" | "PAID_OUT")}
                  className="w-full px-4 py-3"
                  disabled={isSavingManual}
                >
                  <option value="PAID_IN">➕ Entrada</option>
                  <option value="PAID_OUT">➖ Salida</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Monto</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-3"
                  disabled={isSavingManual}
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-muted mb-2">Motivo</label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Ej: retiro para depósito"
                  required
                  className="w-full px-4 py-3"
                  disabled={isSavingManual}
                />
              </div>
              <button
                type="submit"
                disabled={isSavingManual || !manualAmount || !manualNote.trim()}
                className={`px-4 py-3 rounded-lg font-bold transition disabled:opacity-40 text-white ${
                  manualType === "PAID_IN" ? "bg-success hover:brightness-110" : "bg-danger hover:brightness-110"
                }`}
              >
                {isSavingManual ? "Guardando..." : "Registrar"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
