"use client"

import { createStockTransfer } from "@/app/actions/stock-transfers"
import { getProducts } from "@/app/actions/products"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface Branch {
  id: string
  name: string
}

export default function NewStockTransferPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [fromBranchId, setFromBranchId] = useState("")
  const [toBranchId, setToBranchId] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([
    { productId: "", quantity: "" },
  ])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [branchesRes, prods] = await Promise.all([fetch("/api/branches"), getProducts()])
    setBranches(await branchesRes.json())
    setProducts(prods)
  }

  function addLine() {
    setLines([...lines, { productId: "", quantity: "" }])
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, field: "productId" | "quantity", value: string) {
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: value }
    setLines(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const validLines = lines.filter((l) => l.productId && l.quantity)
      await createStockTransfer({
        fromBranchId,
        toBranchId,
        notes,
        lines: validLines.map((l) => ({
          productId: l.productId,
          productName: products.find((p) => p.id === l.productId)?.name || "",
          quantity: parseFloat(l.quantity),
        })),
      })
      router.push("/inventory/transfers")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-text mb-8">Nueva Transferencia de Inventario</h1>

      <div className="bg-surface backdrop-blur-md rounded-lg shadow p-8">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-danger px-4 py-3 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-2">Sucursal de origen</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-lg"
              >
                <option value="">Seleccionar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-muted font-medium mb-2">Sucursal de destino</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-lg"
              >
                <option value="">Seleccionar</option>
                {branches.filter((b) => b.id !== fromBranchId).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">Productos a transferir</label>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-3">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(idx, "productId", e.target.value)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cantidad"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                    className="w-28 px-4 py-2 border border-border rounded-lg text-sm"
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
            <button type="button" onClick={addLine} className="mt-3 text-primary-2 text-sm font-medium">
              + Agregar producto
            </button>
          </div>

          <div>
            <label className="block text-muted font-medium mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !fromBranchId || !toBranchId}
              className="flex-1 px-4 py-2 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-lg"
            >
              {isLoading ? "Creando..." : "Crear Transferencia"}
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
