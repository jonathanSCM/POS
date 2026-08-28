"use client"

import { useCartStore, CartLine } from "@/stores/cart-store"
import Decimal from "decimal.js"

export function CartLines() {
  const {
    lines,
    removeLine,
    updateLineQty,
    incrementLineQty,
    updateLineDiscount,
    getTotalBeforeDiscount,
    getTotalDiscount,
    getTotalAfterDiscount,
  } = useCartStore()

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-lg">Carrito vacío</p>
        <p className="text-sm">Agrega productos para comenzar</p>
      </div>
    )
  }

  const totalBefore = getTotalBeforeDiscount()
  const totalDiscount = getTotalDiscount()
  const totalAfter = getTotalAfterDiscount()

  return (
    <div className="space-y-4">
      {/* Tabla de líneas */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Producto</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-900 w-20">Cantidad</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-900 w-24">Precio</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-900 w-24">Descuento</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-900 w-24">Total</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-900 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const lineTotal = line.unitPrice
                .times(line.quantity)
                .minus(line.discount)

              return (
                <tr key={line.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-black">{line.productName}</p>
                      <p className="text-xs text-gray-600">{line.productSku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => incrementLineQty(line.id, new Decimal(-1))}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded text-sm font-bold transition"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        readOnly
                        value={line.quantity.toString()}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm bg-gray-100 text-black cursor-not-allowed"
                      />
                      <button
                        onClick={() => incrementLineQty(line.id, new Decimal(1))}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded text-sm font-bold transition"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-black">
                    ${line.unitPrice.toString()}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.discount.toString()}
                      onChange={(e) =>
                        updateLineDiscount(line.id, new Decimal(e.target.value || "0"))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm bg-white text-black focus:outline-none focus:border-gray-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-black">
                    ${lineTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-red-600 hover:text-red-800 font-semibold transition"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-black">${totalBefore.toFixed(2)}</span>
        </div>
        {totalDiscount.gt(0) && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Descuentos:</span>
            <span className="font-medium text-red-600">-${totalDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-gray-300 pt-2 flex justify-between">
          <span className="font-semibold text-black">Total:</span>
          <span className="text-xl font-bold text-black">${totalAfter.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
