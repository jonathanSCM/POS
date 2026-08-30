import { getSupplierWithPurchaseOrders } from "@/app/actions/suppliers"
import { getCurrencySymbol } from "@/lib/settings"
import { PurchaseOrderRow } from "@/components/suppliers/PurchaseOrderRow"
import { notFound } from "next/navigation"
import Link from "next/link"
import Decimal from "decimal.js"

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplier = await getSupplierWithPurchaseOrders(id)
  const currency = await getCurrencySymbol()

  if (!supplier) notFound()

  const totalOwed = supplier.purchaseOrders
    .filter((po: any) => po.status === "RECEIVED")
    .reduce((sum: Decimal, po: any) => sum.plus(new Decimal(po.remaining)), new Decimal(0))

  const totalPurchased = supplier.purchaseOrders
    .filter((po: any) => po.status === "RECEIVED")
    .reduce((sum: Decimal, po: any) => sum.plus(new Decimal(po.totalAmount)), new Decimal(0))

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">{supplier.name}</h1>
            <p className="text-muted">
              {supplier.contactName && `${supplier.contactName} • `}
              {supplier.phone && `📱 ${supplier.phone}`}
              {supplier.email && ` • ${supplier.email}`}
            </p>
          </div>
          <Link href="/suppliers" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Proveedores
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total Comprado</p>
            <p className="text-3xl font-bold text-text">{currency}{totalPurchased.toFixed(2)}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Órdenes Recibidas</p>
            <p className="text-3xl font-bold text-text">
              {supplier.purchaseOrders.filter((po: any) => po.status === "RECEIVED").length}
            </p>
          </div>
          <div className={`glass rounded-2xl p-6 ${totalOwed.gt(0) ? "border-danger/50" : ""}`}>
            <p className="text-sm text-muted mb-2">Le Debemos</p>
            {totalOwed.gt(0) ? (
              <p className="text-2xl font-bold text-danger">{currency}{totalOwed.toFixed(2)}</p>
            ) : (
              <p className="text-2xl font-bold text-success">Al día</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text">Órdenes de Compra</h2>
          </div>
          {supplier.purchaseOrders.length === 0 ? (
            <p className="text-center py-12 text-muted">Todavía no hay órdenes de compra con este proveedor.</p>
          ) : (
            <div>
              {supplier.purchaseOrders.map((po: any) => (
                <PurchaseOrderRow key={po.id} po={po} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
