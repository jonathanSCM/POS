import { getBatchesNearExpiry, getExpiredBatches } from "@/app/actions/batches"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

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
    <div className="p-8 min-h-screen bg-white">
      <div className="max-w-6xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Alertas de Inventario</h1>
            <p className="text-gray-600">Productos próximos a vencer y stock bajo</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

      <div className="space-y-8">
        {/* Vencidos */}
        {expired.length > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-6">🚨 Productos Vencidos</h2>
            <div className="space-y-3">
              {expired.map((batch) => (
                <div key={batch.id} className="bg-red-50 rounded-lg p-4 flex justify-between items-center border border-red-100">
                  <div>
                    <p className="font-semibold text-black">{batch.product.name}</p>
                    <p className="text-sm text-gray-600">
                      Lote: <span className="font-mono text-gray-700">{batch.batchNumber}</span>
                    </p>
                    <p className="text-sm text-red-700 font-medium">
                      Vencido desde: {new Date(batch.expiryDate!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-700">{batch.qtyRemaining.toString()}</p>
                    <p className="text-xs text-gray-600">{batch.product.unitType}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos a vencer */}
        <div className="bg-white border border-yellow-200 rounded-2xl p-6">
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
                  <div key={batch.id} className="bg-yellow-50 rounded-lg p-4 flex justify-between items-center border border-yellow-100">
                    <div>
                      <p className="font-semibold text-black">{batch.product.name}</p>
                      <p className="text-sm text-gray-600">
                        Lote: <span className="font-mono text-gray-700">{batch.batchNumber}</span>
                      </p>
                      <p className="text-sm text-yellow-700 font-medium">
                        Vence en {daysUntilExpiry} días ({new Date(batch.expiryDate!).toLocaleDateString()})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-700">{batch.qtyRemaining.toString()}</p>
                      <p className="text-xs text-gray-600">{batch.product.unitType}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-600">✅ Ningún producto próximo a vencer</p>
          )}
        </div>

        {/* Stock bajo */}
        <div className="bg-white border border-orange-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-orange-900 mb-6">📦 Stock Bajo</h2>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="bg-orange-50 rounded-lg p-4 flex justify-between items-center border border-orange-100">
                  <div>
                    <p className="font-semibold text-black">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    <p className="text-sm text-orange-700 font-medium">
                      Mínimo recomendado: {product.minStockAlert.toString()} {product.unitType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">{product.stockQty.toString()}</p>
                    <p className="text-xs text-gray-600">{product.unitType}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">✅ Todos los productos tienen stock adecuado</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
