import Decimal from "decimal.js"

export interface ReorderEstimate {
  dailyVelocity: Decimal
  weeklyVelocity: Decimal
  daysRemaining: Decimal | null // null = no se puede estimar (no hay ventas en el periodo)
}

// Cuanto se vendio por dia, en promedio, durante el periodo analizado, y
// cuantos dias de stock quedan al ritmo actual de venta. Funcion pura para
// poder testearla sin base de datos.
export function estimateReorder(
  stockQty: Decimal.Value,
  totalSoldInPeriod: Decimal.Value,
  periodDays: number
): ReorderEstimate {
  const sold = new Decimal(totalSoldInPeriod)
  const stock = new Decimal(stockQty)

  if (periodDays <= 0 || sold.lte(0)) {
    return { dailyVelocity: new Decimal(0), weeklyVelocity: new Decimal(0), daysRemaining: null }
  }

  const dailyVelocity = sold.div(periodDays)
  const weeklyVelocity = dailyVelocity.times(7)
  const daysRemaining = stock.div(dailyVelocity)

  return { dailyVelocity, weeklyVelocity, daysRemaining }
}

export function needsReorderSoon(estimate: ReorderEstimate, thresholdDays: number): boolean {
  return estimate.daysRemaining !== null && estimate.daysRemaining.lte(thresholdDays)
}
