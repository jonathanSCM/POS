import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export type Role = "ADMIN" | "MANAGER" | "CASHIER"

/**
 * Verifica sesión y rol para un Route Handler (app/api/**\/route.ts).
 * Devuelve la sesión si el rol está permitido, o un objeto `{ error }`
 * con el status HTTP correcto para responder de inmediato.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, error: "Unauthorized", status: 401 as const }
  }
  const role = (session.user as any)?.role as Role
  if (!allowedRoles.includes(role)) {
    return { session: null, error: "No tienes permiso para esta acción", status: 403 as const }
  }
  return { session, error: null, status: 200 as const }
}

/**
 * Igual que requireRole, pero pensado para Server Actions ("use server"):
 * lanza un Error en vez de devolver una respuesta HTTP.
 */
export async function requireRoleAction(allowedRoles: Role[]) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("No autenticado")
  const role = (session.user as any)?.role as Role
  if (!allowedRoles.includes(role)) throw new Error("No tienes permiso para esta acción")
  return session
}
