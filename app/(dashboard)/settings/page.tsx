"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Settings {
  storeName: string
  currencySymbol: string
  taxRatePercent: string
  receiptFooterText: string
  receiptPaperWidth: string
  notifyPhone: string
  notifyEmail: string
  bigSaleThreshold: string
  bigAdjustmentThreshold: string
  creditTermDays: string
  whatsappEnabled: boolean
  emailEnabled: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    storeName: "",
    currencySymbol: "$",
    taxRatePercent: "0",
    receiptFooterText: "",
    receiptPaperWidth: "80mm",
    notifyPhone: "",
    notifyEmail: "",
    bigSaleThreshold: "1000",
    bigAdjustmentThreshold: "20",
    creditTermDays: "30",
    whatsappEnabled: false,
    emailEnabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [testingChannel, setTestingChannel] = useState<string | null>(null)

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

  const handleTestNotification = async (channel: "whatsapp" | "email") => {
    setTestingChannel(channel)
    setTestMessage("")
    try {
      const response = await fetch("/api/settings/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      })
      const data = await response.json()
      setTestMessage(response.ok ? "✅ Enviado correctamente" : `❌ ${data.error}`)
    } catch (error) {
      setTestMessage("❌ Error: " + (error as any).message)
    } finally {
      setTestingChannel(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Configuración</h1>
            <p className="text-muted">Ajustes del sistema y tienda</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-semibold mb-6 ${
            message.includes("✅") ? "bg-success/10 text-success border border-success/30" : "bg-danger/10 text-danger border border-danger/30"
          }`}>
            {message}
          </div>
        )}

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Nombre de la Tienda</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Símbolo de Moneda</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Tasa de Impuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRatePercent}
                  onChange={(e) => setSettings({ ...settings, taxRatePercent: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Texto en Pie de Recibo</label>
              <textarea
                value={settings.receiptFooterText}
                onChange={(e) => setSettings({ ...settings, receiptFooterText: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Ancho de Papel de Recibo</label>
              <select
                value={settings.receiptPaperWidth}
                onChange={(e) => setSettings({ ...settings, receiptPaperWidth: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              >
                <option value="58mm">58mm (Térmica pequeña)</option>
                <option value="80mm">80mm (Térmica grande)</option>
              </select>
            </div>

            <div className="pt-6 border-t border-border">
              <h2 className="text-xl font-bold text-text mb-1">Notificaciones</h2>
              <p className="text-sm text-muted mb-4">
                Avisos automáticos por WhatsApp y email (stock bajo, cierre de caja, cuentas vencidas, etc.).
                WhatsApp requiere plantillas aprobadas en Meta Business Manager — ver <code>NOTIFICACIONES.md</code>.
              </p>

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">WhatsApp del dueño</label>
                  <input
                    type="text"
                    placeholder="70123456"
                    value={settings.notifyPhone}
                    onChange={(e) => setSettings({ ...settings, notifyPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Email del dueño</label>
                  <input
                    type="email"
                    placeholder="dueno@negocio.com"
                    value={settings.notifyEmail}
                    onChange={(e) => setSettings({ ...settings, notifyEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Umbral "venta grande" (Bs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.bigSaleThreshold}
                    onChange={(e) => setSettings({ ...settings, bigSaleThreshold: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Umbral "ajuste fuerte" (unid.)</label>
                  <input
                    type="number"
                    step="1"
                    value={settings.bigAdjustmentThreshold}
                    onChange={(e) => setSettings({ ...settings, bigAdjustmentThreshold: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Plazo de fiado (días)</label>
                  <input
                    type="number"
                    step="1"
                    value={settings.creditTermDays}
                    onChange={(e) => setSettings({ ...settings, creditTermDays: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={settings.whatsappEnabled}
                    onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })}
                  />
                  Activar envío por WhatsApp
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                  />
                  Activar envío por email
                </label>
              </div>

              {testMessage && <p className="text-sm mb-3">{testMessage}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTestNotification("whatsapp")}
                  disabled={testingChannel !== null}
                  className="px-4 py-2 bg-white/15 hover:bg-white/20 disabled:opacity-40 text-text rounded-lg text-sm font-medium transition"
                >
                  {testingChannel === "whatsapp" ? "Enviando..." : "📱 Enviar WhatsApp de prueba"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestNotification("email")}
                  disabled={testingChannel !== null}
                  className="px-4 py-2 bg-white/15 hover:bg-white/20 disabled:opacity-40 text-text rounded-lg text-sm font-medium transition"
                >
                  {testingChannel === "email" ? "Enviando..." : "✉️ Enviar email de prueba"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg font-bold transition"
            >
              {loading ? "Guardando..." : "Guardar Configuración"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
