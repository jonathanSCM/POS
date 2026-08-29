import { describe, it, expect } from "vitest"
import { parseCsv, parseCsvToObjects, toCsv } from "../csv"

describe("parseCsv", () => {
  it("parsea filas simples separadas por coma", () => {
    const rows = parseCsv("a,b,c\n1,2,3")
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]])
  })

  it("respeta comas dentro de campos entre comillas", () => {
    const rows = parseCsv('sku,name\nA1,"Agua, Purificada 1L"')
    expect(rows[1]).toEqual(["A1", "Agua, Purificada 1L"])
  })

  it("des-escapa comillas dobles dentro de un campo entre comillas", () => {
    const rows = parseCsv('sku,name\nA1,"Botella de 12\\"\\""')
    // el campo original era: Botella de 12""  -> se des-escapa a Botella de 12"
    expect(rows[1][1]).toBe('Botella de 12"')
  })

  it("ignora líneas completamente vacías", () => {
    const rows = parseCsv("a,b\n1,2\n\n3,4")
    expect(rows).toEqual([["a", "b"], ["1", "2"], ["3", "4"]])
  })
})

describe("parseCsvToObjects", () => {
  it("usa la primera fila como encabezados", () => {
    const objs = parseCsvToObjects("sku,name,costPrice\nWATER-001,Agua,0.40")
    expect(objs).toEqual([{ sku: "WATER-001", name: "Agua", costPrice: "0.40" }])
  })

  it("devuelve string vacío para columnas faltantes en una fila", () => {
    const objs = parseCsvToObjects("sku,name,barcode\nA1,Producto")
    expect(objs[0]).toEqual({ sku: "A1", name: "Producto", barcode: "" })
  })
})

describe("toCsv", () => {
  it("hace round-trip con parseCsvToObjects", () => {
    const csv = toCsv(["sku", "name"], [["A1", "Agua, Mineral"], ["B2", 'Con "comillas"']])
    const parsed = parseCsvToObjects(csv)
    expect(parsed).toEqual([
      { sku: "A1", name: "Agua, Mineral" },
      { sku: "B2", name: 'Con "comillas"' },
    ])
  })
})
