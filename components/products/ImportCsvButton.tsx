"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface ImportResult {
  created: number
  updated: number
  errors: string[]
  totalRows: number
}

export function ImportCsvButton() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError("")
    setResult(null)

    try {
      const text = await file.text()
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al importar")
      } else {
        setResult(data)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "Error al leer el archivo")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
        id="csv-import-input"
        disabled={isImporting}
      />
      <label
        htmlFor="csv-import-input"
        className={`px-4 py-2.5 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition cursor-pointer inline-block ${
          isImporting ? "opacity-40 cursor-not-allowed" : ""
        }`}
      >
        {isImporting ? "Importando..." : "⬆️ Importar CSV"}
      </label>

      {(result || error) && (
        <div className="absolute right-0 mt-2 w-80 bg-surface backdrop-blur-md border border-border rounded-xl p-4 shadow-theme z-50 text-sm">
          {error && <p className="text-danger">{error}</p>}
          {result && (
            <>
              <p className="text-success font-semibold mb-1">
                {result.created} creados, {result.updated} actualizados de {result.totalRows} filas
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((e, idx) => (
                    <p key={idx} className="text-warning text-xs">{e}</p>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={() => { setResult(null); setError("") }}
            className="mt-3 text-xs text-muted hover:text-text"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
