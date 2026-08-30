import { getCustomerWithHistory } from "@/app/actions/customers"
import { getCurrencySymbol } from "@/lib/settings"
import { formatDateTime } from "@/lib/dates"
import { RegisterPaymentForm } from "@/components/customers/RegisterPaymentForm"
import { notFound } from "next/navigation"
import Link from "next/link"
import Decimal from "decimal.js"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomerWithHistory(id)
  const currency = await getCurrencySymbol()

  if (!customer) notFound()

  const totalSpent = customer.sales.reduce(
    (sum: Decimal, s: any) => sum.plus(new Decimal(s.total)),
    new Decimal(0)
  )
  const balance = new Decimal(customer.storeCreditBalance)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">{customer.name}</h1>
            <p className="text-muted">
              📱 {customer.phone}
              {customer.taxId && ` • NIT: ${customer.taxId}`}
              {customer.email && ` • ${customer.email}`}
            </p>
          </div>
          <Link href="/customers" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Clientes
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Total Comprado</p>
            <p className="text-3xl font-bold text-text">{currency}{totalSpent.toFixed(2)}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Cantidad de Compras</p>
            <p className="text-3xl font-bold text-text">{customer.sales.length}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted mb-2">Cliente desde</p>
            <p className="text-lg font-semibold text-text">{formatDateTime(customer.createdAt)}</p>
          </div>
          <div className={`glass rounded-2xl p-6 ${balance.lt(0) ? "border-danger/50" : balance.gt(0) ? "border-success/50" : ""}`}>
            <p className="text-sm text-muted mb-2">Cuenta Corriente</p>
            {balance.lt(0) ? (
              <p className="text-2xl font-bold text-danger">Debe {currency}{balance.abs().toFixed(2)}</p>
            ) : balance.gt(0) ? (
              <p className="text-2xl font-bold text-success">A favor {currency}{balance.toFixed(2)}</p>
            ) : (
              <p className="text-2xl font-bold text-text">Al día</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <RegisterPaymentForm customerId={customer.id} />

          <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-text">Historial de Abonos</h2>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {customer.payments.length === 0 ? (
                <p className="text-center py-12 text-muted">Todavía no hay abonos registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {customer.payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDateTime(p.createdAt)}</td>
                        <td className="px-4 py-3 text-text">{p.note || "-"}</td>
                        <td className="px-4 py-3 text-muted">{p.user.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-success">+{currency}{new Decimal(p.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text">Historial de Compras</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-text">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-text">Fecha</th>
                <th className="px-4 py-3 text-center font-semibold text-text">Artículos</th>
                <th className="px-4 py-3 text-center font-semibold text-text">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-text">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-text">Ver</th>
              </tr>
            </thead>
            <tbody>
              {customer.sales.map((s: any) => (
                <tr key={s.id} className="border-b border-border hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-mono text-text">{s.code}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-center text-text">{s.lines.length}</td>
                  <td className="px-4 py-3 text-center">
                    {s.paymentStatus === "PENDING" ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-danger/15 text-danger">🧾 Fiado</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/15 text-success">Pagado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-text">{currency}{new Decimal(s.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/sales/${s.id}/receipt`} className="text-primary-2 hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer.sales.length === 0 && (
            <p className="text-center py-12 text-muted">Este cliente todavía no tiene compras registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
