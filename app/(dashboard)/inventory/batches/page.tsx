import { getAllBatches } from "@/app/actions/batches"
import Link from "next/link"

export default async function BatchesPage() {
  const batches = await getAllBatches()

  const getStatusBadge = (batch: any) => {
    if (!batch.expiryDate) return { bg: "bg-gray-100", text: "text-gray-700", label: "Sin vencimiento" }

    const today = new Date()
    const expiry = new Date(batch.expiryDate)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return { bg: "bg-red-100", text: "text-red-700", label: "🚨 VENCIDO" }
    if (daysLeft < 30) return { bg: "bg-yellow-100", text: "text-yellow-700", label: `⚠️ ${daysLeft}d` }
    return { bg: "bg-green-100", text: "text-green-700", label: "✅ OK" }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Lotes de Productos</h1>
            <p className="text-gray-600">Historial completo de ingresos</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

        {batches.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-3xl p-12 text-center">
            <p className="text-gray-600 text-lg mb-6">No hay lotes registrados aún.</p>
            <Link
              href="/inventory/receive"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition"
            >
              Ingresar Primer Lote →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left text-black font-bold">Producto</th>
                    <th className="px-6 py-4 text-left text-black font-bold">Número de Lote</th>
                    <th className="px-6 py-4 text-left text-black font-bold">Proveedor</th>
                    <th className="px-6 py-4 text-center text-black font-bold">Recibido</th>
                    <th className="px-6 py-4 text-center text-black font-bold">Vencimiento</th>
                    <th className="px-6 py-4 text-center text-black font-bold">Disponible</th>
                    <th className="px-6 py-4 text-center text-black font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch, idx) => {
                    const status = getStatusBadge(batch)
                    return (
                      <tr
                        key={batch.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-black">{batch.product.name}</p>
                            <p className="text-sm text-gray-600">SKU: {batch.product.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg text-sm text-black">
                            {batch.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {batch.supplier?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {new Date(batch.receivedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {batch.expiryDate
                            ? new Date(batch.expiryDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-lg text-black">
                            {batch.qtyRemaining.toString()}
                          </div>
                          <p className="text-xs text-gray-600">{batch.product.unitType}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`${status.bg} ${status.text} px-4 py-2 rounded-full text-sm font-semibold`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
