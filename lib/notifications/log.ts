import { prisma } from "@/lib/prisma"

// Para eventos que no deben repetirse el mismo dia (ej. "stock bajo" del
// mismo producto no se manda de nuevo en cada venta que sigue debajo del
// minimo). El dedupKey ya incluye la fecha (ver events.ts), asi que "ya se
// notifico" simplemente significa "existe un SENT con esta key".
export async function wasNotifiedToday(dedupKey: string): Promise<boolean> {
  const existing = await prisma.notificationLog.findFirst({
    where: { dedupKey, status: "SENT" },
  })
  return existing !== null
}

export async function recordNotification(data: {
  type: string
  channel: "WHATSAPP" | "EMAIL"
  recipient: string
  entityType?: string
  entityId?: string
  dedupKey?: string
  status: "SENT" | "FAILED"
  error?: string
}) {
  try {
    await prisma.notificationLog.create({ data })
  } catch (err) {
    // Si ni siquiera se puede escribir el log, no hay mucho mas que hacer
    // que dejarlo en la consola -- nunca debe tumbar el flujo que llamo.
    console.error("[notifications] no se pudo registrar NotificationLog:", err)
  }
}
