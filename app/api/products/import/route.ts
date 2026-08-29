import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authz"
import { parseCsvToObjects } from "@/lib/csv"
import { productSchema } from "@/lib/validations"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { error, status } = await requireRole(["ADMIN", "MANAGER"])
  if (error) return NextResponse.json({ error }, { status })

  const text = await request.text()
  if (!text.trim()) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 })
  }

  const rows = parseCsvToObjects(text)
  if (rows.length === 0) {
    return NextResponse.json({ error: "El CSV no tiene filas de datos" }, { status: 400 })
  }

  const categories = await prisma.category.findMany()
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowLabel = `Fila ${i + 2} (sku: ${row.sku || "?"})`

    try {
      const categoryId = row.category
        ? categoryByName.get(row.category.trim().toLowerCase()) ?? null
        : null
      if (row.category && !categoryId) {
        errors.push(`${rowLabel}: categoría "${row.category}" no existe, se dejó sin categoría`)
      }

      const validated = productSchema.parse({
        sku: row.sku,
        barcode: row.barcode || undefined,
        name: row.name,
        description: row.description || undefined,
        categoryId,
        costPrice: row.costPrice,
        salePrice: row.salePrice,
        minStockAlert: row.minStockAlert || 0,
        unitType: row.unitType || "UNIT",
      })

      const existing = await prisma.product.findUnique({ where: { sku: validated.sku } })

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...validated,
            costPrice: new Prisma.Decimal(validated.costPrice),
            salePrice: new Prisma.Decimal(validated.salePrice),
            minStockAlert: new Prisma.Decimal(validated.minStockAlert),
          },
        })
        updated++
      } else {
        const stockQty = row.stockQty ? Number(row.stockQty) : 0
        await prisma.product.create({
          data: {
            ...validated,
            costPrice: new Prisma.Decimal(validated.costPrice),
            salePrice: new Prisma.Decimal(validated.salePrice),
            minStockAlert: new Prisma.Decimal(validated.minStockAlert),
            stockQty: new Prisma.Decimal(Number.isFinite(stockQty) ? stockQty : 0),
          },
        })
        created++
      }
    } catch (err: any) {
      const message =
        err?.issues?.map((i: any) => i.message).join(", ") || err?.message || "Error desconocido"
      errors.push(`${rowLabel}: ${message}`)
    }
  }

  return NextResponse.json({ created, updated, errors, totalRows: rows.length })
}
