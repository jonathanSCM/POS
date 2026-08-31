import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveBranchId } from "@/lib/branch-context"
import { NextResponse } from "next/server"
import Decimal from "decimal.js"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const branchId = await getActiveBranchId()
    const { openingFloat } = await request.json()
    const code = `CAJA-${Date.now()}`

    // Cerrar sesión anterior de ESTA sucursal si existe (alguien la dejó
    // abierta sin cerrarla formalmente) -- otras sucursales pueden tener su
    // propia caja abierta al mismo tiempo sin problema.
    await prisma.cashRegisterSession.updateMany({
      where: { status: "OPEN", branchId },
      data: { status: "CLOSED", closedAt: new Date() },
    })

    const newSession = await prisma.cashRegisterSession.create({
      data: {
        code,
        branchId,
        status: "OPEN",
        startingCash: new Decimal(openingFloat),
        expectedCash: new Decimal(openingFloat),
        openedById: (session.user as any).id,
      },
    })

    return NextResponse.json(newSession)
  } catch (error) {
    console.error("Error opening session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
