import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createBranch, getBranches } from "@/app/actions/branches"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const branches = await getBranches()
  return NextResponse.json(branches)
}

export async function POST(request: Request) {
  try {
    const { name, address } = await request.json()
    const branch = await createBranch({ name, address })
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo crear la sucursal" }, { status: 400 })
  }
}
