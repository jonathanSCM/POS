import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildWorkbookBuffer } from "@/lib/excel"
import { getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"
import Decimal from "decimal.js"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : new Date(0)
  const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : new Date()
  const branchFilter = await getActiveBranchFilter()

  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
      ...(branchFilter !== ALL_BRANCHES ? { branchId: branchFilter } : {}),
    },
    include: { payments: true },
    orderBy: { createdAt: "asc" },
  })

  const rows = sales.map((s) => ({
    fecha: new Date(s.createdAt).toLocaleString("es-ES"),
    codigo: s.code,
    cliente: s.customerName || "",
    facturada: s.isInvoiced ? "Sí" : "No",
    numeroFactura: s.invoiceNumber || "",
    metodoPago: s.payments.map((p) => p.method).join(", "),
    total: new Decimal(s.total).toFixed(2),
  }))

  const buffer = await buildWorkbookBuffer("Ventas", [
    { header: "Fecha", key: "fecha", width: 22 },
    { header: "Código", key: "codigo", width: 25 },
    { header: "Cliente", key: "cliente", width: 25 },
    { header: "Facturada", key: "facturada", width: 12 },
    { header: "N° Factura", key: "numeroFactura", width: 12 },
    { header: "Método de Pago", key: "metodoPago", width: 18 },
    { header: "Total", key: "total", width: 14 },
  ], rows)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-ventas.xlsx"`,
    },
  })
}
