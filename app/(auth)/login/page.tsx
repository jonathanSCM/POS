"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/"
      })

      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background geometric accent */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40 bg-primary blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full translate-x-1/2 translate-y-1/2 opacity-30 bg-primary-2 blur-3xl"></div>

      <div className="relative w-full max-w-md glass rounded-2xl p-8 shadow-theme">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent">
              <span className="text-white text-2xl font-bold">POS</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-text mb-2 font-display">
            Punto de Venta
          </h1>
          <p className="text-muted font-light">
            Accede a tu sistema de ventas
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-danger/10 border border-danger/40 text-danger px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-text font-medium mb-3 text-sm">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 transition"
              placeholder="admin@pos.local"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-text font-medium mb-3 text-sm">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 transition"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary-2 transition"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 px-4 mt-8"
          >
            {isLoading ? "Iniciando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  )
}
