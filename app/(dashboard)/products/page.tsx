import { getProducts } from "@/app/actions/products"
import { getCategories } from "@/app/actions/categories"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import Decimal from "decimal.js"

export default async function ProductsPage() {
  const products = await getProducts()
  const categories = await getCategories()
  const currency = await getCurrencySymbol()

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Productos</h1>
          <p className="text-muted">Gestiona el catálogo de productos</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
          <Link
            href="/products/new"
            className="px-6 py-2.5 bg-primary hover:brightness-110 text-white rounded-lg font-medium transition"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="glass rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-white/5 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Precio Costo
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Precio Venta
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-white/5 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                  {product.category?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                  {currency}{Number(product.costPrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                  {currency}{Number(product.salePrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={new Decimal(product.stockQty).lte(new Decimal(product.minStockAlert)) ? "text-danger font-medium" : "text-text"}>
                    {Number(product.stockQty).toFixed(0)} {product.unitType}
                  </span>
                  {new Decimal(product.stockQty).lte(new Decimal(product.minStockAlert)) && (
                    <span className="ml-2">⚠️</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="text-muted hover:text-text font-medium transition"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/products/${product.id}/stock-adjust`}
                    className="text-muted hover:text-text font-medium transition"
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
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-border">
          <p className="text-muted">No hay productos. Crea uno nuevo.</p>
        </div>
      )}
    </div>
  )
}
