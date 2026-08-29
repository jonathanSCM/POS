import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Decimal from "decimal.js"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { openingFloat } = await request.json()
    const code = `CAJA-${Date.now()}`

    // Cerrar sesión anterior si existe (alguien la dejó abierta sin cerrarla
    // formalmente). Se le pone closedAt igual, si no el historial mostraría
    // una sesión "cerrada" sin hora de salida.
    await prisma.cashRegisterSession.updateMany({
      where: { status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    })

    const newSession = await prisma.cashRegisterSession.create({
      data: {
        code,
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
