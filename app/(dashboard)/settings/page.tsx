"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Settings {
  storeName: string
  currencySymbol: string
  taxRatePercent: string
  receiptFooterText: string
  receiptPaperWidth: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    storeName: "",
    currencySymbol: "$",
    taxRatePercent: "0",
    receiptFooterText: "",
    receiptPaperWidth: "80mm",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage("✅ Configuración guardada correctamente")
      } else {
        setMessage("❌ Error al guardar")
      }
    } catch (error) {
      setMessage("❌ Error: " + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Configuración</h1>
            <p className="text-gray-600">Ajustes del sistema y tienda</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-semibold mb-6 ${
            message.includes("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded-2xl p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Tienda</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Símbolo de Moneda</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Impuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRatePercent}
                  onChange={(e) => setSettings({ ...settings, taxRatePercent: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texto en Pie de Recibo</label>
              <textarea
                value={settings.receiptFooterText}
                onChange={(e) => setSettings({ ...settings, receiptFooterText: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ancho de Papel de Recibo</label>
              <select
                value={settings.receiptPaperWidth}
                onChange={(e) => setSettings({ ...settings, receiptPaperWidth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none"
              >
                <option value="58mm">58mm (Térmica pequeña)</option>
                <option value="80mm">80mm (Térmica grande)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
            >
              {loading ? "Guardando..." : "Guardar Configuración"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
