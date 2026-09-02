"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ToggleSwitch from "@/components/shared/ToggleSwitch"

interface NotifType {
  type: string
  label: string
  description: string
  channels: string
  icon: string
  audience: "owner" | "customer"
}

interface NotifGroup {
  key: string
  label: string
  icon: string
  types: NotifType[]
}

interface StoreSettings {
  notifyPhone: string
  notifyEmail: string
  bigSaleThreshold: string
  bigAdjustmentThreshold: string
  creditTermDays: string
  whatsappEnabled: boolean
  emailEnabled: boolean
  dailyCheckHour: string
  weeklyCheckHour: string
  [key: string]: any
}

function ChannelBadge({ channels }: { channels: string }) {
  const isWhatsApp = channels.includes("WhatsApp")
  const isEmail = channels.includes("Email")
  return (
    <div className="flex gap-1.5">
      {isWhatsApp && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/15 text-success whitespace-nowrap">
          📱 WhatsApp
        </span>
      )}
      {isEmail && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-2/15 text-primary-2 whitespace-nowrap">
          ✉️ Email
        </span>
      )}
    </div>
  )
}

function NotificationRow({ item, checked, onToggle }: { item: NotifType; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-t border-border first:border-t-0 hover:bg-white/[0.03] transition">
      <div className="w-10 h-10 shrink-0 rounded-xl glass-2 flex items-center justify-center text-lg">{item.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">{item.label}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.description}</p>
      </div>
      <div className="hidden sm:block">
        <ChannelBadge channels={item.channels} />
      </div>
      <ToggleSwitch checked={checked} onChange={onToggle} />
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/70 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  )
}

export default function NotificationPreferencesPage() {
  const [groups, setGroups] = useState<NotifGroup[]>([])
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [dirty, setDirty] = useState(false)

  const [testEmailTo, setTestEmailTo] = useState("")
  const [testPhoneTo, setTestPhoneTo] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [testingChannel, setTestingChannel] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const [prefsRes, settingsRes] = await Promise.all([
      fetch("/api/notification-preferences"),
      fetch("/api/settings"),
    ])
    if (prefsRes.ok) {
      const data = await prefsRes.json()
      setGroups(data.groups)
      setPreferences(data.preferences)
    }
    if (settingsRes.ok) {
      setSettings(await settingsRes.json())
    }
  }

  const toggle = (type: string) => {
    setPreferences((prev) => ({ ...prev, [type]: !prev[type] }))
    setDirty(true)
  }

  const updateSetting = (patch: Partial<StoreSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage("")
    try {
      const [prefsRes, settingsRes] = await Promise.all([
        fetch("/api/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
        settings
          ? fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(settings),
            })
          : Promise.resolve({ ok: true }),
      ])
      setMessage(prefsRes.ok && settingsRes.ok ? "✅ Guardado correctamente" : "❌ Error al guardar")
      if (prefsRes.ok && settingsRes.ok) setDirty(false)
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
      const to = channel === "email" ? testEmailTo.trim() : testPhoneTo.trim()
      const response = await fetch("/api/settings/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to: to || undefined }),
      })
      const data = await response.json()
      setTestMessage(
        response.ok
          ? `✅ Enviado a ${to || (channel === "email" ? settings?.notifyEmail : settings?.notifyPhone)}`
          : `❌ ${data.error}`
      )
    } catch (error) {
      setTestMessage("❌ Error: " + (error as any).message)
    } finally {
      setTestingChannel(null)
    }
  }

  const ownerGroups = groups.filter((g) => g.types.some((t) => t.audience === "owner"))
  const customerGroup = groups.find((g) => g.key === "cliente")
  const ownerCount = groups.flatMap((g) => g.types).filter((t) => t.audience === "owner" && (preferences[t.type] ?? true)).length
  const ownerTotal = groups.flatMap((g) => g.types).filter((t) => t.audience === "owner").length

  if (!settings) {
    return <div className="min-h-screen p-8 text-muted">Cargando...</div>
  }

  return (
    <div className="min-h-screen p-8 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text font-display mb-2">Notificaciones</h1>
            <p className="text-muted max-w-xl">
              Todo lo que tu sistema puede avisarte a vos y a tus clientes por WhatsApp y email: a dónde mandarlo,
              cuándo, y cuáles activar.
            </p>
          </div>
          <Link href="/settings" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition whitespace-nowrap">
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

        {/* ── Canales ── */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary-2 mb-3 px-1">1. Canales de envío</h2>
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className={`rounded-xl border p-4 transition ${settings.whatsappEnabled ? "border-success/40 bg-success/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-text">📱 WhatsApp</span>
                  <ToggleSwitch checked={settings.whatsappEnabled} onChange={(v) => updateSetting({ whatsappEnabled: v })} />
                </div>
                <input
                  type="text"
                  placeholder="Tu número, ej. 70123456"
                  value={settings.notifyPhone || ""}
                  onChange={(e) => updateSetting({ notifyPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg text-text placeholder-muted focus:outline-none mb-2"
                />
                <p className="text-xs text-muted leading-relaxed">
                  Requiere plantillas aprobadas en Meta Business Manager — ver <code>NOTIFICACIONES.md</code>.
                </p>
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Probar a otro número (opcional)"
                    value={testPhoneTo}
                    onChange={(e) => setTestPhoneTo(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestNotification("whatsapp")}
                    disabled={testingChannel !== null}
                    className="px-3 py-1.5 bg-white/15 hover:bg-white/20 disabled:opacity-40 text-text rounded-lg text-xs font-medium transition whitespace-nowrap"
                  >
                    {testingChannel === "whatsapp" ? "..." : "Probar"}
                  </button>
                </div>
              </div>

              <div className={`rounded-xl border p-4 transition ${settings.emailEnabled ? "border-success/40 bg-success/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-text">✉️ Email</span>
                  <ToggleSwitch checked={settings.emailEnabled} onChange={(v) => updateSetting({ emailEnabled: v })} />
                </div>
                <input
                  type="email"
                  placeholder="Tu correo, ej. dueno@negocio.com"
                  value={settings.notifyEmail || ""}
                  onChange={(e) => updateSetting({ notifyEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg text-text placeholder-muted focus:outline-none mb-2"
                />
                <p className="text-xs text-muted leading-relaxed">Enviado a través de Resend con el diseño de tu tienda.</p>
                <div className="flex gap-2 mt-3">
                  <input
                    type="email"
                    placeholder="Probar a otro correo (opcional)"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg text-text placeholder-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestNotification("email")}
                    disabled={testingChannel !== null}
                    className="px-3 py-1.5 bg-white/15 hover:bg-white/20 disabled:opacity-40 text-text rounded-lg text-xs font-medium transition whitespace-nowrap"
                  >
                    {testingChannel === "email" ? "..." : "Probar"}
                  </button>
                </div>
              </div>
            </div>
            {testMessage && <p className="text-sm">{testMessage}</p>}
          </div>
        </section>

        {/* ── Umbrales y horarios ── */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary-2 mb-3 px-1">2. Umbrales y horarios</h2>
          <div className="glass rounded-2xl p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Umbral &quot;venta grande&quot; (Bs)" hint="A partir de qué monto una venta te parece fuera de lo común.">
              <input
                type="number"
                step="0.01"
                value={settings.bigSaleThreshold}
                onChange={(e) => updateSetting({ bigSaleThreshold: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              />
            </Field>
            <Field label="Umbral &quot;ajuste fuerte&quot; (unid.)" hint="Cantidad de unidades a partir de la cual un ajuste manual te avisa.">
              <input
                type="number"
                step="1"
                value={settings.bigAdjustmentThreshold}
                onChange={(e) => updateSetting({ bigAdjustmentThreshold: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              />
            </Field>
            <Field label="Plazo de fiado (días)" hint="Después de cuántos días una venta a crédito se considera vencida.">
              <input
                type="number"
                step="1"
                value={settings.creditTermDays}
                onChange={(e) => updateSetting({ creditTermDays: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              />
            </Field>
            <Field label="Hora del resumen diario" hint="También revisa cuentas vencidas y por pagar — una vez al día alcanza.">
              <select
                value={settings.dailyCheckHour}
                onChange={(e) => updateSetting({ dailyCheckHour: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
            <Field label="Hora del resumen semanal (lunes)">
              <select
                value={settings.weeklyCheckHour}
                onChange={(e) => updateSetting({ weeklyCheckHour: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* ── Qué recibir ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary-2">3. Qué querés recibir</h2>
            <span className="text-xs text-muted">{ownerCount} de {ownerTotal} activados</span>
          </div>

          <div className="space-y-5">
            {ownerGroups.map((group, idx) => (
              <div
                key={group.key}
                className="glass rounded-2xl overflow-hidden animate-[fadeIn_0.4s_ease-out_backwards]"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="px-5 py-3 bg-white/5 flex items-center gap-2">
                  <span className="text-base">{group.icon}</span>
                  <h3 className="text-sm font-bold text-text">{group.label}</h3>
                </div>
                {group.types
                  .filter((t) => t.audience === "owner")
                  .map((item) => (
                    <NotificationRow key={item.type} item={item} checked={preferences[item.type] ?? true} onToggle={() => toggle(item.type)} />
                  ))}
              </div>
            ))}
          </div>
        </section>

        {customerGroup && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-accent mb-1 px-1">Directo a tus clientes</h2>
            <p className="text-xs text-muted mb-3 px-1">
              Estos no te llegan a vos — se le mandan automáticamente al cliente cuando corresponde.
            </p>
            <div className="glass rounded-2xl overflow-hidden">
              {customerGroup.types.map((item) => (
                <NotificationRow key={item.type} item={item} checked={preferences[item.type] ?? true} onToggle={() => toggle(item.type)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 print:hidden">
          <div className="max-w-3xl mx-auto px-8 pb-6">
            <div className="glass-overlay rounded-2xl shadow-theme px-5 py-4 flex items-center justify-between">
              <p className="text-sm text-text">Tenés cambios sin guardar.</p>
              <button onClick={handleSave} disabled={loading} className="btn-primary px-6 py-2.5 disabled:opacity-40">
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
