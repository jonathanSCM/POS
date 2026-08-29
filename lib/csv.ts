// Parser/serializador de CSV sin dependencias externas (RFC 4180 básico:
// comillas dobles para escapar comas/saltos de línea/comillas dentro de un
// campo). Suficiente para import/export de catálogo de productos.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  // Normaliza saltos de línea de Windows antes de parsear
  const input = text.replace(/\r\n/g, "\n")

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""))
}

export function parseCsvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim()
    })
    return obj
  })
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map((h) => escapeCsvField(String(h))).join(",")]
  for (const row of rows) {
    lines.push(row.map((v) => escapeCsvField(String(v))).join(","))
  }
  return lines.join("\n")
}
