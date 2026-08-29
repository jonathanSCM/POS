// Rate limiting simple en memoria para intentos de login.
// Alcanza para una sola instancia del contenedor (como corre hoy en Coolify);
// si el día de mañana se escala a varias réplicas, esto tendría que pasar
// a un store compartido (Redis) para que el límite aplique entre todas.

const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

interface AttemptEntry {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

const attempts = new Map<string, AttemptEntry>()

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry) return { allowed: true }

  if (entry.lockedUntil) {
    if (entry.lockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) }
    }
    attempts.delete(key)
    return { allowed: true }
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    attempts.delete(key)
    return { allowed: true }
  }

  return { allowed: true }
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now })
    return
  }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key)
}
