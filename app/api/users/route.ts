import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as bcrypt from "bcryptjs"
import { requireRole } from "@/lib/authz"

export async function GET() {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        defaultBranchId: true,
        branches: { select: { branchId: true } },
      },
    })

    return NextResponse.json(
      users.map((u) => ({ ...u, branchIds: u.branches.map((b) => b.branchId), branches: undefined }))
    )
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { email, name, password, role, branchIds, defaultBranchId } = await request.json()

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }
    // Un usuario no-ADMIN necesita al menos una sucursal asignada; ADMIN no
    // (tiene acceso implícito a todas).
    const ids: string[] = Array.isArray(branchIds) ? branchIds : []
    if (role !== "ADMIN" && ids.length === 0) {
      return NextResponse.json({ error: "Asigna al menos una sucursal" }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email: String(email).trim(),
        name: String(name).trim(),
        passwordHash: hash,
        role,
        active: true,
        defaultBranchId: defaultBranchId || ids[0] || null,
        branches: { create: ids.map((branchId: string) => ({ branchId })) },
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
