import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as bcrypt from "bcryptjs"
import { requireRole } from "@/lib/authz"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError, status: authStatus } = await requireRole(["ADMIN"])
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus })

  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, any> = {}

    if (typeof body.active === "boolean") data.active = body.active

    if (typeof body.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 })
      data.name = body.name.trim()
    }

    if (typeof body.email === "string") {
      const email = body.email.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Email inválido" }, { status: 400 })
      }
      data.email = email
    }

    if (typeof body.role === "string") {
      if (!["ADMIN", "MANAGER", "CASHIER"].includes(body.role)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
      }
      data.role = body.role
    }

    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
      }
      data.passwordHash = await bcrypt.hash(body.password, 10)
    }

    if (typeof body.defaultBranchId === "string" || body.defaultBranchId === null) {
      data.defaultBranchId = body.defaultBranchId || null
    }

    const effectiveRole = data.role ?? (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role
    if (Array.isArray(body.branchIds)) {
      const ids: string[] = body.branchIds
      if (effectiveRole !== "ADMIN" && ids.length === 0) {
        return NextResponse.json({ error: "Asigna al menos una sucursal" }, { status: 400 })
      }
      await prisma.userBranch.deleteMany({ where: { userId: id } })
      if (ids.length > 0) {
        await prisma.userBranch.createMany({
          data: ids.map((branchId) => ({ userId: id, branchId })),
          skipDuplicates: true,
        })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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

    return NextResponse.json({ ...user, branchIds: user.branches.map((b) => b.branchId), branches: undefined })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: authError, status: authStatus } = await requireRole(["ADMIN"])
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus })

  try {
    const { id } = await params

    if ((session!.user as any)?.id === id) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === "P2003" || error?.code === "P2014") {
      return NextResponse.json(
        { error: "No se puede eliminar: este usuario tiene ventas u otros registros asociados. Desactívalo en su lugar." },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
