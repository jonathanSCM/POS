import { Resend } from "resend"

let client: Resend | null = null
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
}

export async function sendEmail(data: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  const resend = getClient()
  const from = process.env.RESEND_FROM_EMAIL

  if (!resend || !from) {
    return { success: false, error: "RESEND_API_KEY o RESEND_FROM_EMAIL no configurados" }
  }

  try {
    const result = await resend.emails.send({
      from,
      to: data.to,
      subject: data.subject,
      html: data.html,
    })
    if (result.error) {
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al enviar el email" }
  }
}
