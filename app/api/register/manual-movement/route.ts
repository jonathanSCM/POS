import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveBranchId } from "@/lib/branch-context"
import { NextResponse } from "next/server"
import Decimal from "decimal.js"

// Movimiento de caja que no viene de una venta, un abono de cliente ni un
// pago a proveedor -- ej. un retiro de efectivo, un gasto menor pagado en
// efectivo, o meter plata extra al cajon a mitad de turno.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, amount, note } = await request.json()

    if (type !== "PAID_IN" && type !== "PAID_OUT") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
    }
    if (!note || !note.trim()) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 })
    }
    const amountDec = new Decimal(amount || 0)
    if (amountDec.lte(0)) {
      return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 })
    }

    const branchId = await getActiveBranchId()
    const openSession = await prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN", branchId },
      orderBy: { openedAt: "desc" },
    })
    if (!openSession) {
      return NextResponse.json({ error: "No hay una caja abierta" }, { status: 400 })
    }

    const userId = (session.user as any).id as string

    const [, movement] = await prisma.$transaction([
      prisma.cashRegisterSession.update({
        where: { id: openSession.id },
        data: {
          expectedCash:
            type === "PAID_IN"
              ? { increment: amountDec.toString() }
              : { decrement: amountDec.toString() },
        },
      }),
      prisma.cashMovement.create({
        data: {
          sessionId: openSession.id,
          type,
          amount: amountDec.toString(),
          note: note.trim(),
          userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "CASH_MANUAL_MOVEMENT",
          userId,
          entityType: "CashRegisterSession",
          entityId: openSession.id,
          description: `Movimiento manual de caja (${type === "PAID_IN" ? "entrada" : "salida"}): ${note.trim()}`,
        },
      }),
    ])

    return NextResponse.json({ ...movement, amount: movement.amount.toString() })
  } catch (error) {
    console.error("Error registering manual cash movement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
