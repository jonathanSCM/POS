"use client"

export function PublicReceiptPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition"
    >
      🖨️ Imprimir
    </button>
  )
}
