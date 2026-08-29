import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { formatDateTime } from "@/lib/dates"
import Link from "next/link"
import Decimal from "decimal.js"

export default async function CashSessionsPage() {
  const currency = await getCurrencySymbol()

  const sessions = await prisma.cashRegisterSession.findMany({
    include: { openedBy: { select: { name: true } } },
    orderBy: { openedAt: "desc" },
    take: 100,
  })

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Historial de Sesiones de Caja</h1>
            <p className="text-muted">Quién entró, a qué hora, cuánto dinero encontró y cuánto dejó al cerrar</p>
          </div>
          <Link href="/register" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Caja Registradora
          </Link>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-text">Cajero</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Entrada</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Salida</th>
                <th className="px-4 py-3 text-right font-semibold text-text">Encontró</th>
                <th className="px-4 py-3 text-right font-semibold text-text">Dejó</th>
                <th className="px-4 py-3 text-right font-semibold text-text">Discrepancia</th>
                <th className="px-4 py-3 text-center font-semibold text-text">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const discrepancy = s.discrepancy ? new Decimal(s.discrepancy) : null
                return (
                  <tr key={s.id} className="border-b border-border hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-text font-medium">{s.openedBy.name}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDateTime(s.openedAt)}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {s.closedAt ? formatDateTime(s.closedAt) : <span className="text-primary-2">— sigue abierta</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-text">{currency}{new Decimal(s.startingCash).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-text">
                      {s.countedCash ? `${currency}${new Decimal(s.countedCash).toFixed(2)}` : "-"}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      discrepancy === null ? "text-muted" : discrepancy.isZero() ? "text-success" : "text-warning"
                    }`}>
                      {discrepancy !== null ? `${currency}${discrepancy.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.status === "OPEN" ? "bg-success/15 text-success" : "bg-white/10 text-muted"
                      }`}>
                        {s.status === "OPEN" ? "🟢 Abierta" : "🔴 Cerrada"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <p className="text-center py-12 text-muted">Todavía no se ha abierto ninguna sesión de caja.</p>
          )}
        </div>
      </div>
    </div>
  )
}
