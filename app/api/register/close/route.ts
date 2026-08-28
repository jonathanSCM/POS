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

    const { actualCash } = await request.json()

    const openSession = await prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    })

    if (!openSession) {
      return NextResponse.json({ error: "No open session" }, { status: 400 })
    }

    // Calcular discrepancia
    const actualCashDec = new Decimal(actualCash)
    const expectedCashDec = new Decimal(openSession.expectedCash || 0)
    const discrepancy = actualCashDec.minus(expectedCashDec)

    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: openSession.id },
      data: {
        status: "CLOSED",
        countedCash: actualCashDec,
        discrepancy: discrepancy,
        closedAt: new Date(),
      },
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        action: "REGISTER_DISCREPANCY",
        userId: (session.user as any).id,
        entityType: "CashRegisterSession",
        entityId: openSession.id,
        description: `Cierre de caja. Discrepancia: $${discrepancy.toFixed(2)}`,
      },
    })

    return NextResponse.json({
      ...closedSession,
      discrepancy: discrepancy.toString(),
    })
  } catch (error) {
    console.error("Error closing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
