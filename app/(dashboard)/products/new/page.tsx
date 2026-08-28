"use client"

import { createProduct } from "@/app/actions/products"
import { getCategories } from "@/app/actions/categories"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    sku: "",
    barcode: "",
    name: "",
    description: "",
    categoryId: "",
    costPrice: "",
    salePrice: "",
    minStockAlert: "0",
    unitType: "UNIT",
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const cats = await getCategories()
    setCategories(cats)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await createProduct({
        ...formData,
        categoryId: formData.categoryId || null,
      })
      router.push("/products")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nuevo Producto</h1>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Código de Barras
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Categoría
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Precio Costo
              </label>
              <input
                type="number"
                step="0.01"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Precio Venta
              </label>
              <input
                type="number"
                step="0.01"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Tipo
              </label>
              <select
                name="unitType"
                value={formData.unitType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="UNIT">Unidad</option>
                <option value="KG">Kg</option>
                <option value="LITER">Litro</option>
                <option value="BOX">Caja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Stock Mínimo
            </label>
            <input
              type="number"
              step="0.01"
              name="minStockAlert"
              value={formData.minStockAlert}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {isLoading ? "Guardando..." : "Crear Producto"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
