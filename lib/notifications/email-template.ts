// Plantilla HTML compartida para todos los emails de notificación. Los
// clientes de correo (Gmail incluido) ignoran <style> externo y a veces
// hasta <style> interno en algunos casos, así que todo va con estilos
// inline -- es la única forma confiable de que se vea igual en todos lados.

const PRIMARY = "#8b5cf6"
const ACCENT = "#c084fc"

export interface EmailDetailRow {
  label: string
  value: string
  // Resalta el valor (ej. montos importantes, discrepancias)
  emphasize?: boolean
}

export function renderEmailLayout(opts: {
  storeName: string
  emoji: string
  title: string
  mainText: string
  rows?: EmailDetailRow[]
  accentColor?: string
  // HTML libre (ej. una lista de productos) que va después de la tabla de
  // filas -- para casos que no entran en el formato label/valor.
  extraHtml?: string
}): string {
  const accent = opts.accentColor || PRIMARY

  const rowsHtml = (opts.rows || [])
    .map(
      (r, idx) => `
        <tr>
          <td style="padding:10px 0;${idx > 0 ? "border-top:1px solid #f0f0f0;" : ""}color:#6b7280;font-size:13px;">${r.label}</td>
          <td style="padding:10px 0;${idx > 0 ? "border-top:1px solid #f0f0f0;" : ""}text-align:right;font-weight:700;color:${r.emphasize ? accent : "#111827"};font-size:15px;">${r.value}</td>
        </tr>`
    )
    .join("")

  const now = new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz" })

  return `
<div style="margin:0;background:#f4f4f7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,${PRIMARY},${ACCENT});padding:24px 28px;">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">${opts.storeName}</p>
      <p style="margin:8px 0 0;color:#ffffff;font-size:21px;font-weight:700;line-height:1.3;">${opts.emoji} ${opts.title}</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 ${rowsHtml || opts.extraHtml ? "20" : "0"}px;color:#374151;font-size:15px;line-height:1.6;">${opts.mainText}</p>
      ${rowsHtml ? `<table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>` : ""}
      ${opts.extraHtml || ""}
    </div>
    <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">Notificación automática de tu sistema POS · ${now}</p>
    </div>
  </div>
</div>`
}
