import Link from "next/link"

export default function InventoryHubPage() {
  const modules = [
    {
      id: "receive",
      title: "Recibir Mercancía",
      description: "Ingresar nuevos lotes",
      icon: "📥",
      href: "/inventory/receive",
    },
    {
      id: "alerts",
      title: "Alertas",
      description: "Vencimientos y stock bajo",
      icon: "🚨",
      href: "/inventory/alerts",
    },
    {
      id: "batches",
      title: "Lotes",
      description: "Ver todos los lotes",
      icon: "📦",
      href: "/inventory/batches",
    },
    {
      id: "movements",
      title: "Movimientos",
      description: "Trazabilidad completa",
      icon: "🔍",
      href: "/inventory/movements",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-bold text-black mb-3">Gestión de Inventario</h1>
            <p className="text-gray-600 text-lg">Selecciona un módulo para continuar</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="bg-white border border-gray-300 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-gray-400 transition cursor-pointer"
            >
              <div className="text-5xl mb-4">{module.icon}</div>
              <h2 className="text-xl font-bold text-black mb-2">{module.title}</h2>
              <p className="text-sm text-gray-600 mb-4">{module.description}</p>
              <div className="pt-4 border-t border-gray-200">
                <span className="text-xs font-semibold text-gray-500">Click para acceder →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
