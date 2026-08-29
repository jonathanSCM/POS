import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "../rate-limit"

describe("rate limiting de login", () => {
  const key = "test@pos.local"

  afterEach(() => {
    clearAttempts(key)
    vi.useRealTimers()
  })

  it("permite el primer intento", () => {
    expect(checkRateLimit(key).allowed).toBe(true)
  })

  it("sigue permitiendo hasta 4 fallos", () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt(key)
    expect(checkRateLimit(key).allowed).toBe(true)
  })

  it("bloquea al llegar al 5º fallo", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt(key)
    const result = checkRateLimit(key)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("clearAttempts desbloquea inmediatamente (ej. tras login correcto)", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt(key)
    expect(checkRateLimit(key).allowed).toBe(false)

    clearAttempts(key)
    expect(checkRateLimit(key).allowed).toBe(true)
  })

  it("el bloqueo expira solo después de la ventana de lockout", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))

    for (let i = 0; i < 5; i++) recordFailedAttempt(key)
    expect(checkRateLimit(key).allowed).toBe(false)

    vi.setSystemTime(new Date("2026-01-01T00:14:59Z")) // 14:59 después, aún bloqueado
    expect(checkRateLimit(key).allowed).toBe(false)

    vi.setSystemTime(new Date("2026-01-01T00:15:01Z")) // 15:01 después, ya libre
    expect(checkRateLimit(key).allowed).toBe(true)
  })
})
