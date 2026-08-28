"use client"

import { getCategories, createCategory, deleteCategory } from "@/app/actions/categories"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const cats = await getCategories()
    setCategories(cats)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName) return

    setIsLoading(true)
    setError("")
    try {
      await createCategory({ name: newCategoryName })
      setNewCategoryName("")
      await loadCategories()
    } catch (err: any) {
      setError(err?.message || "No se pudo crear la categoría")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro?")) return
    setError("")
    try {
      await deleteCategory(id)
      await loadCategories()
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar la categoría")
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Categorías</h1>
          <p className="text-muted">Organiza tus productos por categorías</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2.5 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Nueva Categoría</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Nombre *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Bebidas, Snacks, etc."
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-surface backdrop-blur-md text-text placeholder-muted focus:outline-none focus:border-primary-2"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
            >
              {isLoading ? "Creando..." : "Crear Categoría"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Categorías ({categories.length})</h2>
          {categories.length === 0 ? (
            <p className="text-muted text-center py-8">Sin categorías creadas</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-border hover:border-border transition"
                >
                  <span className="font-medium text-text">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="px-3 py-1 text-xs font-medium text-danger hover:text-danger hover:bg-danger/10 rounded transition"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
