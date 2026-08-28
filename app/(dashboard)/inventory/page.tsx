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
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-bold text-text mb-3">Gestión de Inventario</h1>
            <p className="text-muted text-lg">Selecciona un módulo para continuar</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white/15 hover:bg-white/20 text-text rounded-lg font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="bg-surface backdrop-blur-md border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-gray-400 transition cursor-pointer"
            >
              <div className="text-5xl mb-4">{module.icon}</div>
              <h2 className="text-xl font-bold text-text mb-2">{module.title}</h2>
              <p className="text-sm text-muted mb-4">{module.description}</p>
              <div className="pt-4 border-t border-border">
                <span className="text-xs font-semibold text-muted">Click para acceder →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
