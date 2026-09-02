import { NextResponse } from "next/server"
import { requireRole } from "@/lib/authz"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp"
import { sendEmail } from "@/lib/notifications/email"
import { renderEmailLayout } from "@/lib/notifications/email-template"

// Envia una notificacion de prueba contra el telefono/email guardados en
// Configuracion -- para verificar credenciales de Meta/Resend sin tener que
// esperar a que ocurra un evento real del negocio.
export async function POST(request: Request) {
  const { error, status } = await requireRole(["ADMIN"])
  if (error) return NextResponse.json({ error }, { status })

  const { channel, to } = await request.json()
  const settings = await prisma.storeSettings.findFirst()

  if (channel === "whatsapp") {
    const target = (to || settings?.notifyPhone || "").trim()
    if (!target) {
      return NextResponse.json({ error: "Escribe un número de WhatsApp (o guarda uno en Configuración)" }, { status: 400 })
    }
    // Requiere que la plantilla "prueba_notificacion" (1 variable) esté
    // creada y aprobada en Meta Business Manager -- ver NOTIFICACIONES.md.
    const result = await sendWhatsAppTemplate(target, "prueba_notificacion", [
      new Date().toLocaleString("es-BO"),
    ])
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ success: true })
  }

  if (channel === "email") {
    const target = (to || settings?.notifyEmail || "").trim()
    if (!target) {
      return NextResponse.json({ error: "Escribe un email (o guarda uno en Configuración)" }, { status: 400 })
    }
    const result = await sendEmail({
      to: target,
      subject: "✅ Notificación de prueba — POS Sistema",
      html: renderEmailLayout({
        storeName: settings?.storeName || "Mi Tienda",
        emoji: "✅",
        title: "Todo funcionando",
        mainText: "Si estás viendo esto con buen formato, tu configuración de email quedó lista para recibir notificaciones reales del sistema.",
        rows: [{ label: "Enviado", value: new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz" }) }],
      }),
    })
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Canal inválido" }, { status: 400 })
}
