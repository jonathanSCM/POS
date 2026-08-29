import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authz"
import { toCsv } from "@/lib/csv"
import { NextResponse } from "next/server"

export async function GET() {
  const { error, status } = await requireRole(["ADMIN", "MANAGER"])
  if (error) return NextResponse.json({ error }, { status })

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  })

  const headers = [
    "sku",
    "barcode",
    "name",
    "description",
    "category",
    "costPrice",
    "salePrice",
    "stockQty",
    "minStockAlert",
    "unitType",
  ]

  const rows = products.map((p) => [
    p.sku,
    p.barcode || "",
    p.name,
    p.description || "",
    p.category?.name || "",
    p.costPrice.toString(),
    p.salePrice.toString(),
    p.stockQty.toString(),
    p.minStockAlert.toString(),
    p.unitType,
  ])

  const csv = toCsv(headers, rows)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
