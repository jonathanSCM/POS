"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Branch {
  id: string
  name: string
  address: string | null
  active: boolean
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState({ name: "", address: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    const response = await fetch("/api/branches")
    if (response.ok) setBranches(await response.json())
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (response.ok) {
        setForm({ name: "", address: "" })
        await loadBranches()
      } else {
        setError(data.error || "No se pudo crear la sucursal")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (branch: Branch) => {
    if (branch.active) {
      const response = await fetch(`/api/branches/${branch.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || "No se pudo desactivar")
        return
      }
    } else {
      await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      })
    }
    await loadBranches()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Sucursales</h1>
            <p className="text-muted">Cada sucursal lleva su propio inventario y caja, pero comparte el catálogo de productos</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text mb-6">Nueva Sucursal</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="text-sm text-danger bg-red-100 border border-red-300 rounded-lg px-3 py-2">{error}</div>
              )}
              <input
                type="text"
                placeholder="Nombre (ej. Sucursal Norte)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Dirección (opcional)"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg text-text placeholder-muted"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="w-full px-4 py-2 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg font-bold transition"
              >
                {loading ? "Creando..." : "Crear Sucursal"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text mb-6">Sucursales ({branches.length})</h2>
            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.id} className="p-4 bg-white/5 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-text">{b.name}</p>
                    {b.address && <p className="text-xs text-muted">{b.address}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleActive(b)}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      b.active ? "bg-green-100 text-success hover:bg-green-200" : "bg-red-100 text-danger hover:bg-red-200"
                    }`}
                  >
                    {b.active ? "Activa" : "Inactiva"}
                  </button>
                </div>
              ))}
              {branches.length === 0 && <p className="text-muted text-sm">Todavía no hay sucursales creadas.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
