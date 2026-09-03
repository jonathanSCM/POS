import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas de autenticación de NextAuth, el webhook de WhatsApp (lo llama Meta, sin sesión),
  // la factura digital pública (accedida vía QR por el cliente, sin login), y los archivos
  // estáticos de la PWA (manifest/service worker/iconos/offline.html): el navegador los pide
  // sin sesión para poder mostrar el prompt de "Instalar app" o precachearlos, así que si
  // quedan atrás del login el manifest nunca carga (el fetch da un redirect, no el JSON) y la
  // instalación de la PWA queda rota. Nota: el "public" del matcher de abajo NO excluye estos
  // archivos -- Next.js sirve todo lo de public/ en la raíz del sitio, no bajo /public.
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/receipt/") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png"
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
