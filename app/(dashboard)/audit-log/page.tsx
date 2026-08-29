import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDateTime } from "@/lib/dates"

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "ADMIN") {
    redirect("/")
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const actionLabels: Record<string, string> = {
    SALE_VOID: "❌ Venta Anulada",
    STOCK_ADJUSTMENT: "📦 Ajuste de Stock",
    PRICE_CHANGE: "💰 Cambio de Precio",
    REGISTER_DISCREPANCY: "💵 Discrepancia de Caja",
    USER_CREATED: "👤 Usuario Creado",
    PASSWORD_RESET: "🔑 Reseteo de Contraseña",
    RETURN_PROCESSED: "🔄 Devolución Procesada",
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Auditoría</h1>
            <p className="text-muted">Registro de todas las acciones del sistema</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="bg-surface backdrop-blur-md border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10 border-b-2 border-border">
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Acción</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Usuario</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Entidad</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Descripción</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-text">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-b border-border hover:bg-white/5 transition ${
                      idx % 2 === 0 ? "bg-surface backdrop-blur-md" : "bg-white/5"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-text">
                      {actionLabels[log.action] || log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-text">{log.user.name}</td>
                    <td className="px-6 py-4 text-sm text-muted font-mono">{log.entityType}</td>
                    <td className="px-6 py-4 text-sm text-muted">{log.description || "-"}</td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-muted">
          Mostrando últimos {logs.length} registros
        </div>
      </div>
    </div>
  )
}
