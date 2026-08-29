"use client"

import { useState, useMemo } from "react"
import Decimal from "decimal.js"
import { getSubUnit } from "@/lib/units"
import { useCurrencySymbol } from "@/components/shared/CurrencyProvider"

interface QuantityPromptProps {
  productName: string
  unitType: string
  unitPrice: Decimal
  initialQuantity?: Decimal // en unidad base (kg/L)
  onConfirm: (quantityInBaseUnit: Decimal) => void
  onCancel: () => void
}

export function QuantityPrompt({
  productName,
  unitType,
  unitPrice,
  initialQuantity,
  onConfirm,
  onCancel,
}: QuantityPromptProps) {
  const currency = useCurrencySymbol()
  const subUnit = getSubUnit(unitType)
  const [mode, setMode] = useState<"base" | "sub">(
    initialQuantity && initialQuantity.lt(1) ? "sub" : "base"
  )
  const [value, setValue] = useState(() => {
    if (!initialQuantity) return ""
    if (mode === "sub" && subUnit) {
      return initialQuantity.times(subUnit.factor).toString()
    }
    return initialQuantity.toString()
  })

  if (!subUnit) return null

  const quantityInBase = useMemo(() => {
    const num = new Decimal(value || "0")
    if (num.isNaN() || num.lte(0)) return null
    return mode === "sub" ? num.div(subUnit.factor) : num
  }, [value, mode, subUnit])

  const estimatedPrice = quantityInBase ? quantityInBase.times(unitPrice) : null

  const handleModeSwitch = (newMode: "base" | "sub") => {
    if (newMode === mode) return
    const num = new Decimal(value || "0")
    if (!num.isNaN() && num.gt(0)) {
      const inBase = mode === "sub" ? num.div(subUnit.factor) : num
      const converted = newMode === "sub" ? inBase.times(subUnit.factor) : inBase
      setValue(converted.toString())
    }
    setMode(newMode)
  }

  const handleConfirm = () => {
    if (!quantityInBase) return
    onConfirm(quantityInBase)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-theme">
        <h3 className="text-lg font-bold text-text mb-1">{productName}</h3>
        <p className="text-sm text-muted mb-5">
          {currency}{unitPrice.toFixed(2)} por {subUnit.baseLabel}
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleModeSwitch("base")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "base" ? "bg-primary text-white" : "bg-white/10 text-muted hover:bg-white/15"
            }`}
          >
            {subUnit.baseLabel}
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("sub")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "sub" ? "bg-primary text-white" : "bg-white/10 text-muted hover:bg-white/15"
            }`}
          >
            {subUnit.subLabel}
          </button>
        </div>

        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "sub" ? `0 ${subUnit.subLabel}` : `0.000 ${subUnit.baseLabel}`}
          className="w-full px-4 py-3 text-center text-2xl font-bold"
        />

        <div className="mt-4 text-center text-sm text-muted min-h-[20px]">
          {quantityInBase && estimatedPrice ? (
            <>
              = {quantityInBase.toFixed(3)} {subUnit.baseLabel} · <span className="text-primary-2 font-semibold">{currency}{estimatedPrice.toFixed(2)}</span>
            </>
          ) : (
            "Ingresa una cantidad"
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost flex-1 py-2.5 font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!quantityInBase}
            className="btn-primary flex-1 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {initialQuantity ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  )
}
