"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="btn-ghost px-4 py-2 font-medium text-sm"
    >
      Salir
    </button>
  )
}
