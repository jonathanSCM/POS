import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentSession = await prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    })

    if (currentSession) {
      return NextResponse.json(currentSession)
    }

    return NextResponse.json(null)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
