import Decimal from "decimal.js"

export interface ProfitLine {
  productId: string
  quantity: Decimal.Value
  lineTotal: Decimal.Value
}

// Ganancia = precio de venta - costo actual del producto, por cada línea.
// Función pura (sin Prisma/DB) para poder testearla sin base de datos.
export function calculateLinesProfit(
  lines: ProfitLine[],
  costByProductId: Map<string, Decimal.Value>
): Decimal {
  return lines.reduce((sum, line) => {
    const rawCost = costByProductId.get(line.productId) ?? 0
    const cost = rawCost instanceof Decimal ? rawCost : new Decimal(rawCost)
    const lineCost = cost.times(new Decimal(line.quantity))
    return sum.plus(new Decimal(line.lineTotal).minus(lineCost))
  }, new Decimal(0))
}

export function calculateProfitMargin(totalProfit: Decimal, totalSales: Decimal): Decimal {
  if (totalSales.lte(0)) return new Decimal(0)
  return totalProfit.div(totalSales).times(100)
}
