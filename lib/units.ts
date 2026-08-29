// Productos con unitType KG o LITER se guardan y descuentan de stock en su
// unidad base (kg / L, como Decimal fraccionario -- ya soportado por el
// schema), pero en el mostrador muchas veces se vende en la sub-unidad
// (gramos / mililitros). Este helper solo hace la conversión de UI; el
// carrito y la base de datos siempre trabajan en la unidad base.

export interface SubUnitInfo {
  baseLabel: string
  subLabel: string
  factor: number // 1 unidad base = `factor` sub-unidades
}

const SUB_UNITS: Record<string, SubUnitInfo> = {
  KG: { baseLabel: "kg", subLabel: "g", factor: 1000 },
  LITER: { baseLabel: "L", subLabel: "ml", factor: 1000 },
}

export function getSubUnit(unitType: string): SubUnitInfo | null {
  return SUB_UNITS[unitType] || null
}

export function hasSubUnit(unitType: string): boolean {
  return unitType in SUB_UNITS
}
