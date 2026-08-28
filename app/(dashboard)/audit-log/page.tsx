import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Auditoría</h1>
            <p className="text-gray-600">Registro de todas las acciones del sistema</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="bg-white border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Acción</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Usuario</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Entidad</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Descripción</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-black">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-black">
                      {actionLabels[log.action] || log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">{log.user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{log.entityType}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.description || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          Mostrando últimos {logs.length} registros
        </div>
      </div>
    </div>
  )
}
