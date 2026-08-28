import { NextRequest, NextResponse } from "next/server"

// Verificación inicial del webhook exigida por Meta al configurarlo
// en Meta for Developers > WhatsApp > Configuration.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// Punto de entrada para mensajes entrantes de WhatsApp.
// Por ahora solo registra el payload — la lógica de conversación del bot
// se implementará cuando se defina el flujo (Etapa 2).
export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log("[whatsapp webhook] payload recibido:", JSON.stringify(body))

  return NextResponse.json({ received: true })
}
