// Bolivia (America/La_Paz) es UTC-4 todo el año, sin horario de verano.
// El servidor (Coolify/Docker) corre en UTC, así que sin forzar timeZone
// explícito cada toLocaleString() muestra la hora del servidor, no la del
// negocio -- de ahí el desfase que se veía en pantalla.

const TIME_ZONE = "America/La_Paz"
const LOCALE = "es-BO"
const BOLIVIA_OFFSET_MS = 4 * 60 * 60 * 1000 // UTC-4, fijo (sin DST)

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function formatDateTimeShort(date: Date | string): string {
  return new Date(date).toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  })
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString(LOCALE, {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// Medianoche de "hoy" en hora de Bolivia, devuelta como instante UTC real
// (para usar directo en filtros de Prisma tipo createdAt: { gte, lte }).
export function startOfBoliviaDay(from: Date = new Date()): Date {
  const shifted = new Date(from.getTime() - BOLIVIA_OFFSET_MS)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() + BOLIVIA_OFFSET_MS)
}

// 23:59:59.999 de "hoy" en hora de Bolivia, como instante UTC real.
export function endOfBoliviaDay(from: Date = new Date()): Date {
  const shifted = new Date(from.getTime() - BOLIVIA_OFFSET_MS)
  shifted.setUTCHours(23, 59, 59, 999)
  return new Date(shifted.getTime() + BOLIVIA_OFFSET_MS)
}
