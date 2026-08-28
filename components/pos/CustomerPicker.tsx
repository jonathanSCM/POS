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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">Cliente:</p>
            <p className="font-semibold text-black">{customer.name}</p>
          </div>
          <button
            onClick={() => setCustomer(null)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
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
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
      />
      <button
        onClick={handleSetCustomer}
        disabled={!customerName.trim()}
        className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
      >
        Agregar Cliente
      </button>
    </div>
  )
}
