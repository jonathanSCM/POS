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
          <h1 className="text-4xl font-bold text-black mb-2">Categorías</h1>
          <p className="text-gray-600">Organiza tus productos por categorías</p>
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
          <h2 className="text-xl font-bold text-black mb-6">Nueva Categoría</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Bebidas, Snacks, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-500"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
            >
              {isLoading ? "Creando..." : "Crear Categoría"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-6">Categorías ({categories.length})</h2>
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sin categorías creadas</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                >
                  <span className="font-medium text-black">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
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
