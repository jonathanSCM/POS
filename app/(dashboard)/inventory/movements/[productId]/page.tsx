import { getProducts } from "@/app/actions/products"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

async function MovementsList({ productId }: { productId: string }) {
  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      batch: true,
      sale: true,
      return: true,
      purchaseOrder: true,
    },
  })

  const typeLabels: Record<string, string> = {
    PURCHASE_IN: "Entrada (Compra)",
    SALE_OUT: "Salida (Venta)",
    RETURN_IN: "Devolución (Entrada)",
    ADJUSTMENT_IN: "Ajuste (Entrada)",
    ADJUSTMENT_OUT: "Ajuste (Salida)",
    VOID_RESTOCK: "Venta Anulada (Restock)",
  }

  if (movements.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">Este producto no tiene movimientos registrados</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-6 py-3 text-left text-sm font-bold text-black">Fecha</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-black">Tipo</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-black">Antes</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-black">Movimiento</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-black">Después</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-black">Detalles</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-black">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((mov, idx) => {
            const qtyBefore = mov.qtyAfter.minus(mov.quantity)
            return (
              <tr
                key={mov.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-6 py-4 text-sm font-medium text-black">
                  {new Date(mov.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-black font-medium">
                  {typeLabels[mov.type] || mov.type}
                </td>
                <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  {qtyBefore.toString()}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg font-semibold ${
                      mov.quantity.isPositive()
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {mov.quantity.isPositive() ? "+" : ""}{mov.quantity.toString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-black">
                  {mov.qtyAfter.toString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {mov.batch?.batchNumber && (
                    <div className="text-xs">
                      <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                        Lote: {mov.batch.batchNumber}
                      </span>
                    </div>
                  )}
                  {mov.reason && (
                    <div className="text-xs text-gray-600 mt-1">
                      {mov.reason}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {mov.user.name}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function ProductMovementsPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const products = await getProducts()
  const product = products.find((p) => p.id === productId)

  if (!product) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600">Producto no encontrado</p>
          <Link href="/inventory/movements" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">{product.name}</h1>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-gray-600">SKU</p>
                <p className="text-lg font-semibold text-black">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock Actual</p>
                <p className="text-lg font-semibold text-black">
                  {product.stockQty.toString()} {product.unitType}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio Costo</p>
                <p className="text-lg font-semibold text-black">${Number(product.costPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio Venta</p>
                <p className="text-lg font-semibold text-black">${Number(product.salePrice).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <Link
            href="/inventory/movements"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            ← Atrás
          </Link>
        </div>

        {/* Movimientos */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-black mb-6">Historial de Movimientos</h2>
          <MovementsList productId={productId} />
        </div>
      </div>
    </div>
  )
}
