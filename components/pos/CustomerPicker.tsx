"use client"

import { useState, useEffect } from "react"
import { useCartStore } from "@/stores/cart-store"
import { searchCustomers, createCustomer } from "@/app/actions/customers"

interface CustomerResult {
  id: string
  name: string
  phone: string
  taxId: string | null
}

export function CustomerPicker() {
  const { customer, setCustomer } = useCartStore()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CustomerResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newTaxId, setNewTaxId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    const timeout = setTimeout(async () => {
      const found = await searchCustomers(query)
      setResults(found)
      setIsOpen(true)
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = (c: CustomerResult) => {
    setCustomer({ id: c.id, name: c.name, phone: c.phone, taxId: c.taxId || undefined })
    setQuery("")
    setIsOpen(false)
  }

  const handleCreate = async () => {
    setError("")
    if (!newName.trim() || !newPhone.trim()) {
      setError("Nombre y teléfono son requeridos")
      return
    }
    setIsSaving(true)
    try {
      const created = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        taxId: newTaxId.trim() || undefined,
      })
      setCustomer({ id: created.id, name: created.name, phone: created.phone, taxId: created.taxId || undefined })
      setShowCreate(false)
      setNewName("")
      setNewPhone("")
      setNewTaxId("")
    } catch (err: any) {
      setError(err.message || "Error al crear cliente")
    } finally {
      setIsSaving(false)
    }
  }

  if (customer) {
    return (
      <div className="bg-white/5 border border-border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted">Cliente:</p>
            <p className="font-semibold text-text">{customer.name}</p>
            {customer.phone && <p className="text-xs text-muted">{customer.phone}</p>}
            {customer.taxId && <p className="text-xs text-muted">NIT: {customer.taxId}</p>}
          </div>
          <button
            onClick={() => setCustomer(null)}
            className="text-danger hover:text-red-800 text-sm font-medium"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  if (showCreate) {
    return (
      <div className="space-y-3 bg-white/5 border border-border rounded-lg p-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <input
          type="text"
          placeholder="Nombre *"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-4 py-2 text-text placeholder-muted"
          disabled={isSaving}
        />
        <input
          type="text"
          placeholder="Teléfono *"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="w-full px-4 py-2 text-text placeholder-muted"
          disabled={isSaving}
        />
        <input
          type="text"
          placeholder="NIT / Documento (opcional)"
          value={newTaxId}
          onChange={(e) => setNewTaxId(e.target.value)}
          className="w-full px-4 py-2 text-text placeholder-muted"
          disabled={isSaving}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(false)}
            className="btn-ghost flex-1 py-2 text-sm font-medium"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
          >
            {isSaving ? "Guardando..." : "Guardar Cliente"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-2">
      <input
        type="text"
        placeholder="Buscar cliente por nombre, teléfono o NIT..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setIsOpen(true)}
        className="w-full px-4 py-2 text-text placeholder-muted"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface backdrop-blur-md border border-border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-border last:border-0 transition"
            >
              <div className="font-medium text-text">{c.name}</div>
              <div className="text-xs text-muted">{c.phone}{c.taxId ? ` • NIT: ${c.taxId}` : ""}</div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-3 text-center text-muted text-sm">Sin resultados</div>
          )}
        </div>
      )}

      <button
        onClick={() => { setShowCreate(true); setIsOpen(false) }}
        className="w-full px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium text-sm transition"
      >
        + Nuevo Cliente
      </button>
    </div>
  )
}
