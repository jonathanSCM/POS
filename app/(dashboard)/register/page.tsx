"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Decimal from "decimal.js"

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
  const [session, setSession] = useState<Session | null>(null)
  const [openingFloat, setOpeningFloat] = useState("")
  const [actualCash, setActualCash] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

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
        setMessage(`✅ Sesión cerrada. Discrepancia: $${new Decimal(data.discrepancy).toFixed(2)}`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Caja Registradora</h1>
            <p className="text-gray-600">Sesión: {session?.status === "OPEN" ? "🟢 ABIERTA" : "🔴 CERRADA"}</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-sm font-semibold mb-6 ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Abrir sesión */}
          {!session || session.status === "CLOSED" ? (
            <div className="bg-white border border-gray-300 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Abrir Sesión</h2>
              <form onSubmit={handleOpenSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fondo Inicial (Efectivo)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !openingFloat}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
                >
                  {isLoading ? "Abriendo..." : "Abrir Sesión"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Cerrar Sesión</h2>
              <form onSubmit={handleCloseSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Efectivo Contado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !actualCash}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
                >
                  {isLoading ? "Cerrando..." : "Cerrar Sesión"}
                </button>
              </form>
            </div>
          )}

          {/* Estado de sesión */}
          {session && (
            <div className="bg-white border border-gray-300 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Estado de Sesión</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Fondo Inicial</p>
                  <p className="text-2xl font-bold text-black">${new Decimal(session.startingCash).toFixed(2)}</p>
                </div>
                {session.status === "CLOSED" && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Efectivo Esperado</p>
                      <p className="text-2xl font-bold text-black">${new Decimal(session.expectedCash || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Efectivo Contado</p>
                      <p className="text-2xl font-bold text-black">${new Decimal(session.countedCash || 0).toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      new Decimal(session.discrepancy || 0).isZero() ? "bg-green-50" : "bg-yellow-50"
                    }`}>
                      <p className="text-sm text-gray-600">Discrepancia</p>
                      <p className={`text-2xl font-bold ${
                        new Decimal(session.discrepancy || 0).isZero() ? "text-green-700" : "text-yellow-700"
                      }`}>
                        ${new Decimal(session.discrepancy || 0).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
