import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrencySymbol } from "@/lib/settings"
import { getAccountsReceivableTotal } from "@/app/actions/customers"
import { getAccountsPayableTotal } from "@/app/actions/suppliers"
import { calculateLinesProfit } from "@/lib/profit"
import { startOfBoliviaDay, endOfBoliviaDay } from "@/lib/dates"
import { getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"
import Link from "next/link"
import Decimal from "decimal.js"

const REVENUE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED"] as const

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "💵 Efectivo",
  CARD: "💳 Tarjeta",
  QR: "📱 QR",
  TRANSFER: "🏦 Transferencia",
  CREDIT: "🧾 Crédito",
}

function pctChange(current: Decimal, previous: Decimal): Decimal | null {
  if (previous.lte(0)) return null
  return current.minus(previous).div(previous).times(100)
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const currency = await getCurrencySymbol()

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
      id: "customers",
      title: "Clientes",
      description: "Base de clientes e historial",
      icon: "🧑‍🤝‍🧑",
      href: "/customers",
      roles: ["ADMIN", "MANAGER", "CASHIER"],
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
      id: "branches",
      title: "Sucursales",
      description: "Gestionar sucursales y transferencias",
      icon: "🏢",
      href: "/branches",
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

  // ── Datos reales para "Resumen Rápido" (antes hardcodeados) ──
  // Todo se filtra por la sucursal activa; ADMIN puede estar viendo "todas"
  // (consolidado), en cuyo caso se omite el filtro de sucursal.
  const branchFilter = await getActiveBranchFilter()
  const branchWhere = branchFilter === ALL_BRANCHES ? {} : { branchId: branchFilter }

  const now = new Date()
  const todayStart = startOfBoliviaDay(now)
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayEnd = endOfBoliviaDay(yesterday)

  const lowStockQuery =
    branchFilter === ALL_BRANCHES
      ? prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM products p
          WHERE p.active = true
          AND COALESCE((SELECT SUM(qty) FROM product_stocks ps WHERE ps."productId" = p.id), 0) <= p."minStockAlert"
        `
      : prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM products p
          WHERE p.active = true
          AND COALESCE((SELECT qty FROM product_stocks ps WHERE ps."productId" = p.id AND ps."branchId" = ${branchFilter}), 0) <= p."minStockAlert"
        `

  const [productCount, lowStockRows, salesToday, salesYesterday] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    lowStockQuery,
    prisma.sale.findMany({ where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: todayStart, lte: now }, ...branchWhere }, select: { total: true } }),
    prisma.sale.findMany({ where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: yesterday, lte: yesterdayEnd }, ...branchWhere }, select: { total: true } }),
  ])
  const lowStockCount = Number(lowStockRows[0]?.count ?? 0)

  const totalToday = salesToday.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const totalYesterday = salesYesterday.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
  const todayVsYesterday = pctChange(totalToday, totalYesterday)

  const isManagement = user.role === "ADMIN" || user.role === "MANAGER"

  // ── Panel gerencial: solo Admin/Gerente ──
  let managementData: null | {
    monthTotal: Decimal
    monthCount: number
    avgTicket: Decimal
    monthVsPrevMonth: Decimal | null
    profit: Decimal
    receivable: string
    payable: string
    topProducts: { productName: string; qty: string }[]
    paymentBreakdown: { method: string; amount: Decimal }[]
  } = null

  if (isManagement) {
    const monthStart = new Date(now)
    monthStart.setDate(monthStart.getDate() - 30)
    const prevMonthStart = new Date(now)
    prevMonthStart.setDate(prevMonthStart.getDate() - 60)
    const prevMonthEnd = monthStart

    const [salesThisMonth, salesPrevMonth, receivable, payable, topProductsRaw, paymentsRaw] = await Promise.all([
      prisma.sale.findMany({
        where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: monthStart, lte: now }, ...branchWhere },
        include: { lines: true },
      }),
      prisma.sale.findMany({
        where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: prevMonthStart, lte: prevMonthEnd }, ...branchWhere },
        select: { total: true },
      }),
      getAccountsReceivableTotal(),
      getAccountsPayableTotal(),
      prisma.saleLine.groupBy({
        by: ["productName"],
        where: { sale: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: monthStart, lte: now }, ...branchWhere } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 3,
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { sale: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: monthStart, lte: now }, ...branchWhere } },
        _sum: { amount: true },
      }),
    ])

    const monthTotal = salesThisMonth.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))
    const prevMonthTotal = salesPrevMonth.reduce((sum, s) => sum.plus(new Decimal(s.total)), new Decimal(0))

    const soldProductIds = [...new Set(salesThisMonth.flatMap((s) => s.lines.map((l) => l.productId)))]
    const costByProductId = new Map(
      (
        await prisma.product.findMany({ where: { id: { in: soldProductIds } }, select: { id: true, costPrice: true } })
      ).map((p) => [p.id, new Decimal(p.costPrice)])
    )
    const allLines = salesThisMonth.flatMap((s) => s.lines)
    const profit = calculateLinesProfit(allLines, costByProductId)

    managementData = {
      monthTotal,
      monthCount: salesThisMonth.length,
      avgTicket: salesThisMonth.length > 0 ? monthTotal.div(salesThisMonth.length) : new Decimal(0),
      monthVsPrevMonth: pctChange(monthTotal, prevMonthTotal),
      profit,
      receivable: receivable.total,
      payable: payable.total,
      topProducts: topProductsRaw.map((p) => ({ productName: p.productName, qty: (p._sum.quantity || new Decimal(0)).toString() })),
      paymentBreakdown: paymentsRaw.map((p) => ({ method: p.method, amount: new Decimal(p._sum.amount || 0) })),
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-text mb-3 font-display">Bienvenido, {user.name}</h1>
          <p className="text-lg text-muted">Selecciona un módulo para comenzar</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="glass rounded-2xl p-6 shadow-theme hover:shadow-lg transition hover:-translate-y-1 cursor-pointer group hover:border-primary-2/50"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition glass-2">
                {module.icon}
              </div>
              <h3 className="text-xl font-bold text-text mb-2">{module.title}</h3>
              <p className="text-muted text-sm mb-4">{module.description}</p>
              <div className="text-xs font-semibold text-primary-2">
                Click para acceder →
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 pt-12 border-t border-border">
          <h2 className="text-2xl font-bold text-text mb-8 font-display">Resumen Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatBox
              title="Hoy"
              value={`${currency}${totalToday.toFixed(2)}`}
              subtitle="Total de ventas"
              trend={todayVsYesterday}
              trendLabel="vs. ayer"
            />
            <StatBox title="Productos" value={productCount.toString()} subtitle="En el sistema" />
            <StatBox title="Stock Bajo" value={lowStockCount.toString()} subtitle="Productos bajo mínimo" />
            <StatBox title="Usuarios" value={user.role} subtitle="Tu rol" />
          </div>
        </div>

        {/* Panel Gerencial: solo Admin/Gerente */}
        {isManagement && managementData && (
          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold text-text mb-2 font-display">Panel Gerencial</h2>
            <p className="text-sm text-muted mb-8">Últimos 30 días, comparado contra los 30 días anteriores</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatBox
                title="Ventas del Periodo"
                value={`${currency}${managementData.monthTotal.toFixed(2)}`}
                subtitle={`${managementData.monthCount} ventas`}
                trend={managementData.monthVsPrevMonth}
                trendLabel="vs. periodo anterior"
              />
              <StatBox title="Ticket Promedio" value={`${currency}${managementData.avgTicket.toFixed(2)}`} subtitle="Por venta" />
              <StatBox title="Ganancia Estimada" value={`${currency}${managementData.profit.toFixed(2)}`} subtitle="Precio venta − costo" accent="success" />
              <StatBox
                title="Cuentas Pendientes"
                value={`${currency}${new Decimal(managementData.receivable).toFixed(2)}`}
                subtitle="Por cobrar de clientes"
                accent={new Decimal(managementData.receivable).gt(0) ? "danger" : undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-2xl p-6">
                <p className="text-sm text-muted mb-2">Por Pagar a Proveedores</p>
                <p className={`text-3xl font-bold font-display ${new Decimal(managementData.payable).gt(0) ? "text-danger" : "text-text"}`}>
                  {currency}{new Decimal(managementData.payable).toFixed(2)}
                </p>
                <Link href="/suppliers" className="text-xs text-primary-2 hover:underline mt-2 inline-block">Ver proveedores →</Link>
              </div>
              <div className="glass rounded-2xl p-6">
                <p className="text-sm text-muted mb-2">Por Cobrar de Clientes</p>
                <p className={`text-3xl font-bold font-display ${new Decimal(managementData.receivable).gt(0) ? "text-danger" : "text-text"}`}>
                  {currency}{new Decimal(managementData.receivable).toFixed(2)}
                </p>
                <Link href="/customers" className="text-xs text-primary-2 hover:underline mt-2 inline-block">Ver clientes →</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-text mb-4">Productos Más Vendidos</h3>
                {managementData.topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {managementData.topProducts.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded-lg text-sm">
                        <span className="text-text">{p.productName}</span>
                        <span className="font-bold text-text">{p.qty} unid.</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm">Sin ventas en el periodo.</p>
                )}
              </div>
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-text mb-4">Ventas por Método de Pago</h3>
                {managementData.paymentBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {managementData.paymentBreakdown.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded-lg text-sm">
                        <span className="text-text">{PAYMENT_LABELS[p.method] || p.method}</span>
                        <span className="font-bold text-text">{currency}{p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm">Sin ventas en el periodo.</p>
                )}
              </div>
            </div>

            <Link href="/reports" className="text-sm text-primary-2 hover:underline mt-6 inline-block">
              Ver reportes completos →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  accent,
}: {
  title: string
  value: string
  subtitle: string
  trend?: Decimal | null
  trendLabel?: string
  accent?: "success" | "danger"
}) {
  return (
    <div className="glass rounded-2xl p-6 shadow-theme">
      <p className="text-muted text-sm font-semibold mb-2">{title}</p>
      <p className={`text-4xl font-bold mb-1 font-display ${accent === "danger" ? "text-danger" : accent === "success" ? "text-success" : "text-primary-2"}`}>
        {value}
      </p>
      <p className="text-muted text-xs">{subtitle}</p>
      {trend !== undefined && trend !== null && (
        <p className={`text-xs font-semibold mt-2 ${trend.gte(0) ? "text-success" : "text-danger"}`}>
          {trend.gte(0) ? "▲" : "▼"} {trend.abs().toFixed(1)}% {trendLabel}
        </p>
      )}
    </div>
  )
}
