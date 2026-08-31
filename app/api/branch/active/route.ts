import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ACTIVE_BRANCH_COOKIE, ALL_BRANCHES, getUserBranches } from "@/lib/branch-context"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { branchId } = await req.json()
  const role = (session.user as any)?.role as string

  const isAll = role === "ADMIN" && branchId === ALL_BRANCHES
  if (!isAll) {
    const branches = await getUserBranches()
    if (!branches.some((b) => b.id === branchId)) {
      return NextResponse.json({ error: "No tienes acceso a esa sucursal" }, { status: 403 })
    }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_BRANCH_COOKIE, branchId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  return NextResponse.json({ success: true })
}
