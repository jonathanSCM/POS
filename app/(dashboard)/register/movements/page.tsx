import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { formatDateTime } from "@/lib/dates"
import { getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"
import Link from "next/link"
import Decimal from "decimal.js"

const TYPE_LABELS: Record<string, { label: string; positive: boolean }> = {
  SALE_CASH_IN: { label: "💵 Venta en efectivo", positive: true },
  PAID_IN: { label: "➕ Entrada manual", positive: true },
  PAID_OUT: { label: "➖ Salida manual", positive: false },
  REFUND_CASH_OUT: { label: "↩️ Devolución", positive: false },
}

export default async function CashMovementsPage() {
  const currency = await getCurrencySymbol()
  const branchFilter = await getActiveBranchFilter()

  const movements = await prisma.cashMovement.findMany({
    where: branchFilter === ALL_BRANCHES ? undefined : { session: { branchId: branchFilter } },
    include: {
      session: { select: { code: true, status: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Movimientos de Caja</h1>
            <p className="text-muted">Historial de entradas y salidas de efectivo (últimos 200)</p>
          </div>
          <Link href="/register" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Caja Registradora
          </Link>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-text">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Sesión</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Nota</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Usuario</th>
                <th className="px-4 py-3 text-right font-semibold text-text">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const info = TYPE_LABELS[m.type] || { label: m.type, positive: true }
                return (
                  <tr key={m.id} className="border-b border-border hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {m.session.code}
                      <span className="text-xs text-muted ml-1">
                        ({m.session.status === "OPEN" ? "abierta" : "cerrada"})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text">{info.label}</td>
                    <td className="px-4 py-3 text-muted">{m.note || "-"}</td>
                    <td className="px-4 py-3 text-muted">{m.user.name}</td>
                    <td className={`px-4 py-3 text-right font-bold ${info.positive ? "text-success" : "text-danger"}`}>
                      {info.positive ? "+" : "-"}{currency}{new Decimal(m.amount).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {movements.length === 0 && (
            <p className="text-center py-12 text-muted">Todavía no hay movimientos de caja registrados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
