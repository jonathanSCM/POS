"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const PAYMENT_COLORS: Record<string, string> = {
  CASH: "#2fe3a6",
  CARD: "#8b5cf6",
  QR: "#c084fc",
  TRANSFER: "#ffb020",
  CREDIT: "#fb7185",
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  QR: "QR",
  TRANSFER: "Transferencia",
  CREDIT: "Crédito",
}

export function SalesTrendChart({
  data,
  currency,
}: {
  data: { date: string; total: number }[]
  currency: string
}) {
  if (data.length === 0) {
    return <p className="text-muted text-sm py-12 text-center">No hay ventas en este periodo.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
        <XAxis dataKey="date" stroke="#dccff5" fontSize={12} />
        <YAxis stroke="#dccff5" fontSize={12} width={60} />
        <Tooltip
          contentStyle={{ background: "#241634", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, color: "#f6f2ff" }}
          formatter={(value: any) => [`${currency}${Number(value).toFixed(2)}`, "Ventas"]}
        />
        <Line type="monotone" dataKey="total" stroke="#2fe3a6" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PaymentMethodChart({
  data,
}: {
  data: { method: string; amount: number }[]
}) {
  if (data.length === 0) {
    return <p className="text-muted text-sm py-12 text-center">No hay ventas en este periodo.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="method"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.method} fill={PAYMENT_COLORS[entry.method] || "#8b5cf6"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#241634", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, color: "#f6f2ff" }}
          formatter={(value: any, _name: any, item: any) => [Number(value).toFixed(2), PAYMENT_LABELS[item.payload.method] || item.payload.method]}
        />
        <Legend
          formatter={(value: string) => PAYMENT_LABELS[value] || value}
          wrapperStyle={{ color: "#dccff5", fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
