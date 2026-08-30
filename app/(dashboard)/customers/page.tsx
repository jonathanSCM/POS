"use client"

import { getCustomers, createCustomer } from "@/app/actions/customers"
import { useState, useEffect } from "react"
import Link from "next/link"
import Decimal from "decimal.js"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

export default function CustomersPage() {
  const currency = useCurrencySymbol()
  const [customers, setCustomers] = useState<any[]>([])
  const [formData, setFormData] = useState({ name: "", phone: "", taxId: "", email: "", address: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const data = await getCustomers()
    setCustomers(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      await createCustomer(formData)
      setFormData({ name: "", phone: "", taxId: "", email: "", address: "" })
      await load()
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el cliente")
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.taxId || "").toLowerCase().includes(q)
    )
  })

  const customersOwing = customers.filter((c) => new Decimal(c.storeCreditBalance || 0).lt(0))
  const totalReceivable = customersOwing.reduce(
    (sum, c) => sum.plus(new Decimal(c.storeCreditBalance).abs()),
    new Decimal(0)
  )

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Clientes</h1>
          <p className="text-muted">Base de clientes e historial de compras</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2.5 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
        >
          ← Dashboard
        </Link>
      </div>

      {totalReceivable.gt(0) && (
        <div className="glass rounded-2xl p-6 mb-8 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted mb-1">Total por Cobrar</p>
            <p className="text-3xl font-bold text-danger">{currency}{totalReceivable.toFixed(2)}</p>
          </div>
          <p className="text-sm text-muted">{customersOwing.length} cliente{customersOwing.length !== 1 ? "s" : ""} con saldo pendiente</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Nuevo Cliente</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 text-sm text-text placeholder-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Teléfono *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-4 py-2 text-sm text-text placeholder-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">NIT / Documento</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-4 py-2 text-sm text-text placeholder-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 text-sm text-text placeholder-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 text-sm text-text placeholder-muted"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
            >
              {isLoading ? "Creando..." : "Crear Cliente"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text">Clientes ({customers.length})</h2>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm text-text placeholder-muted w-48"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted text-center py-8">Sin clientes registrados</p>
          ) : (
            <div className="space-y-3 max-h-[32rem] overflow-y-auto">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="block p-4 bg-white/5 rounded-lg border border-border hover:border-primary-2/50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-text">{c.name}</p>
                      <p className="text-xs text-muted">📱 {c.phone}{c.taxId ? ` • NIT: ${c.taxId}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted block">{c._count.sales} compras</span>
                      {new Decimal(c.storeCreditBalance || 0).lt(0) && (
                        <span className="text-xs text-danger font-semibold">
                          Debe {currency}{new Decimal(c.storeCreditBalance).abs().toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
