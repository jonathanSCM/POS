"use client"

import { useState, useEffect } from "react"
import { createProductBatch } from "@/app/actions/batches"
import { getProducts } from "@/app/actions/products"
import { getSuppliers } from "@/app/actions/suppliers"
import Link from "next/link"
import { useSession } from "next-auth/react"

type BatchRow = {
  id: string
  productId: string
  batchNumber: string
  quantity: string
  unitType: "UNIT" | "BOX" | "KG" | "LITER"
  expiryDate: string
}

export default function ReceiveMerchandisePage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [rows, setRows] = useState<BatchRow[]>([
    { id: "1", productId: "", batchNumber: "", quantity: "", unitType: "UNIT", expiryDate: "" },
  ])

  useEffect(() => {
    ;(async () => {
      const [prods, sups] = await Promise.all([getProducts(), getSuppliers()])
      setProducts(prods)
      setSuppliers(sups)
    })()
  }, [])

  const handleAddRow = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    setRows([
      ...rows,
      { id: newId, productId: "", batchNumber: "", quantity: "", unitType: "UNIT", expiryDate: "" },
    ])
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id))
    }
  }

  const handleRowChange = (id: string, field: keyof BatchRow, value: string) => {
    setRows(
      rows.map((r) =>
        r.id === id
          ? { ...r, [field]: value }
          : r
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const validRows = rows.filter((r) => r.productId && r.batchNumber && r.quantity)

      if (validRows.length === 0) {
        setMessage("❌ Debes agregar al menos un lote")
        setLoading(false)
        return
      }

      let successCount = 0
      for (const row of validRows) {
        await createProductBatch({
          productId: row.productId,
          batchNumber: row.batchNumber,
          quantity: parseFloat(row.quantity),
          expiryDate: row.expiryDate || undefined,
          supplierId: supplierId || undefined,
        })
        successCount++
      }

      setMessage(`✅ ${successCount} lote(s) ingresado(s) correctamente`)
      setRows([{ id: "1", productId: "", batchNumber: "", quantity: "", unitType: "UNIT", expiryDate: "" }])
      setSupplierId("")
    } catch (error) {
      setMessage(`❌ Error: ${(error as any).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 min-h-screen bg-white">
      <div className="max-w-6xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Recepción de Mercancía</h1>
            <p className="text-gray-600">Ingresa múltiples lotes de una vez</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-8">
          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-semibold ${
                message.includes("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Proveedor y Usuario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Proveedor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Ingresa:</label>
              <input
                type="text"
                disabled
                value={(session?.user as any)?.name || ""}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de Ingreso:</label>
              <input
                type="text"
                disabled
                value={new Date().toLocaleDateString()}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Tabla de Lotes */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Número de Lote</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">Unidad</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cantidad</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Vencimiento</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <select
                        value={row.productId}
                        onChange={(e) => handleRowChange(row.id, "productId", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer"
                      >
                        <option value="">Selecciona producto</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="LOTE-2025-001"
                        value={row.batchNumber}
                        onChange={(e) =>
                          handleRowChange(row.id, "batchNumber", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3 w-32">
                      <select
                        value={row.unitType}
                        onChange={(e) =>
                          handleRowChange(row.id, "unitType", e.target.value as "UNIT" | "BOX" | "KG" | "LITER")
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer"
                      >
                        <option value="UNIT">Unidad</option>
                        <option value="BOX">Caja</option>
                        <option value="KG">Kilo</option>
                        <option value="LITER">Litro</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        placeholder={row.unitType === "UNIT" || row.unitType === "BOX" ? "0" : "0.00"}
                        step={row.unitType === "UNIT" || row.unitType === "BOX" ? "1" : "0.01"}
                        value={row.quantity}
                        onChange={(e) => handleRowChange(row.id, "quantity", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.expiryDate}
                        onChange={(e) => handleRowChange(row.id, "expiryDate", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-red-600 hover:text-red-800 font-semibold transition"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2.5 px-4 rounded-lg transition"
            >
              + Agregar Lote
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition"
            >
              {loading ? "Guardando..." : "✓ Guardar Todos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
