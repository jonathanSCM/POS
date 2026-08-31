"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Branch {
  id: string
  name: string
}

export default function BranchSwitcher({
  branches,
  activeBranchId,
  isAdmin,
}: {
  branches: Branch[]
  activeBranchId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isChanging, setIsChanging] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value
    setIsChanging(true)
    try {
      await fetch("/api/branch/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      })
      router.refresh()
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <select
      value={activeBranchId}
      onChange={handleChange}
      disabled={isChanging}
      className="px-3 py-1.5 text-sm bg-white/10 border border-border rounded-lg text-text disabled:opacity-50"
      title="Sucursal activa"
    >
      {isAdmin && <option value="ALL">🏢 Todas las sucursales</option>}
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          📍 {b.name}
        </option>
      ))}
    </select>
  )
}
