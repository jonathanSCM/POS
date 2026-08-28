"use client"

import { useState } from "react"
import { useCartStore } from "@/stores/cart-store"

export function CustomerPicker() {
  const { customer, setCustomer } = useCartStore()
  const [customerName, setCustomerName] = useState("")

  const handleSetCustomer = () => {
    if (customerName.trim()) {
      setCustomer({
        name: customerName.trim(),
      })
      setCustomerName("")
    }
  }

  if (customer) {
    return (
      <div className="bg-white/5 border border-border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted">Cliente:</p>
            <p className="font-semibold text-text">{customer.name}</p>
          </div>
          <button
            onClick={() => setCustomer(null)}
            className="text-danger hover:text-red-800 text-sm font-medium"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Nombre del cliente (opcional)"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSetCustomer()}
        className="w-full px-4 py-2 border border-border rounded-lg text-text bg-surface backdrop-blur-md placeholder-muted focus:outline-none focus:border-primary-2 focus:ring-1 focus:ring-gray-400"
      />
      <button
        onClick={handleSetCustomer}
        disabled={!customerName.trim()}
        className="w-full px-4 py-2 bg-white/15 hover:bg-white/20 disabled:opacity-40 text-text rounded-lg font-medium transition"
      >
        Agregar Cliente
      </button>
    </div>
  )
}
