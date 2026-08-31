import { prisma } from "@/lib/prisma"
import { formatDateTime, startOfBoliviaDay, endOfBoliviaDay } from "@/lib/dates"
import { getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"
import Link from "next/link"
import Decimal from "decimal.js"

const TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: "📥 Entrada (Compra)",
  SALE_OUT: "📤 Salida (Venta)",
  RETURN_IN: "↩️ Devolución (Entrada)",
  ADJUSTMENT_IN: "⚙️ Ajuste (Entrada)",
  ADJUSTMENT_OUT: "⚙️ Ajuste (Salida)",
  VOID_RESTOCK: "🚫 Venta Anulada (Restock)",
  TRANSFER_OUT: "🔄 Transferencia (Salida)",
  TRANSFER_IN: "🔄 Transferencia (Entrada)",
}

function getDateRange(preset: string) {
  const now = new Date()
  if (preset === "today") return { from: startOfBoliviaDay(now), to: now }
  if (preset === "month") {
    const start = new Date(now)
    start.setMonth(start.getMonth() - 1)
    return { from: start, to: now }
  }
  if (preset === "all") return { from: new Date(0), to: now }
  // default: semana
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  return { from: start, to: now }
}

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; type?: string; q?: string }>
}) {
  const params = await searchParams
  const preset = params.preset || "week"
  const type = params.type || "ALL"
  const q = params.q?.trim() || ""
  const { from, to } = getDateRange(preset)
  const branchFilter = await getActiveBranchFilter()
  const showBranchColumn = branchFilter === ALL_BRANCHES

  const movements = await prisma.stockMovement.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...(branchFilter !== ALL_BRANCHES ? { branchId: branchFilter } : {}),
      ...(type !== "ALL" ? { type } : {}),
      ...(q
        ? {
            product: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      product: { select: { name: true, sku: true, unitType: true } },
      user: { select: { name: true } },
      batch: { select: { batchNumber: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  const totalIn = movements
    .filter((m) => m.quantity.isPositive())
    .reduce((sum, m) => sum.plus(new Decimal(m.quantity)), new Decimal(0))
  const totalOut = movements
    .filter((m) => m.quantity.isNegative())
    .reduce((sum, m) => sum.plus(new Decimal(m.quantity).abs()), new Decimal(0))

  const presetLink = (p: string) => `/inventory/kardex?preset=${p}&type=${type}${q ? `&q=${encodeURIComponent(q)}` : ""}`
  const typeLink = (t: string) => `/inventory/kardex?preset=${preset}&type=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Kardex de Inventario</h1>
            <p className="text-muted">Todos los movimientos de todos los productos, en una sola vista</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Inventario
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <Link href={presetLink("today")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "today" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Hoy</Link>
          <Link href={presetLink("week")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "week" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Última semana</Link>
          <Link href={presetLink("month")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "month" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Último mes</Link>
          <Link href={presetLink("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${preset === "all" ? "bg-primary text-white" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Todo</Link>

          <div className="w-px h-6 bg-border mx-1" />

          <Link href={typeLink("ALL")} className={`px-3 py-2 rounded-lg text-xs font-medium ${type === "ALL" ? "bg-primary-2 text-black" : "bg-surface backdrop-blur-md border border-border text-text"}`}>Todos los tipos</Link>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <Link key={key} href={typeLink(key)} className={`px-3 py-2 rounded-lg text-xs font-medium ${type === key ? "bg-primary-2 text-black" : "bg-surface backdrop-blur-md border border-border text-text"}`}>
              {label}
            </Link>
          ))}

          <form action="/inventory/kardex" method="get" className="ml-auto flex gap-2">
            <input type="hidden" name="preset" value={preset} />
            <input type="hidden" name="type" value={type} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar producto o SKU..."
              className="px-3 py-2 text-sm w-56"
            />
          </form>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Movimientos</p>
            <p className="text-3xl font-bold text-text">{movements.length}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total Entradas</p>
            <p className="text-3xl font-bold text-success">+{totalIn.toString()}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total Salidas</p>
            <p className="text-3xl font-bold text-danger">-{totalOut.toString()}</p>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 border-b-2 border-border">
                  <th className="px-4 py-3 text-left font-bold text-text">Fecha</th>
                  {showBranchColumn && <th className="px-4 py-3 text-left font-bold text-text">Sucursal</th>}
                  <th className="px-4 py-3 text-left font-bold text-text">Producto</th>
                  <th className="px-4 py-3 text-left font-bold text-text">Tipo</th>
                  <th className="px-4 py-3 text-center font-bold text-text">Antes</th>
                  <th className="px-4 py-3 text-center font-bold text-text">Movimiento</th>
                  <th className="px-4 py-3 text-center font-bold text-text">Después</th>
                  <th className="px-4 py-3 text-left font-bold text-text">Detalle</th>
                  <th className="px-4 py-3 text-left font-bold text-text">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov, idx) => (
                  <tr
                    key={mov.id}
                    className={`border-b border-border hover:bg-white/5 transition ${
                      idx % 2 === 0 ? "bg-surface backdrop-blur-md" : "bg-white/5"
                    }`}
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDateTime(mov.createdAt)}</td>
                    {showBranchColumn && <td className="px-4 py-3 text-muted">{mov.branch.name}</td>}
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{mov.product.name}</p>
                      <p className="text-xs text-muted">{mov.product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-text">{TYPE_LABELS[mov.type] || mov.type}</td>
                    <td className="px-4 py-3 text-center text-muted">{mov.qtyBefore.toString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg font-semibold ${
                          mov.quantity.isPositive() ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                        }`}
                      >
                        {mov.quantity.isPositive() ? "+" : ""}
                        {mov.quantity.toString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-text">{mov.qtyAfter.toString()}</td>
                    <td className="px-4 py-3 text-muted">
                      {mov.batch?.batchNumber && <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded mr-1">Lote: {mov.batch.batchNumber}</span>}
                      {mov.reason}
                    </td>
                    <td className="px-4 py-3 text-muted">{mov.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {movements.length === 0 && (
            <p className="text-center py-12 text-muted">No hay movimientos en este periodo con estos filtros.</p>
          )}
        </div>
      </div>
    </div>
  )
}
