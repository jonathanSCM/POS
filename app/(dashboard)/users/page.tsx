"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface User {
  id: string
  email: string
  name: string
  role: string
  active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "CASHIER" })
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "CASHIER", password: "" })
  const [editError, setEditError] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setCreateError("")

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()
      if (response.ok) {
        setNewUser({ email: "", name: "", password: "", role: "CASHIER" })
        await loadUsers()
      } else {
        setCreateError(data.error || "No se pudo crear el usuario")
      }
    } catch (error) {
      setCreateError("No se pudo crear el usuario")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      })

      if (response.ok) {
        await loadUsers()
      }
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditForm({ name: user.name, email: user.email, role: user.role, password: "" })
    setEditError("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError("")
  }

  const handleSaveEdit = async (id: string) => {
    setEditLoading(true)
    setEditError("")
    try {
      const body: Record<string, any> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      }
      if (editForm.password) body.password = editForm.password

      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingId(null)
        await loadUsers()
      } else {
        setEditError(data.error || "No se pudo guardar")
      }
    } catch (error) {
      setEditError("No se pudo guardar")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return
    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" })
      const data = await response.json()
      if (response.ok) {
        await loadUsers()
      } else {
        alert(data.error || "No se pudo eliminar")
      }
    } catch (error) {
      alert("No se pudo eliminar")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Usuarios</h1>
            <p className="text-gray-600">Gestiona los usuarios del sistema</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition">
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Crear usuario */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Nuevo Usuario</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {createError && (
                <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Nombre"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Contraseña (mín. 6 caracteres)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none"
                disabled={loading}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none"
                disabled={loading}
              >
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Gerente</option>
                <option value="CASHIER">Cajero</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
              >
                {loading ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>

          {/* Lista de usuarios */}
          <div className="lg:col-span-2 bg-white border border-gray-300 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Usuarios ({users.length})</h2>
            <div className="space-y-3 max-h-[32rem] overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {editingId === user.id ? (
                    <div className="space-y-3">
                      {editError && (
                        <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                          {editError}
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                      />
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="MANAGER">Gerente</option>
                        <option value="CASHIER">Cajero</option>
                      </select>
                      <input
                        type="password"
                        placeholder="Nueva contraseña (dejar en blanco para no cambiarla)"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(user.id)}
                          disabled={editLoading}
                          className="flex-1 px-3 py-2 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium"
                        >
                          {editLoading ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={editLoading}
                          className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={editLoading}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-black">{user.name || "(sin nombre)"}</p>
                        <p className="text-xs text-gray-600">{user.email || "(sin email)"}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {user.role === "ADMIN" ? "👑 Admin" : user.role === "MANAGER" ? "👔 Gerente" : "👨‍💼 Cajero"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="px-3 py-1 text-xs font-medium rounded bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.active)}
                          className={`px-3 py-1 text-xs font-medium rounded transition ${
                            user.active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {user.active ? "Activo" : "Inactivo"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
