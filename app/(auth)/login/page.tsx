"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Background geometric accent */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gray-100 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full translate-x-1/2 translate-y-1/2 opacity-5"></div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">POS</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">
            Punto de Venta
          </h1>
          <p className="text-gray-600 font-light">
            Accede a tu sistema de ventas
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-black font-medium mb-3 text-sm">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition text-black placeholder-gray-400"
              placeholder="admin@pos.local"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-3 text-sm">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition text-black placeholder-gray-400"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 mt-8"
          >
            {isLoading ? "Iniciando..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Credentials Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">
            Demo • Credenciales de prueba
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Admin</p>
              <p className="text-xs font-mono text-black break-all">admin@pos.local</p>
              <p className="text-xs font-mono text-gray-600 mt-1">admin123</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Cajero</p>
              <p className="text-xs font-mono text-black break-all">cashier@pos.local</p>
              <p className="text-xs font-mono text-gray-600 mt-1">cashier123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
