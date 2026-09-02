import { NextResponse } from "next/server"
import { requireRole } from "@/lib/authz"
import { NOTIFICATION_TYPES, getGroupedCatalog, getAllPreferences, setTypeEnabled } from "@/lib/notifications/preferences"

export async function GET() {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  const preferences = await getAllPreferences()
  return NextResponse.json({ types: NOTIFICATION_TYPES, groups: getGroupedCatalog(), preferences })
}

export async function PUT(request: Request) {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const validTypes = new Set(NOTIFICATION_TYPES.map((t) => t.type))

  for (const [type, enabled] of Object.entries(body)) {
    if (!validTypes.has(type)) continue
    await setTypeEnabled(type, Boolean(enabled))
  }

  return NextResponse.json({ success: true })
}
