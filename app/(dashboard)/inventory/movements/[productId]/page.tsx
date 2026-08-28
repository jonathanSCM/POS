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
      <div className="bg-white/5 rounded-lg p-8 text-center">
        <p className="text-muted">Este producto no tiene movimientos registrados</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-white/10 border-b-2 border-border">
            <th className="px-6 py-3 text-left text-sm font-bold text-text">Fecha</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-text">Tipo</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-text">Antes</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-text">Movimiento</th>
            <th className="px-6 py-3 text-center text-sm font-bold text-text">Después</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-text">Detalles</th>
            <th className="px-6 py-3 text-left text-sm font-bold text-text">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((mov, idx) => {
            const qtyBefore = mov.qtyAfter.minus(mov.quantity)
            return (
              <tr
                key={mov.id}
                className={`border-b border-border hover:bg-white/5 transition ${
                  idx % 2 === 0 ? "bg-surface backdrop-blur-md" : "bg-white/5"
                }`}
              >
                <td className="px-6 py-4 text-sm font-medium text-text">
                  {new Date(mov.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-text font-medium">
                  {typeLabels[mov.type] || mov.type}
                </td>
                <td className="px-6 py-4 text-center text-sm font-semibold text-muted">
                  {qtyBefore.toString()}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg font-semibold ${
                      mov.quantity.isPositive()
                        ? "bg-green-100 text-success"
                        : "bg-red-100 text-danger"
                    }`}
                  >
                    {mov.quantity.isPositive() ? "+" : ""}{mov.quantity.toString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-text">
                  {mov.qtyAfter.toString()}
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {mov.batch?.batchNumber && (
                    <div className="text-xs">
                      <span className="font-mono bg-white/15 px-2 py-1 rounded">
                        Lote: {mov.batch.batchNumber}
                      </span>
                    </div>
                  )}
                  {mov.reason && (
                    <div className="text-xs text-muted mt-1">
                      {mov.reason}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted">
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
      <div className="min-h-screen bg-surface backdrop-blur-md p-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted">Producto no encontrado</p>
          <Link href="/inventory/movements" className="text-primary-2 hover:underline mt-4 inline-block">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text mb-2">{product.name}</h1>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted">SKU</p>
                <p className="text-lg font-semibold text-text">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Stock Actual</p>
                <p className="text-lg font-semibold text-text">
                  {product.stockQty.toString()} {product.unitType}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted">Precio Costo</p>
                <p className="text-lg font-semibold text-text">${Number(product.costPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Precio Venta</p>
                <p className="text-lg font-semibold text-text">${Number(product.salePrice).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <Link
            href="/inventory/movements"
            className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
          >
            ← Atrás
          </Link>
        </div>

        {/* Movimientos */}
        <div className="bg-surface backdrop-blur-md rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-text mb-6">Historial de Movimientos</h2>
          <MovementsList productId={productId} />
        </div>
      </div>
    </div>
  )
}
