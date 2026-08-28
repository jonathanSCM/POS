import { getSaleByPublicToken } from "@/app/actions/sales"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { ReceiptContent } from "@/components/shared/ReceiptContent"
import { PublicReceiptPrintButton } from "./PublicReceiptPrintButton"
import { getCurrencySymbol } from "@/lib/settings"

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sale = (await getSaleByPublicToken(token)) as any

  if (!sale) {
    notFound()
  }

  const headersList = await headers()
  const host = headersList.get("host")
  const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
  const publicUrl = `${proto}://${host}/receipt/${token}`
  const currency = await getCurrencySymbol()

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 print:p-0 print:min-h-0">
      <div className="max-w-sm mx-auto">
        <div className="mb-6 text-center print:hidden">
          <h1 className="text-xl font-bold text-black">Factura Digital</h1>
        </div>

        <ReceiptContent sale={sale} publicUrl={publicUrl} currency={currency} />

        <div className="mt-8 flex justify-center print:hidden">
          <PublicReceiptPrintButton />
        </div>
      </div>
    </div>
  )
}
