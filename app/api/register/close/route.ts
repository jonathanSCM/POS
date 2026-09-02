import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { getActiveBranchId } from "@/lib/branch-context"
import { notifyCashClosed, notifyCashDiscrepancy } from "@/lib/notifications/events"
import { NextResponse } from "next/server"
import Decimal from "decimal.js"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const branchId = await getActiveBranchId()
    const { actualCash } = await request.json()

    const openSession = await prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN", branchId },
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
    const currency = await getCurrencySymbol()
    await prisma.auditLog.create({
      data: {
        action: "REGISTER_DISCREPANCY",
        userId: (session.user as any).id,
        entityType: "CashRegisterSession",
        entityId: openSession.id,
        description: `Cierre de caja. Discrepancia: ${currency}${discrepancy.toFixed(2)}`,
      },
    })

    // Notificaciones (nunca bloquean la respuesta del cierre)
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    const branchName = branch?.name || branchId
    const payments = await prisma.payment.groupBy({
      by: ["method"],
      where: { sale: { registerSessionId: openSession.id } },
      _sum: { amount: true },
    })
    const totalSales = payments.reduce((sum, p) => sum.plus(new Decimal(p._sum.amount || 0)), new Decimal(0))
    const cashTotal = payments.find((p) => p.method === "CASH")?._sum.amount || 0
    const qrTotal = payments.find((p) => p.method === "QR")?._sum.amount || 0

    notifyCashClosed({
      sessionId: openSession.id,
      branchName,
      totalSales: totalSales.toFixed(2),
      cash: new Decimal(cashTotal).toFixed(2),
      qr: new Decimal(qrTotal).toFixed(2),
    })
    if (discrepancy.abs().gt(1)) {
      notifyCashDiscrepancy({
        sessionId: openSession.id,
        branchName,
        discrepancy: discrepancy.toFixed(2),
      })
    }

    return NextResponse.json({
      ...closedSession,
      discrepancy: discrepancy.toString(),
    })
  } catch (error) {
    console.error("Error closing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
