import { SaleQrCode } from "./SaleQrCode"
import { formatDateTime, formatTime } from "@/lib/dates"

export function ReceiptContent({ sale, publicUrl, currency = "$" }: { sale: any; publicUrl?: string | null; currency?: string }) {
  const subtotal = ((sale.lines || []) as any[]).reduce((sum: number, line: any) => {
    return sum + Number(line.unitPrice) * Number(line.quantity)
  }, 0)

  return (
    <div className="max-w-sm mx-auto bg-white">
      {/* Contenido del recibo */}
      <div className="border-b border-gray-300 pb-4 mb-4">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-black">POS Sistema</h2>
          <p className="text-xs text-gray-600">Venta completada</p>
        </div>

        <div className="text-xs text-gray-700 text-center space-y-1">
          <p>
            <strong>Comprobante:</strong> {sale.code}
          </p>
          <p>
            <strong>Fecha:</strong>{" "}
            {formatDateTime(sale.createdAt)}
          </p>
          {sale.customerName && (
            <p>
              <strong>Cliente:</strong> {sale.customerName}
            </p>
          )}
          {sale.isInvoiced && (
            <>
              <p>
                <strong>N° Factura:</strong> {sale.invoiceNumber}
              </p>
              <p>
                <strong>Razón Social:</strong> {sale.customerBusinessName}
              </p>
              <p>
                <strong>NIT/Documento:</strong> {sale.customerTaxId}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Líneas de venta */}
      <div className="mb-4 border-b border-gray-300 pb-4">
        <table className="w-full text-xs mb-2">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 font-semibold">Producto</th>
              <th className="text-center py-1 font-semibold">Cant.</th>
              <th className="text-right py-1 font-semibold">Precio</th>
              <th className="text-right py-1 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line: any) => {
              const lineTotal = Number(line.unitPrice) * Number(line.quantity)
              return (
                <tr key={line.id} className="border-b border-gray-200">
                  <td className="py-1 text-left">{line.productName}</td>
                  <td className="py-1 text-center">{line.quantity.toString()}</td>
                  <td className="py-1 text-right">{currency}{Number(line.unitPrice).toFixed(2)}</td>
                  <td className="py-1 text-right font-medium">{currency}{lineTotal.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="space-y-2 text-xs font-medium mb-4 border-b border-gray-300 pb-4">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currency}{subtotal.toFixed(2)}</span>
        </div>
        {sale.total && (
          <div className="flex justify-between border-t border-gray-300 pt-2">
            <span className="font-bold text-sm">TOTAL:</span>
            <span className="font-bold text-sm">{currency}{Number(sale.total).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Métodos de pago */}
      {sale.payments?.length > 0 && (
        <div className="mb-4 border-b border-gray-300 pb-4 text-xs">
          <p className="font-semibold mb-2">Pagos:</p>
          {sale.payments.map((payment: any) => (
            <div key={payment.id} className="flex justify-between text-gray-700">
              <span>
                {payment.method === "CASH"
                  ? "Efectivo"
                  : payment.method === "CARD"
                  ? "Tarjeta"
                  : payment.method === "TRANSFER"
                  ? "Transferencia"
                  : payment.method === "QR"
                  ? "QR"
                  : "Crédito"}
              </span>
              <span>{currency}{Number(payment.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 space-y-1">
        <p>Gracias por su compra</p>
        <p>Vuelva pronto</p>
        <p className="text-gray-500 text-[10px]">
          {formatTime(sale.createdAt)}
        </p>
      </div>

      {publicUrl && (
        <div className="flex justify-center mt-4 pt-4 border-t border-gray-300">
          <SaleQrCode value={publicUrl} />
        </div>
      )}
    </div>
  )
}
