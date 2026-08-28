"use client"

import { useState, useEffect } from "react"
import { getProducts } from "@/app/actions/products"
import Decimal from "decimal.js"

interface Product {
  id: string
  name: string
  sku: string
  salePrice: string | Decimal
  unitType: string
  barcode?: string | null
}

interface ProductSearchProps {
  onAddProduct: (product: Product) => void
}

export function ProductSearch({
  onAddProduct,
}: ProductSearchProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    ;(async () => {
      const prods = await getProducts()
      setProducts(prods)
    })()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setFiltered([])
      setIsOpen(false)
      return
    }

    const q = query.toLowerCase()
    const results = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    )

    setFiltered(results)
    setIsOpen(true)
  }, [query, products])

  const handleSelect = (product: Product) => {
    onAddProduct(product)
    setQuery("")
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar producto por nombre, SKU o código de barras..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setIsOpen(true)}
        className="w-full px-4 py-3 border border-border rounded-lg text-text bg-surface backdrop-blur-md placeholder-muted focus:outline-none focus:border-primary-2 focus:ring-1 focus:ring-gray-400"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface backdrop-blur-md border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-border last:border-0 transition"
            >
              <div className="font-medium text-text">{product.name}</div>
              <div className="text-sm text-muted">
                SKU: {product.sku} • ${product.salePrice.toString()} • {product.unitType}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface backdrop-blur-md border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted">
          Sin resultados
        </div>
      )}
    </div>
  )
}
