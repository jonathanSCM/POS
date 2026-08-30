"use client"

import { createPurchaseOrder } from "@/app/actions/purchase-orders"
import { getSuppliers } from "@/app/actions/suppliers"
import { getProducts } from "@/app/actions/products"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    supplierId: "",
    notes: "",
    dueDate: "",
  })

  const [lines, setLines] = useState<
    { productId: string; quantity: string; unitCost: string }[]
  >([{ productId: "", quantity: "", unitCost: "" }])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [sups, prods] = await Promise.all([getSuppliers(), getProducts()])
    setSuppliers(sups)
    setProducts(prods)
  }

  function addLine() {
    setLines([
      ...lines,
      { productId: "", quantity: "", unitCost: "" },
    ])
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  function updateLine(
    idx: number,
    field: "productId" | "quantity" | "unitCost",
    value: string
  ) {
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: value }
    setLines(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await createPurchaseOrder({
        supplierId: formData.supplierId,
        lines: lines.map((line) => ({
          productId: line.productId,
          quantity: parseFloat(line.quantity),
          unitCost: parseFloat(line.unitCost),
        })),
        notes: formData.notes,
        dueDate: formData.dueDate || undefined,
      })
      router.push("/purchase-orders")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-8">Nueva Orden de Compra</h1>

      <div className="bg-surface backdrop-blur-md rounded-lg shadow p-8">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-danger px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-muted font-medium mb-2">
              Proveedor
            </label>
            <select
              value={formData.supplierId}
              onChange={(e) =>
                setFormData({ ...formData, supplierId: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">
              Productos
            </label>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-3">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(idx, "productId", e.target.value)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cantidad"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                    className="w-24 px-4 py-2 border border-border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Costo"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, "unitCost", e.target.value)}
                    className="w-24 px-4 py-2 border border-border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="px-3 py-2 bg-red-100 text-danger rounded hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-3 text-primary-2 hover:text-primary-2 text-sm font-medium"
            >
              + Agregar producto
            </button>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">Fecha de vencimiento (opcional)</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary disabled:opacity-40 text-white rounded-lg"
            >
              {isLoading ? "Creando..." : "Crear Orden"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
