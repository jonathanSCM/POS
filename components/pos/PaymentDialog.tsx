"use client"

import { useCartStore } from "@/stores/cart-store"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

interface PaymentDialogProps {
  onClose: () => void
  onComplete: () => void
}

export function PaymentDialog({ onClose, onComplete }: PaymentDialogProps) {
  const currency = useCurrencySymbol()
  const { getTotalAfterDiscount, payment, setPayment } = useCartStore()

  const total = getTotalAfterDiscount()

  const methods = [
    { value: "CASH" as const, label: "💵 Efectivo" },
    { value: "CARD" as const, label: "💳 Tarjeta" },
    { value: "QR" as const, label: "📱 Código QR" },
  ]

  return (
    <div className="fixed inset-0 bg-primary bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-surface backdrop-blur-md rounded-t-2xl p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Método de Pago</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Total a pagar */}
        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-border">
          <p className="text-sm text-muted mb-1">Total a pagar:</p>
          <p className="text-3xl font-bold text-text">{currency}{total.toFixed(2)}</p>
        </div>

        {/* Seleccionar método */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-text text-sm">Selecciona un método</h3>
          {methods.map((method) => (
            <button
              key={method.value}
              onClick={() => setPayment({ method: method.value })}
              className={`w-full px-4 py-4 rounded-lg font-medium text-lg transition border-2 ${
                payment?.method === method.value
                  ? "bg-primary text-white border-black"
                  : "bg-surface backdrop-blur-md text-text border-border hover:border-gray-400"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>

        {/* Botón completar */}
        <button
          onClick={onComplete}
          disabled={!payment}
          className={`w-full px-4 py-3 rounded-lg font-bold text-white transition ${
            payment
              ? "bg-success hover:brightness-110 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {payment ? `✓ Completar Venta (${payment.method})` : "Selecciona método"}
        </button>
      </div>
    </div>
  )
}
