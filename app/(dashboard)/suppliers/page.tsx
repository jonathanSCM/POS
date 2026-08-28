"use client"

import { getSuppliers, createSupplier, deleteSupplier } from "@/app/actions/suppliers"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function SuppliersPage() {
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
          <h1 className="text-4xl font-bold text-black mb-2">Proveedores</h1>
          <p className="text-gray-600">Gestiona los proveedores de tu negocio</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-6">Nuevo Proveedor</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                placeholder="Ej: Proveedora ABC"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input
                type="text"
                placeholder="Nombre del contacto"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="+34 600 000 000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="contacto@proveedor.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Calle y número"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
            >
              {isLoading ? "Creando..." : "Crear Proveedor"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-6">Proveedores ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sin proveedores registrados</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-black">{sup.name}</p>
                      {sup.contactName && (
                        <p className="text-xs text-gray-600 mt-1">Contacto: {sup.contactName}</p>
                      )}
                      {sup.phone && (
                        <p className="text-xs text-gray-600">📱 {sup.phone}</p>
                      )}
                      {sup.email && (
                        <p className="text-xs text-gray-600">✉️ {sup.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(sup.id)}
                      className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                    >
                      Eliminar
                    </button>
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
