import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  const modules = [
    {
      id: "pos",
      title: "Punto de Venta",
      description: "Realizar ventas",
      icon: "💳",
      href: "/pos",
      roles: ["ADMIN", "MANAGER", "CASHIER"],
    },
    {
      id: "inventory",
      title: "Inventario",
      description: "Gestionar stock y lotes",
      icon: "📦",
      href: "/inventory",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "products",
      title: "Productos",
      description: "Crear y editar productos",
      icon: "🏷️",
      href: "/products",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "sales",
      title: "Historial de Ventas",
      description: "Ver y devolver ventas",
      icon: "📋",
      href: "/sales",
      roles: ["ADMIN", "MANAGER", "CASHIER"],
    },
    {
      id: "register",
      title: "Caja Registradora",
      description: "Sesiones y corte de caja",
      icon: "💰",
      href: "/register",
      roles: ["ADMIN", "MANAGER", "CASHIER"],
    },
    {
      id: "suppliers",
      title: "Proveedores",
      description: "Gestionar proveedores",
      icon: "🚚",
      href: "/suppliers",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "reports",
      title: "Reportes",
      description: "Análisis y gráficos",
      icon: "📈",
      href: "/reports",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "categories",
      title: "Categorías",
      description: "Gestionar categorías",
      icon: "📂",
      href: "/categories",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "users",
      title: "Usuarios",
      description: "Gestionar usuarios",
      icon: "👥",
      href: "/users",
      roles: ["ADMIN"],
    },
    {
      id: "settings",
      title: "Configuración",
      description: "Ajustes del sistema",
      icon: "⚙️",
      href: "/settings",
      roles: ["ADMIN"],
    },
    {
      id: "audit",
      title: "Auditoría",
      description: "Registro de cambios",
      icon: "🔍",
      href: "/audit-log",
      roles: ["ADMIN"],
    },
  ]

  const filteredModules = modules.filter((m) => m.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-black mb-3">Bienvenido, {user.name}</h1>
          <p className="text-lg text-gray-600">Selecciona un módulo para comenzar</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition hover:-translate-y-1 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition bg-gray-100">
                {module.icon}
              </div>
              <h3 className="text-xl font-bold text-black mb-2">{module.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{module.description}</p>
              <div className="text-xs font-semibold text-gray-500">
                Click para acceder →
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 pt-12 border-t border-gray-300">
          <h2 className="text-2xl font-bold text-black mb-8">Resumen Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatBox title="Hoy" value="$0.00" subtitle="Total de ventas" />
            <StatBox title="Productos" value="4" subtitle="En el sistema" />
            <StatBox title="Stock Bajo" value="2" subtitle="Productos bajo mínimo" />
            <StatBox title="Usuarios" value={user.role} subtitle="Tu rol" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
      <p className="text-gray-600 text-sm font-semibold mb-2">{title}</p>
      <p className="text-4xl font-bold text-black mb-1">{value}</p>
      <p className="text-gray-600 text-xs">{subtitle}</p>
    </div>
  )
}
