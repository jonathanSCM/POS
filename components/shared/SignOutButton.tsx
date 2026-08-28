"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-lg transition font-medium text-sm"
    >
      Salir
    </button>
  )
}
