import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildWorkbookBuffer } from "@/lib/excel"
import Decimal from "decimal.js"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : new Date(0)
  const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : new Date()

  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", isInvoiced: true, createdAt: { gte: from, lte: to } },
    orderBy: { invoiceNumber: "asc" },
  })

  const rows = sales.map((s) => ({
    fecha: new Date(s.completedAt || s.createdAt).toLocaleDateString("es-ES"),
    numeroFactura: s.invoiceNumber || "",
    razonSocial: s.customerBusinessName || "",
    nit: s.customerTaxId || "",
    importe: new Decimal(s.total).toFixed(2),
  }))

  const buffer = await buildWorkbookBuffer("Reporte Contador", [
    { header: "Fecha", key: "fecha", width: 15 },
    { header: "N° Factura", key: "numeroFactura", width: 12 },
    { header: "Razón Social", key: "razonSocial", width: 30 },
    { header: "NIT", key: "nit", width: 18 },
    { header: "Importe", key: "importe", width: 14 },
  ], rows)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-contador.xlsx"`,
    },
  })
}
