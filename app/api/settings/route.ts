import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/authz"

const EDITABLE_FIELDS = [
  "storeName",
  "logoUrl",
  "currencySymbol",
  "taxRatePercent",
  "receiptFooterText",
  "receiptPaperWidth",
  "notifyPhone",
  "notifyEmail",
  "bigSaleThreshold",
  "bigAdjustmentThreshold",
  "creditTermDays",
  "whatsappEnabled",
  "emailEnabled",
] as const

export async function GET() {
  const { error, status } = await requireRole(["ADMIN", "MANAGER", "CASHIER"])
  if (error) return NextResponse.json({ error }, { status })

  try {
    const settings = await prisma.storeSettings.findFirst()
    return NextResponse.json(settings || {})
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()

    // Whitelist: nunca aceptar campos arbitrarios del cliente (ej. id, updatedAt)
    const data: Record<string, any> = {}
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field]
    }

    const existing = await prisma.storeSettings.findFirst()

    if (existing) {
      const updated = await prisma.storeSettings.update({
        where: { id: existing.id },
        data,
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.storeSettings.create({ data })
      return NextResponse.json(created)
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
