"use client"

import { getProduct, updateProduct } from "@/app/actions/products"
import { getCategories } from "@/app/actions/categories"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
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
    loadProduct()
  }, [])

  async function loadCategories() {
    const cats = await getCategories()
    setCategories(cats)
  }

  async function loadProduct() {
    const product = await getProduct(productId)
    if (product) {
      setFormData({
        sku: product.sku,
        barcode: product.barcode || "",
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId || "",
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        minStockAlert: product.minStockAlert,
        unitType: product.unitType,
      })
    }
    setLoadingProduct(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await updateProduct(productId, {
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

  if (loadingProduct) return <div className="p-8">Cargando...</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-text mb-8">Editar Producto</h1>

      <div className="bg-surface backdrop-blur-md rounded-lg shadow p-8 max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-danger px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-2">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-2">
                Código de Barras
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">
              Categoría
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
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
              <label className="block text-muted font-medium mb-2">
                Precio Costo
              </label>
              <input
                type="number"
                step="0.01"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-2">
                Precio Venta
              </label>
              <input
                type="number"
                step="0.01"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-2">
                Tipo
              </label>
              <select
                name="unitType"
                value={formData.unitType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="UNIT">Unidad</option>
                <option value="KG">Kg</option>
                <option value="LITER">Litro</option>
                <option value="BOX">Caja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">
              Stock Mínimo
            </label>
            <input
              type="number"
              step="0.01"
              name="minStockAlert"
              value={formData.minStockAlert}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary disabled:opacity-40 text-white rounded-lg transition"
            >
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-white/15 hover:bg-white/25 text-text rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
