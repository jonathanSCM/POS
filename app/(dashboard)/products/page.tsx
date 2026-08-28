import { getProducts } from "@/app/actions/products"
import { getCategories } from "@/app/actions/categories"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import Decimal from "decimal.js"

export default async function ProductsPage() {
  const products = await getProducts()
  const categories = await getCategories()

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Productos</h1>
          <p className="text-gray-600">Gestiona el catálogo de productos</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
          <Link
            href="/products/new"
            className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Precio Costo
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Precio Venta
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {product.category?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${Number(product.costPrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${Number(product.salePrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={new Decimal(product.stockQty).lte(new Decimal(product.minStockAlert)) ? "text-red-600 font-medium" : "text-gray-900"}>
                    {Number(product.stockQty).toFixed(0)} {product.unitType}
                  </span>
                  {new Decimal(product.stockQty).lte(new Decimal(product.minStockAlert)) && (
                    <span className="ml-2">⚠️</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="text-gray-600 hover:text-black font-medium transition"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/products/${product.id}/stock-adjust`}
                    className="text-gray-600 hover:text-black font-medium transition"
                  >
                    Ajustar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
          <p className="text-gray-600">No hay productos. Crea uno nuevo.</p>
        </div>
      )}
    </div>
  )
}
