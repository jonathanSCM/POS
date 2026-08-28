"use client"

import { getProduct, adjustStock } from "@/app/actions/products"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function StockAdjustPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [])

  async function loadProduct() {
    const p = await getProduct(productId)
    setProduct(p)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    try {
      await adjustStock({
        productId,
        quantity: parseFloat(quantity),
        reason,
      })
      setSuccess(true)
      setQuantity("")
      setReason("")
      await loadProduct()
      setTimeout(() => {
        router.push("/products")
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!product) return <div>Cargando...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Ajustar Stock - {product.name}
      </h1>

      <div className="bg-white rounded-lg shadow p-8 max-w-md">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Stock ajustado correctamente. Redirigiendo...
          </div>
        )}

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Stock Actual:</p>
          <p className="text-2xl font-bold text-gray-900">
            {Number(product.stockQty)} {product.unitType}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Cantidad (+ o -)
            </label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="ej: 10 o -5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Positivo para agregar, negativo para restar
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Razón
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar razón</option>
              <option value="Inventario inicial">Inventario inicial</option>
              <option value="Recepción de proveedor">Recepción de proveedor</option>
              <option value="Devolución de cliente">Devolución de cliente</option>
              <option value="Daño/Pérdida">Daño/Pérdida</option>
              <option value="Ajuste de inventario">Ajuste de inventario</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {isLoading ? "Ajustando..." : "Ajustar Stock"}
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
