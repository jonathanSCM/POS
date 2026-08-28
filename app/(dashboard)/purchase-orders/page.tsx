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
        <h1 className="text-4xl font-bold text-gray-900">Órdenes de Compra</h1>
        <Link
          href="/purchase-orders/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Nueva OC
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
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
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Recibir
                      </button>
                    </form>
                  )}
                  {order.status === "RECEIVED" && (
                    <span className="text-gray-500">Completada</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No hay órdenes de compra.</p>
        </div>
      )}
    </div>
  )
}
