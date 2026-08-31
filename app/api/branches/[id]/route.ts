import { NextResponse } from "next/server"
import { updateBranch, deactivateBranch } from "@/app/actions/branches"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const branch = await updateBranch(id, body)
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo actualizar la sucursal" }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const branch = await deactivateBranch(id)
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo desactivar la sucursal" }, { status: 400 })
  }
}
