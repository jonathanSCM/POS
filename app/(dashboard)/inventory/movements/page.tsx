import { getProducts } from "@/app/actions/products"
import Link from "next/link"

export default async function MovementsPage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Trazabilidad de Productos</h1>
            <p className="text-gray-600">Historial completo de movimientos (entradas y salidas)</p>
          </div>
          <Link href="/inventory" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Atrás
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/inventory/movements/${product.id}`}
                className="block p-6 hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-black mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-black">{product.stockQty.toString()}</div>
                    <div className="text-xs text-gray-600 uppercase font-medium">{product.unitType}</div>
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
