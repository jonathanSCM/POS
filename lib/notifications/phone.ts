// Normaliza un telefono guardado en la base (ej. "70123456", a veces ya con
// codigo de pais) al formato que exige la API de WhatsApp: solo digitos, con
// codigo de pais, sin "+". Bolivia (591) es el pais por defecto porque toda
// la app esta pensada para ese mercado.
export function toWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("591")) return digits
  if (digits.length === 8) return `591${digits}`
  return digits
}
