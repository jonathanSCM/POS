"use client"

export function ReceiptActions() {
  return (
    <div className="max-w-sm mx-auto mt-8 flex gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="flex-1 px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition"
      >
        🖨️ Imprimir
      </button>
      <button
        onClick={() => (window.location.href = "/")}
        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
      >
        ✓ Hecho
      </button>
    </div>
  )
}
