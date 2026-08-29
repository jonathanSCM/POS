"use client"

import { useState } from "react"
import { useCartStore, CartLine } from "@/stores/cart-store"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"
import { QuantityPrompt } from "@/components/pos/QuantityPrompt"
import { hasSubUnit, getSubUnit } from "@/lib/units"
import Decimal from "decimal.js"

export function CartLines() {
  const currency = useCurrencySymbol()
  const [editingLine, setEditingLine] = useState<CartLine | null>(null)
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
      <div className="text-center py-12 text-muted">
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
            <tr className="bg-white/5 border-b border-border">
              <th className="px-4 py-2 text-left font-semibold text-text">Producto</th>
              <th className="px-4 py-2 text-center font-semibold text-text w-20">Cantidad</th>
              <th className="px-4 py-2 text-right font-semibold text-text w-24">Precio</th>
              <th className="px-4 py-2 text-right font-semibold text-text w-24">Descuento</th>
              <th className="px-4 py-2 text-right font-semibold text-text w-24">Total</th>
              <th className="px-4 py-2 text-center font-semibold text-text w-12"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const lineTotal = line.unitPrice
                .times(line.quantity)
                .minus(line.discount)

              return (
                <tr key={line.id} className="border-b border-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-text">{line.productName}</p>
                      <p className="text-xs text-muted">{line.productSku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {hasSubUnit(line.unitType) ? (
                      <button
                        onClick={() => setEditingLine(line)}
                        className="w-full px-2 py-1 bg-white/10 hover:bg-white/15 border border-border rounded text-center text-sm text-text transition"
                      >
                        {line.quantity.toFixed(3)} {getSubUnit(line.unitType)?.baseLabel} ✏️
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => incrementLineQty(line.id, new Decimal(-1))}
                          className="px-2 py-1 bg-white/15 hover:bg-white/20 text-text rounded text-sm font-bold transition"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          readOnly
                          value={line.quantity.toString()}
                          className="w-16 px-2 py-1 border border-border rounded text-center text-sm bg-white/10 text-text cursor-not-allowed"
                        />
                        <button
                          onClick={() => incrementLineQty(line.id, new Decimal(1))}
                          className="px-2 py-1 bg-white/15 hover:bg-white/20 text-text rounded text-sm font-bold transition"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text">
                    {currency}{line.unitPrice.toString()}
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
                      className="w-full px-2 py-1 border border-border rounded text-right text-sm bg-surface backdrop-blur-md text-text focus:outline-none focus:border-primary-2"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text">
                    {currency}{lineTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-danger hover:text-red-800 font-semibold transition"
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
      <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal:</span>
          <span className="font-medium text-text">{currency}{totalBefore.toFixed(2)}</span>
        </div>
        {totalDiscount.gt(0) && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">Descuentos:</span>
            <span className="font-medium text-danger">-{currency}{totalDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-semibold text-text">Total:</span>
          <span className="text-xl font-bold text-text">{currency}{totalAfter.toFixed(2)}</span>
        </div>
      </div>

      {editingLine && (
        <QuantityPrompt
          productName={editingLine.productName}
          unitType={editingLine.unitType}
          unitPrice={editingLine.unitPrice}
          initialQuantity={editingLine.quantity}
          onConfirm={(qty) => {
            updateLineQty(editingLine.id, qty)
            setEditingLine(null)
          }}
          onCancel={() => setEditingLine(null)}
        />
      )}
    </div>
  )
}
