import { getProducts } from "@/app/actions/products"
import Link from "next/link"

export default async function MovementsPage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">Trazabilidad de Productos</h1>
            <p className="text-muted">Historial completo de movimientos (entradas y salidas)</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

        <div className="bg-surface backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
          <div className="divide-y divide-border">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/inventory/movements/${product.id}`}
                className="block p-6 hover:bg-white/5 transition border-b border-border last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-text mb-1">{product.name}</h3>
                    <p className="text-sm text-muted">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-text">{product.stockQty.toString()}</div>
                    <div className="text-xs text-muted uppercase font-medium">{product.unitType}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
