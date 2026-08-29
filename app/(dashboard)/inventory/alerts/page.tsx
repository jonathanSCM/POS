import { getBatchesNearExpiry, getExpiredBatches } from "@/app/actions/batches"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDate } from "@/lib/dates"

export default async function AlertsPage() {
  const nearExpiry = await getBatchesNearExpiry(30)
  const expired = await getExpiredBatches()

  // Productos bajo stock
  const lowStockProducts = await prisma.product.findMany({
    where: {
      active: true,
      stockQty: {
        lte: prisma.product.fields.minStockAlert,
      },
    },
  })

  return (
    <div className="p-8 min-h-screen bg-surface backdrop-blur-md">
      <div className="max-w-6xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Alertas de Inventario</h1>
            <p className="text-muted">Productos próximos a vencer y stock bajo</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

      <div className="space-y-8">
        {/* Vencidos */}
        {expired.length > 0 && (
          <div className="bg-surface backdrop-blur-md border border-danger/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-6">🚨 Productos Vencidos</h2>
            <div className="space-y-3">
              {expired.map((batch) => (
                <div key={batch.id} className="bg-danger/10 rounded-lg p-4 flex justify-between items-center border border-red-100">
                  <div>
                    <p className="font-semibold text-text">{batch.product.name}</p>
                    <p className="text-sm text-muted">
                      Lote: <span className="font-mono text-muted">{batch.batchNumber}</span>
                    </p>
                    <p className="text-sm text-danger font-medium">
                      Vencido desde: {formatDate(batch.expiryDate!)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-danger">{batch.qtyRemaining.toString()}</p>
                    <p className="text-xs text-muted">{batch.product.unitType}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos a vencer */}
        <div className="bg-surface backdrop-blur-md border border-warning/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-yellow-900 mb-6">
            ⚠️ Próximos a Vencer (próximos 30 días)
          </h2>
          {nearExpiry.length > 0 ? (
            <div className="space-y-3">
              {nearExpiry.map((batch) => {
                const daysUntilExpiry = Math.ceil(
                  (new Date(batch.expiryDate!).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return (
                  <div key={batch.id} className="bg-warning/10 rounded-lg p-4 flex justify-between items-center border border-yellow-100">
                    <div>
                      <p className="font-semibold text-text">{batch.product.name}</p>
                      <p className="text-sm text-muted">
                        Lote: <span className="font-mono text-muted">{batch.batchNumber}</span>
                      </p>
                      <p className="text-sm text-warning font-medium">
                        Vence en {daysUntilExpiry} días ({formatDate(batch.expiryDate!)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-warning">{batch.qtyRemaining.toString()}</p>
                      <p className="text-xs text-muted">{batch.product.unitType}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted">✅ Ningún producto próximo a vencer</p>
          )}
        </div>

        {/* Stock bajo */}
        <div className="bg-surface backdrop-blur-md border border-orange-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-orange-900 mb-6">📦 Stock Bajo</h2>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="bg-orange-50 rounded-lg p-4 flex justify-between items-center border border-orange-100">
                  <div>
                    <p className="font-semibold text-text">{product.name}</p>
                    <p className="text-sm text-muted">SKU: {product.sku}</p>
                    <p className="text-sm text-orange-700 font-medium">
                      Mínimo recomendado: {product.minStockAlert.toString()} {product.unitType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">{product.stockQty.toString()}</p>
                    <p className="text-xs text-muted">{product.unitType}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">✅ Todos los productos tienen stock adecuado</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
