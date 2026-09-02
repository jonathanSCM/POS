"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface NotifType {
  type: string
  label: string
  channels: string
}

export default function NotificationPreferencesPage() {
  const [types, setTypes] = useState<NotifType[]>([])
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const response = await fetch("/api/notification-preferences")
    if (response.ok) {
      const data = await response.json()
      setTypes(data.types)
      setPreferences(data.preferences)
    }
  }

  const toggle = (type: string) => {
    setPreferences({ ...preferences, [type]: !preferences[type] })
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage("")
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })
      setMessage(response.ok ? "✅ Preferencias guardadas" : "❌ Error al guardar")
    } catch (error) {
      setMessage("❌ Error: " + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Preferencias de Notificaciones</h1>
            <p className="text-muted">Elegí qué avisos querés recibir. El canal (WhatsApp/email) de cada uno ya viene fijo — acá solo se prende o apaga.</p>
          </div>
          <Link href="/settings" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Configuración
          </Link>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-semibold mb-6 ${
            message.includes("✅") ? "bg-success/10 text-success border border-success/30" : "bg-danger/10 text-danger border border-danger/30"
          }`}>
            {message}
          </div>
        )}

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
          <div className="space-y-1">
            {types.map((t) => (
              <label
                key={t.type}
                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-text">{t.label}</p>
                  <p className="text-xs text-muted">{t.channels}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences[t.type] ?? true}
                  onChange={() => toggle(t.type)}
                  className="w-5 h-5"
                />
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full mt-6 px-4 py-3 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg font-bold transition"
          >
            {loading ? "Guardando..." : "Guardar Preferencias"}
          </button>
        </div>
      </div>
    </div>
  )
}
