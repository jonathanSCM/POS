import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const ACTIVE_BRANCH_COOKIE = "activeBranchId"

// Sentinel usado solo en reportes: "quiero ver todas las sucursales a la
// vez", nunca es un branchId real. Solo ADMIN puede usarlo.
export const ALL_BRANCHES = "ALL"

type SessionUser = { id: string; role: string }

function getSessionUser(session: any): SessionUser {
  const user = session?.user as any
  if (!session || !user?.id) throw new Error("No autenticado")
  return { id: user.id as string, role: user.role as string }
}

// Sucursales visibles/operables por el usuario actual: ADMIN ve todas las
// activas, MANAGER/CASHIER solo las que el ADMIN le haya asignado.
export async function getUserBranches() {
  const session = await getServerSession(authOptions)
  const user = getSessionUser(session)

  if (user.role === "ADMIN") {
    return prisma.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  }

  const userBranches = await prisma.userBranch.findMany({
    where: { userId: user.id, branch: { active: true } },
    include: { branch: true },
    orderBy: { branch: { name: "asc" } },
  })
  return userBranches.map((ub) => ub.branch)
}

// Resuelve la sucursal en la que el usuario esta operando ahora mismo.
// Nunca confia en un branchId que venga del cliente para acciones de
// venta/caja/stock -- siempre se llama esto del lado del servidor, igual
// que ya se hace con la caja abierta en app/actions/sales.ts.
export async function getActiveBranchId(): Promise<string> {
  const session = await getServerSession(authOptions)
  const user = getSessionUser(session)
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value

  if (user.role === "ADMIN") {
    if (cookieValue && cookieValue !== ALL_BRANCHES) {
      const branch = await prisma.branch.findUnique({ where: { id: cookieValue } })
      if (branch && branch.active) return branch.id
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.defaultBranchId) return dbUser.defaultBranchId
    const first = await prisma.branch.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } })
    if (!first) throw new Error("No hay ninguna sucursal creada todavia")
    return first.id
  }

  const branches = await getUserBranches()
  if (branches.length === 0) {
    throw new Error("Tu usuario no tiene ninguna sucursal asignada. Contacta al administrador.")
  }
  if (cookieValue && branches.some((b) => b.id === cookieValue)) {
    return cookieValue
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (dbUser?.defaultBranchId && branches.some((b) => b.id === dbUser.defaultBranchId)) {
    return dbUser.defaultBranchId
  }
  return branches[0].id
}

// Como getActiveBranchId, pero permite el sentinel "ALL" para reportes
// consolidados (solo ADMIN puede pedirlo).
export async function getActiveBranchFilter(): Promise<string | typeof ALL_BRANCHES> {
  const session = await getServerSession(authOptions)
  const user = getSessionUser(session)
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value

  if (user.role === "ADMIN" && cookieValue === ALL_BRANCHES) {
    return ALL_BRANCHES
  }
  return getActiveBranchId()
}

// Valida que la sesion actual tenga permiso para operar sobre una sucursal
// puntual (ej. recibir una transferencia en su sucursal de destino).
export async function requireBranchAccess(branchId: string) {
  const session = await getServerSession(authOptions)
  const user = getSessionUser(session)
  if (user.role === "ADMIN") return session

  const access = await prisma.userBranch.findUnique({
    where: { userId_branchId: { userId: user.id, branchId } },
  })
  if (!access) throw new Error("No tienes acceso a esa sucursal")
  return session
}
