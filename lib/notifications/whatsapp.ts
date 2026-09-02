import { toWhatsAppPhone } from "./phone"

const WHATSAPP_API_VERSION = "v21.0"

// Manda SIEMPRE un mensaje de plantilla ("template"), nunca texto libre:
// es la unica forma en que Meta permite que el negocio inicie una
// conversacion (fuera de las 24h de que el cliente escribio), y aplica
// tanto para clientes como para notificaciones al dueno. Las plantillas
// tienen que existir y estar aprobadas en Meta Business Manager con el
// mismo nombre y la misma cantidad de variables -- ver NOTIFICACIONES.md.
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[],
  languageCode = "es"
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados" }
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppPhone(to),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: `Meta API ${res.status}: ${body}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Error de red al llamar a la API de WhatsApp" }
  }
}
