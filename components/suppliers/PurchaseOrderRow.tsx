"use client"

import { useState } from "react"
import Decimal from "decimal.js"
import { formatDateTime, formatDateOnly } from "@/lib/dates"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"
import { RegisterSupplierPaymentForm } from "./RegisterSupplierPaymentForm"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-danger/15 text-danger" },
  PARTIAL: { label: "Parcial", className: "bg-warning/15 text-warning" },
  PAID: { label: "Pagada", className: "bg-success/15 text-success" },
}

export function PurchaseOrderRow({ po }: { po: any }) {
  const currency = useCurrencySymbol()
  const [showForm, setShowForm] = useState(false)
  const status = STATUS_LABELS[po.paymentStatus] || STATUS_LABELS.PENDING
  const remaining = new Decimal(po.remaining)

  return (
    <div className="border-b border-border last:border-0 p-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-semibold text-text font-mono">{po.code}</p>
          <p className="text-xs text-muted">{formatDateTime(po.createdAt)}</p>
          {po.dueDate && (
            <p className="text-xs text-muted">Vence: {formatDateOnly(po.dueDate)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-text">{currency}{new Decimal(po.totalAmount).toFixed(2)}</p>
          {po.paidSoFar !== "0" && (
            <p className="text-xs text-muted">Pagado: {currency}{new Decimal(po.paidSoFar).toFixed(2)}</p>
          )}
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
      </div>

      {po.status === "RECEIVED" && po.paymentStatus !== "PAID" && (
        <div className="mt-3">
          {showForm ? (
            <RegisterSupplierPaymentForm
              purchaseOrderId={po.id}
              remaining={remaining.toString()}
              onDone={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="btn-ghost px-3 py-1.5 text-sm font-medium"
            >
              💰 Registrar Pago (falta {currency}{remaining.toFixed(2)})
            </button>
          )}
        </div>
      )}

      {po.status !== "RECEIVED" && (
        <p className="text-xs text-muted mt-2">
          {po.status === "DRAFT" ? "Aún no recibida — no genera deuda todavía" : "Cancelada"}
        </p>
      )}
    </div>
  )
}
