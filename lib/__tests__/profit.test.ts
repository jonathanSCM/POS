import { describe, it, expect } from "vitest"
import Decimal from "decimal.js"
import { calculateLinesProfit, calculateProfitMargin } from "../profit"

describe("calculateLinesProfit", () => {
  it("suma ganancia = precio de venta - costo, por cada línea", () => {
    const lines = [
      { productId: "water", quantity: "4", lineTotal: "6.00" }, // 4 x $1.50
      { productId: "mouse", quantity: "1", lineTotal: "49.99" },
    ]
    const costs = new Map([
      ["water", new Decimal("0.40")],
      ["mouse", new Decimal("25")],
    ])

    const profit = calculateLinesProfit(lines, costs)

    // (6.00 - 4*0.40) + (49.99 - 25) = 4.40 + 24.99 = 29.39
    expect(profit.toFixed(2)).toBe("29.39")
  })

  it("trata un producto sin costo registrado como costo cero", () => {
    const lines = [{ productId: "unknown", quantity: "2", lineTotal: "10.00" }]
    const profit = calculateLinesProfit(lines, new Map())
    expect(profit.toFixed(2)).toBe("10.00")
  })

  it("devuelve cero con una lista vacía", () => {
    const profit = calculateLinesProfit([], new Map())
    expect(profit.toFixed(2)).toBe("0.00")
  })

  it("acepta el costo como string o number, no solo Decimal", () => {
    const lines = [{ productId: "a", quantity: "3", lineTotal: "9.00" }]
    const profit = calculateLinesProfit(lines, new Map([["a", "2"]]))
    // 9.00 - 3*2 = 3.00
    expect(profit.toFixed(2)).toBe("3.00")
  })
})

describe("calculateProfitMargin", () => {
  it("calcula el porcentaje sobre el total vendido", () => {
    const margin = calculateProfitMargin(new Decimal("29.39"), new Decimal("55.99"))
    expect(margin.toFixed(1)).toBe("52.5")
  })

  it("devuelve cero si no hubo ventas (evita división por cero)", () => {
    const margin = calculateProfitMargin(new Decimal("0"), new Decimal("0"))
    expect(margin.toFixed(1)).toBe("0.0")
  })
})
