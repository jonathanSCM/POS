import { getBatchesNearExpiry, getExpiredBatches } from "@/app/actions/batches"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDate } from "@/lib/dates"
import { estimateReorder, needsReorderSoon } from "@/lib/reorder"
import { formatDateOnly } from "@/lib/dates"
import Decimal from "decimal.js"

const REORDER_PERIOD_DAYS = 30
const REORDER_THRESHOLD_DAYS = 14
const STALE_PERIOD_DAYS = 60
const REVENUE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED", "RETURNED"] as const

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

  // Alertas inteligentes: cuanto se vende por dia en promedio (ultimos 30
  // dias) vs. el stock actual, para estimar cuantos dias quedan al ritmo
  // actual de venta -- en vez de solo comparar contra un minimo fijo.
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - REORDER_PERIOD_DAYS)

  const [salesInPeriod, allActiveProducts] = await Promise.all([
    prisma.saleLine.groupBy({
      by: ["productId"],
      where: {
        sale: {
          status: { in: ["COMPLETED", "PARTIALLY_RETURNED", "RETURNED"] },
          createdAt: { gte: periodStart },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.product.findMany({ where: { active: true } }),
  ])

  const soldByProduct = new Map(salesInPeriod.map((s) => [s.productId, s._sum.quantity || new Decimal(0)]))

  const smartAlerts = allActiveProducts
    .map((product) => {
      const sold = soldByProduct.get(product.id)
      if (!sold) return null
      const estimate = estimateReorder(product.stockQty, sold, REORDER_PERIOD_DAYS)
      if (!needsReorderSoon(estimate, REORDER_THRESHOLD_DAYS)) return null
      return { product, sold, estimate }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.estimate.daysRemaining!.comparedTo(b.estimate.daysRemaining!))

  // Productos sin movimiento: no aparecieron en ninguna venta en los
  // ultimos STALE_PERIOD_DAYS dias. Para darle contexto (no solo "no se
  // vendio recientemente"), se busca ademas su ultima venta alguna vez,
  // si tuvo.
  const staleCutoff = new Date()
  staleCutoff.setDate(staleCutoff.getDate() - STALE_PERIOD_DAYS)

  const recentlySoldIds = new Set(
    (
      await prisma.saleLine.findMany({
        where: { sale: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: staleCutoff } } },
        select: { productId: true },
        distinct: ["productId"],
      })
    ).map((l) => l.productId)
  )

  const staleProducts = allActiveProducts.filter((p) => !recentlySoldIds.has(p.id))

  const everSoldLines =
    staleProducts.length > 0
      ? await prisma.saleLine.findMany({
          where: {
            productId: { in: staleProducts.map((p) => p.id) },
            sale: { status: { in: [...REVENUE_STATUSES] } },
          },
          select: { productId: true, sale: { select: { createdAt: true } } },
        })
      : []

  const lastSoldByProduct = new Map<string, Date>()
  for (const l of everSoldLines) {
    const prev = lastSoldByProduct.get(l.productId)
    if (!prev || l.sale.createdAt > prev) lastSoldByProduct.set(l.productId, l.sale.createdAt)
  }

  const staleWithContext = staleProducts
    .map((product) => ({ product, lastSold: lastSoldByProduct.get(product.id) ?? null }))
    .sort((a, b) => {
      // Nunca vendidos primero, luego los que hace mas tiempo que no se venden.
      if (!a.lastSold && !b.lastSold) return 0
      if (!a.lastSold) return -1
      if (!b.lastSold) return 1
      return a.lastSold.getTime() - b.lastSold.getTime()
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

        {/* Alertas inteligentes de reposición */}
        <div className="bg-surface backdrop-blur-md border border-primary-2/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-text mb-1">🧠 Alertas Inteligentes de Reposición</h2>
          <p className="text-sm text-muted mb-6">
            Según el ritmo de venta de los últimos {REORDER_PERIOD_DAYS} días, no solo un mínimo fijo. Con poco historial de ventas, tomalo como una aproximación.
          </p>
          {smartAlerts.length > 0 ? (
            <div className="space-y-3">
              {smartAlerts.map(({ product, sold, estimate }) => (
                <div key={product.id} className="bg-primary-2/10 rounded-lg p-4 flex justify-between items-center border border-primary-2/20">
                  <div>
                    <p className="font-semibold text-text">{product.name}</p>
                    <p className="text-sm text-muted">SKU: {product.sku}</p>
                    <p className="text-sm text-primary-2 font-medium">
                      Vende ~{estimate.weeklyVelocity.toFixed(1)} {product.unitType}/semana — quedan{" "}
                      {sold ? Math.max(0, Math.round(estimate.daysRemaining!.toNumber())) : 0} días de stock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text">{product.stockQty.toString()}</p>
                    <p className="text-xs text-muted">{product.unitType} en stock</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">✅ Ningún producto en riesgo de agotarse según su ritmo de venta reciente</p>
          )}
        </div>

        {/* Productos sin movimiento */}
        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-text mb-1">🐌 Productos Sin Movimiento</h2>
          <p className="text-sm text-muted mb-6">Sin ventas en los últimos {STALE_PERIOD_DAYS} días — candidatos a promoción, descuento, o dejar de reponer.</p>
          {staleWithContext.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {staleWithContext.map(({ product, lastSold }) => (
                <div key={product.id} className="bg-white/5 rounded-lg p-4 flex justify-between items-center border border-border">
                  <div>
                    <p className="font-semibold text-text">{product.name}</p>
                    <p className="text-sm text-muted">SKU: {product.sku}</p>
                    <p className="text-sm text-muted font-medium">
                      {lastSold ? `Última venta: ${formatDateOnly(lastSold)}` : "Nunca se ha vendido"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text">{product.stockQty.toString()}</p>
                    <p className="text-xs text-muted">{product.unitType} en stock</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">✅ Todos los productos activos se vendieron en los últimos {STALE_PERIOD_DAYS} días</p>
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
