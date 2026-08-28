"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/stores/cart-store"
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner"
import { createSale, holdSale, getHeldSales, cancelHeldSale } from "@/app/actions/sales"
import { getProducts } from "@/app/actions/products"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { CartLines } from "@/components/pos/CartLines"
import { CustomerPicker } from "@/components/pos/CustomerPicker"
import { SaleQrCode } from "@/components/shared/SaleQrCode"
import Decimal from "decimal.js"
import Link from "next/link"

interface CompletedSale {
  id: string
  code: string
  createdAt: string
  customerName: string | null | undefined
  subtotal: string
  total: string
  paymentMethod: "CASH" | "CARD" | "QR" | "TRANSFER"
  isInvoiced: boolean
  invoiceNumber: number | null
  customerTaxId: string | null
  customerBusinessName: string | null
  publicToken: string | null
  lines: Array<{
    id: string
    productName: string
    quantity: number
    unitPrice: string
    lineTotal: string
  }>
}

export default function POSPage() {
  const { data: session } = useSession()
  const {
    lines,
    customer,
    clear,
    addLine,
    incrementLineQty,
    getTotalAfterDiscount,
    setHeldSaleId,
  } = useCartStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [heldSales, setHeldSales] = useState<any[]>([])
  const [showHeldSales, setShowHeldSales] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"CASH" | "CARD" | "QR" | "TRANSFER" | null>(null)
  const [isInvoiced, setIsInvoiced] = useState(false)
  const [customerTaxId, setCustomerTaxId] = useState("")
  const [customerBusinessName, setCustomerBusinessName] = useState("")

  useEffect(() => {
    ;(async () => {
      const sales = await getHeldSales()
      setHeldSales(sales)
    })()
  }, [])

  useBarcodeScanner((barcode) => {
    handleBarcodeScanned(barcode)
  })

  const handleBarcodeScanned = async (barcode: string) => {
    const products = await getProducts()
    const product = products.find((p) => p.sku === barcode || p.barcode === barcode)
    if (product) {
      handleAddProduct(product)
    }
  }

  const handleAddProduct = (product: any) => {
    const existingLine = lines.find((l) => l.productId === product.id)
    if (existingLine) {
      incrementLineQty(existingLine.id, new Decimal(1))
    } else {
      addLine({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: new Decimal(1),
        unitPrice: new Decimal(product.salePrice.toString()),
        discount: new Decimal(0),
        unitType: product.unitType,
      })
    }
  }

  const handleHoldSale = async () => {
    if (lines.length === 0) {
      alert("Carrito vacío")
      return
    }

    setIsProcessing(true)
    try {
      const held = await holdSale({
        customerName: customer?.name,
        lines: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity.toNumber(),
          unitPrice: l.unitPrice.toString(),
        })),
      })

      setHeldSaleId(held.id)
      alert("Venta puesta en espera")
      const sales = await getHeldSales()
      setHeldSales(sales)
      clear()
    } catch (error) {
      alert(`Error: ${(error as any).message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResumeSale = (sale: any) => {
    clear()
    setHeldSaleId(sale.id)

    if (sale.customerName) {
      useCartStore.setState({
        customer: {
          name: sale.customerName,
        },
      })
    }

    sale.lines.forEach((line: any) => {
      addLine({
        productId: line.productId,
        productName: line.productName,
        productSku: line.productSku || "",
        quantity: new Decimal(line.quantity),
        unitPrice: new Decimal(line.unitPrice),
        discount: new Decimal(0),
        unitType: "unidad",
      })
    })

    setShowHeldSales(false)
    alert("Venta reanudada")
  }

  const handleCancelHeldSale = async (saleId: string) => {
    if (!confirm("¿Estás seguro?")) return

    try {
      await cancelHeldSale(saleId)
      const sales = await getHeldSales()
      setHeldSales(sales)
      alert("Venta cancelada")
    } catch (error) {
      alert(`Error: ${(error as any).message}`)
    }
  }

  const handleCompleteSale = async () => {
    if (!selectedPaymentMethod) {
      alert("Selecciona un método de pago")
      return
    }

    if (lines.length === 0) {
      alert("Carrito vacío")
      return
    }

    if (isInvoiced && (!customerTaxId.trim() || !customerBusinessName.trim())) {
      alert("Para facturar, completa el NIT/documento y la razón social")
      return
    }

    setIsProcessing(true)
    try {
      const response = await createSale({
        customerName: customer?.name,
        cashierId: (session?.user as any)?.id as string,
        lines: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity.toNumber(),
          unitPrice: l.unitPrice.toString(),
        })),
        paymentMethod: selectedPaymentMethod,
        total: getTotalAfterDiscount().toString(),
        isInvoiced,
        customerTaxId: isInvoiced ? customerTaxId.trim() : undefined,
        customerBusinessName: isInvoiced ? customerBusinessName.trim() : undefined,
      })

      const sale: CompletedSale = {
        id: response.id,
        code: response.code,
        createdAt: new Date(response.createdAt).toISOString(),
        customerName: response.customerName,
        subtotal: response.subtotal.toString(),
        total: response.total.toString(),
        paymentMethod: selectedPaymentMethod,
        isInvoiced: response.isInvoiced,
        invoiceNumber: response.invoiceNumber,
        customerTaxId: response.customerTaxId,
        customerBusinessName: response.customerBusinessName,
        publicToken: response.publicToken,
        lines: response.lines.map((l: any) => ({
          id: l.id,
          productName: l.productName,
          quantity: Number(l.quantity),
          unitPrice: l.unitPrice.toString(),
          lineTotal: l.lineTotal.toString(),
        })),
      }

      setCompletedSale(sale)
      clear()
      setSelectedPaymentMethod(null)
      setIsInvoiced(false)
      setCustomerTaxId("")
      setCustomerBusinessName("")
    } catch (error) {
      alert(`Error: ${(error as any).message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const total = getTotalAfterDiscount()

  if (completedSale) {
    return (
      <div className="min-h-screen bg-white p-8 print:min-h-0 print:p-0">
        <div className="max-w-2xl mx-auto">
          {/* Factura */}
          <div id="receipt" className="bg-white text-black border-4 border-black p-6 mb-8 font-mono text-sm max-w-2xl mx-auto">
            {/* Encabezado */}
            <div className="text-center mb-4 border-b-2 border-black pb-4">
              <h1 className="text-xl font-bold">POS SISTEMA</h1>
              <p className="text-xs">Factura de Venta</p>
            </div>

            {/* Info básica */}
            <div className="mb-4 border-b-2 border-black pb-3">
              <div className="flex justify-between mb-1">
                <span>Recibo:</span>
                <span className="font-bold">{completedSale.code}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Fecha:</span>
                <span>{new Date(completedSale.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" })} {new Date(completedSale.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {completedSale.customerName && (
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold">{completedSale.customerName}</span>
                </div>
              )}
              {completedSale.isInvoiced && (
                <>
                  <div className="flex justify-between mb-1">
                    <span>N° Factura:</span>
                    <span className="font-bold">{completedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Razón Social:</span>
                    <span className="font-bold">{completedSale.customerBusinessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NIT/Documento:</span>
                    <span className="font-bold">{completedSale.customerTaxId}</span>
                  </div>
                </>
              )}
            </div>

            {/* Productos */}
            <div className="mb-4">
              <div className="flex justify-between font-bold border-b border-black pb-2 mb-2">
                <span className="flex-1">Producto</span>
                <span className="w-12 text-center">Qty</span>
                <span className="w-16 text-right">Precio</span>
                <span className="w-20 text-right">Total</span>
              </div>
              {completedSale.lines.map((line) => (
                <div key={line.id} className="flex justify-between border-b border-gray-300 pb-2 mb-2">
                  <span className="flex-1">{line.productName}</span>
                  <span className="w-12 text-center">{line.quantity}</span>
                  <span className="w-16 text-right">${parseFloat(line.unitPrice).toFixed(2)}</span>
                  <span className="w-20 text-right">${parseFloat(line.lineTotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mb-4 border-t-2 border-b-2 border-black py-3">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${parseFloat(completedSale.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>${parseFloat(completedSale.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="text-center mb-4 pb-4 border-b-2 border-black">
              <p className="text-xs font-bold mb-1">Método de Pago</p>
              <p className="font-bold">
                {completedSale.paymentMethod === "CASH" && "💵 EFECTIVO"}
                {completedSale.paymentMethod === "CARD" && "💳 TARJETA"}
                {completedSale.paymentMethod === "QR" && "📱 QR"}
                {completedSale.paymentMethod === "TRANSFER" && "🏦 TRANSFERENCIA"}
              </p>
            </div>

            {/* Pie de página */}
            <div className="text-center">
              <p className="text-xs mb-1">¡Gracias por su compra!</p>
              <p className="text-xs">Vuelva pronto</p>
            </div>

            {completedSale.publicToken && typeof window !== "undefined" && (
              <div className="flex justify-center mt-4 pt-4 border-t border-black">
                <SaleQrCode value={`${window.location.origin}/receipt/${completedSale.publicToken}`} />
              </div>
            )}
          </div>

          {/* Botones - No se imprimen */}
          <div className="flex flex-col gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="w-full px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-bold text-lg"
            >
              🖨️ Imprimir Factura
            </button>
            <button
              onClick={() => setCompletedSale(null)}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
            >
              ✓ Nueva Venta
            </button>
            <Link
              href="/sales"
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg text-center"
            >
              📋 Historial de Ventas
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">Punto de Venta</h1>
          <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium">
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Búsqueda y carrito */}
          <div className="lg:col-span-2 space-y-6">
            <ProductSearch onAddProduct={handleAddProduct} />
            <CartLines />
          </div>

          {/* Right: Cliente y Pago */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-300 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-black mb-4">Cliente</h2>
              <CustomerPicker />
            </div>

            {/* Total y Pago */}
            <div className="bg-white border border-gray-300 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-black mb-4">Resumen</h2>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-black text-3xl">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Seleccionar Método de Pago */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-bold text-gray-700">Selecciona Método de Pago:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedPaymentMethod("CASH")}
                    className={`px-3 py-3 rounded-lg font-bold text-sm transition ${
                      selectedPaymentMethod === "CASH"
                        ? "bg-green-600 text-white border-2 border-green-800"
                        : "bg-gray-100 text-black border-2 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod("CARD")}
                    className={`px-3 py-3 rounded-lg font-bold text-sm transition ${
                      selectedPaymentMethod === "CARD"
                        ? "bg-blue-600 text-white border-2 border-blue-800"
                        : "bg-gray-100 text-black border-2 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    💳 Tarjeta
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod("QR")}
                    className={`px-3 py-3 rounded-lg font-bold text-sm transition ${
                      selectedPaymentMethod === "QR"
                        ? "bg-purple-600 text-white border-2 border-purple-800"
                        : "bg-gray-100 text-black border-2 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    📱 QR
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod("TRANSFER")}
                    className={`px-3 py-3 rounded-lg font-bold text-sm transition ${
                      selectedPaymentMethod === "TRANSFER"
                        ? "bg-amber-600 text-white border-2 border-amber-800"
                        : "bg-gray-100 text-black border-2 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    🏦 Transferencia
                  </button>
                </div>
              </div>

              {/* Facturación */}
              <div className="space-y-3 mb-6 border-t border-gray-300 pt-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInvoiced}
                    onChange={(e) => setIsInvoiced(e.target.checked)}
                    className="w-4 h-4"
                  />
                  ¿Venta con factura?
                </label>
                {isInvoiced && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Razón social"
                      value={customerBusinessName}
                      onChange={(e) => setCustomerBusinessName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                    />
                    <input
                      type="text"
                      placeholder="NIT / Documento"
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Botón Completar Venta */}
              <button
                onClick={handleCompleteSale}
                disabled={isProcessing || lines.length === 0 || !selectedPaymentMethod}
                className="w-full px-4 py-4 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition mb-6"
              >
                ✓ Completar Venta
              </button>

              {/* Acciones */}
              <div className="border-t border-gray-300 pt-6 space-y-3">
                <button
                  onClick={handleHoldSale}
                  disabled={isProcessing || lines.length === 0}
                  className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium"
                >
                  ⏸️ Poner en Espera ({heldSales.length})
                </button>
                {showHeldSales && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {heldSales.map((sale) => (
                      <div key={sale.id} className="flex justify-between items-center mb-2 p-2 bg-white rounded">
                        <span className="text-sm text-black">{sale.customerName || "Anónimo"}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResumeSale(sale)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                          >
                            Reanudar
                          </button>
                          <button
                            onClick={() => handleCancelHeldSale(sale.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowHeldSales(!showHeldSales)}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium text-sm"
                >
                  {showHeldSales ? "▼ Ocultar" : "▲ Ver Ventas en Espera"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
