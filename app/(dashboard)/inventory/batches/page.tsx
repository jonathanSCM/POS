import { getAllBatches } from "@/app/actions/batches"
import Link from "next/link"

export default async function BatchesPage() {
  const batches = await getAllBatches()

  const getStatusBadge = (batch: any) => {
    if (!batch.expiryDate) return { bg: "bg-white/10", text: "text-muted", label: "Sin vencimiento" }

    const today = new Date()
    const expiry = new Date(batch.expiryDate)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return { bg: "bg-red-100", text: "text-danger", label: "🚨 VENCIDO" }
    if (daysLeft < 30) return { bg: "bg-yellow-100", text: "text-warning", label: `⚠️ ${daysLeft}d` }
    return { bg: "bg-green-100", text: "text-success", label: "✅ OK" }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Lotes de Productos</h1>
            <p className="text-muted">Historial completo de ingresos</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

        {batches.length === 0 ? (
          <div className="bg-primary-2/10 border-2 border-blue-300 rounded-3xl p-12 text-center">
            <p className="text-muted text-lg mb-6">No hay lotes registrados aún.</p>
            <Link
              href="/inventory/receive"
              className="inline-block bg-primary hover:bg-primary text-white font-semibold py-3 px-8 rounded-xl transition"
            >
              Ingresar Primer Lote →
            </Link>
          </div>
        ) : (
          <div className="bg-surface backdrop-blur-md rounded-3xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/10 border-b-2 border-border">
                    <th className="px-6 py-4 text-left text-text font-bold">Producto</th>
                    <th className="px-6 py-4 text-left text-text font-bold">Número de Lote</th>
                    <th className="px-6 py-4 text-left text-text font-bold">Proveedor</th>
                    <th className="px-6 py-4 text-center text-text font-bold">Recibido</th>
                    <th className="px-6 py-4 text-center text-text font-bold">Vencimiento</th>
                    <th className="px-6 py-4 text-center text-text font-bold">Disponible</th>
                    <th className="px-6 py-4 text-center text-text font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch, idx) => {
                    const status = getStatusBadge(batch)
                    return (
                      <tr
                        key={batch.id}
                        className={`border-b border-border hover:bg-white/5 transition ${
                          idx % 2 === 0 ? "bg-surface backdrop-blur-md" : "bg-white/5"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-text">{batch.product.name}</p>
                            <p className="text-sm text-muted">SKU: {batch.product.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono bg-white/10 px-3 py-1 rounded-lg text-sm text-text">
                            {batch.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted">
                          {batch.supplier?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-center text-muted">
                          {new Date(batch.receivedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center text-muted">
                          {batch.expiryDate
                            ? new Date(batch.expiryDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-lg text-text">
                            {batch.qtyRemaining.toString()}
                          </div>
                          <p className="text-xs text-muted">{batch.product.unitType}</p>
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
