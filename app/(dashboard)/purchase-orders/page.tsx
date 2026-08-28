import { getPurchaseOrders, receivePurchaseOrder } from "@/app/actions/purchase-orders"
import { revalidatePath } from "next/cache"
import Link from "next/link"

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders()

  async function handleReceive(id: string) {
    "use server"
    // Si falla (ej. producto ya no existe), el error se propaga y Next.js
    // muestra la página de error — mejor que tragárselo en silencio y dejar
    // al usuario sin saber si la recepción funcionó o no.
    await receivePurchaseOrder(id)
    revalidatePath("/purchase-orders")
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-text">Órdenes de Compra</h1>
        <Link
          href="/purchase-orders/new"
          className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg"
        >
          + Nueva OC
        </Link>
      </div>

      <div className="bg-surface backdrop-blur-md rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/5">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {order.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {order.supplier.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === "RECEIVED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status === "DRAFT" ? "Borrador" : "Recibida"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {order.lines.length} items
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {order.status === "DRAFT" && (
                    <form action={handleReceive.bind(null, order.id)} method="POST">
                      <button
                        type="submit"
                        className="text-success hover:text-success font-medium"
                      >
                        Recibir
                      </button>
                    </form>
                  )}
                  {order.status === "RECEIVED" && (
                    <span className="text-muted">Completada</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p>No hay órdenes de compra.</p>
        </div>
      )}
    </div>
  )
}
