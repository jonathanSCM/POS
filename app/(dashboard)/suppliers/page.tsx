"use client"

import { getSuppliers, createSupplier, deleteSupplier } from "@/app/actions/suppliers"
import { useState, useEffect } from "react"
import Link from "next/link"
import Decimal from "decimal.js"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

export default function SuppliersPage() {
  const currency = useCurrencySymbol()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    const sups = await getSuppliers()
    setSuppliers(sups)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      await createSupplier(formData)
      setFormData({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
      })
      await loadSuppliers()
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el proveedor")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro?")) return
    setError("")
    try {
      await deleteSupplier(id)
      await loadSuppliers()
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar el proveedor")
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Proveedores</h1>
          <p className="text-muted">Gestiona los proveedores de tu negocio</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2.5 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
        >
          ← Dashboard
        </Link>
      </div>

      {(() => {
        const suppliersOwing = suppliers.filter((s) => new Decimal(s.owed || 0).gt(0))
        const totalPayable = suppliersOwing.reduce((sum, s) => sum.plus(new Decimal(s.owed)), new Decimal(0))
        if (totalPayable.lte(0)) return null
        return (
          <div className="glass rounded-2xl p-6 mb-8 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted mb-1">Total por Pagar</p>
              <p className="text-3xl font-bold text-danger">{currency}{totalPayable.toFixed(2)}</p>
            </div>
            <p className="text-sm text-muted">{suppliersOwing.length} proveedor{suppliersOwing.length !== 1 ? "es" : ""} con saldo pendiente</p>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Nuevo Proveedor</h2>
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
                placeholder="Ej: Proveedora ABC"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Contacto</label>
              <input
                type="text"
                placeholder="Nombre del contacto"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="+34 600 000 000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input
                type="email"
                placeholder="contacto@proveedor.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Calle y número"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
            >
              {isLoading ? "Creando..." : "Crear Proveedor"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Proveedores ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <p className="text-muted text-center py-8">Sin proveedores registrados</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 bg-white/5 rounded-lg border border-border hover:border-border transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-text">{sup.name}</p>
                      {sup.contactName && (
                        <p className="text-xs text-muted mt-1">Contacto: {sup.contactName}</p>
                      )}
                      {sup.phone && (
                        <p className="text-xs text-muted">📱 {sup.phone}</p>
                      )}
                      {sup.email && (
                        <p className="text-xs text-muted">✉️ {sup.email}</p>
                      )}
                      {new Decimal(sup.owed || 0).gt(0) && (
                        <p className="text-xs text-danger font-semibold mt-1">
                          Debe {currency}{new Decimal(sup.owed).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/suppliers/${sup.id}`}
                        className="text-xs font-medium text-primary-2 hover:underline"
                      >
                        Ver cuenta →
                      </Link>
                      <button
                        onClick={() => handleDelete(sup.id)}
                        className="px-3 py-1 text-xs font-medium text-danger hover:text-danger hover:bg-danger/10 rounded transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
