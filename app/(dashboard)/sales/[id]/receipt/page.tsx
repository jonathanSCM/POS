import { getSaleById } from "@/app/actions/sales"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { ReceiptActions } from "./ReceiptActions"
import { ReceiptContent } from "@/components/shared/ReceiptContent"

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sale = (await getSaleById(id)) as any

  if (!sale) {
    notFound()
  }

  const headersList = await headers()
  const host = headersList.get("host")
  const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
  const publicUrl = sale.publicToken ? `${proto}://${host}/receipt/${sale.publicToken}` : null

  return (
    <div className="min-h-screen bg-white p-4 print:p-0 print:min-h-0">
      <div className="max-w-sm mx-auto bg-white">
        {/* Header no imprimir */}
        <div className="mb-8 print:hidden flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Recibo de Venta</h1>
          <Link href="/" className="text-gray-600 hover:text-black text-sm">
            ← Volver
          </Link>
        </div>

        <ReceiptContent sale={sale} publicUrl={publicUrl} />
      </div>

      {/* Botón de impresión (no se imprime) */}
      <ReceiptActions />
    </div>
  )
}
