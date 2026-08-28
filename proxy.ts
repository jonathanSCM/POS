import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas de autenticación de NextAuth, el webhook de WhatsApp (lo llama Meta, sin sesión)
  // y la factura digital pública (accedida vía QR por el cliente, sin login)
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/receipt/")
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request })

  // Para todas las otras rutas, si no hay token, redirigir a login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|public).*)",
  ],
}
