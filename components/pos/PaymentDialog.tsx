"use client"

import { useCartStore } from "@/stores/cart-store"

interface PaymentDialogProps {
  onClose: () => void
  onComplete: () => void
}

export function PaymentDialog({ onClose, onComplete }: PaymentDialogProps) {
  const { getTotalAfterDiscount, payment, setPayment } = useCartStore()

  const total = getTotalAfterDiscount()

  const methods = [
    { value: "CASH" as const, label: "💵 Efectivo" },
    { value: "CARD" as const, label: "💳 Tarjeta" },
    { value: "QR" as const, label: "📱 Código QR" },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Método de Pago</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Total a pagar */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total a pagar:</p>
          <p className="text-3xl font-bold text-black">${total.toFixed(2)}</p>
        </div>

        {/* Seleccionar método */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-black text-sm">Selecciona un método</h3>
          {methods.map((method) => (
            <button
              key={method.value}
              onClick={() => setPayment({ method: method.value })}
              className={`w-full px-4 py-4 rounded-lg font-medium text-lg transition border-2 ${
                payment?.method === method.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300 hover:border-gray-400"
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
              ? "bg-green-600 hover:bg-green-700 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {payment ? `✓ Completar Venta (${payment.method})` : "Selecciona método"}
        </button>
      </div>
    </div>
  )
}
