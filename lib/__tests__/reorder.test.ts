import { describe, it, expect } from "vitest"
import { estimateReorder, needsReorderSoon } from "../reorder"

describe("estimateReorder", () => {
  it("calcula velocidad diaria y semanal a partir de lo vendido en el periodo", () => {
    // 70 unidades vendidas en 30 dias = 2.33/dia, ~16.33/semana
    const est = estimateReorder(50, 70, 30)
    expect(est.dailyVelocity.toFixed(2)).toBe("2.33")
    expect(est.weeklyVelocity.toFixed(2)).toBe("16.33")
  })

  it("calcula dias de stock restante = stock / velocidad diaria", () => {
    // 20 unidades vendidas en 10 dias = 2/dia. Con 30 en stock, quedan 15 dias.
    const est = estimateReorder(30, 20, 10)
    expect(est.daysRemaining?.toFixed(0)).toBe("15")
  })

  it("devuelve daysRemaining null si no hubo ventas en el periodo (no se puede estimar)", () => {
    const est = estimateReorder(30, 0, 30)
    expect(est.daysRemaining).toBeNull()
    expect(est.dailyVelocity.toFixed(2)).toBe("0.00")
  })

  it("devuelve daysRemaining null si el periodo es invalido", () => {
    const est = estimateReorder(30, 10, 0)
    expect(est.daysRemaining).toBeNull()
  })

  it("da 0 dias restantes si ya no queda stock pero sigue vendiendose", () => {
    const est = estimateReorder(0, 10, 10)
    expect(est.daysRemaining?.toFixed(0)).toBe("0")
  })
})

describe("needsReorderSoon", () => {
  it("true si los dias restantes son menores o iguales al umbral", () => {
    const est = estimateReorder(10, 20, 10) // 2/dia -> 5 dias restantes
    expect(needsReorderSoon(est, 7)).toBe(true)
    expect(needsReorderSoon(est, 3)).toBe(false)
  })

  it("false si no hay estimacion posible (sin ventas)", () => {
    const est = estimateReorder(10, 0, 10)
    expect(needsReorderSoon(est, 30)).toBe(false)
  })
})
