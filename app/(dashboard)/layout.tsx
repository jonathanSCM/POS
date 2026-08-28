import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/shared/SignOutButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const user = session.user as any

  return (
    <div className="min-h-screen bg-white print:min-h-0">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-full mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">POS</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">POS Sistema</h1>
              <p className="text-xs text-gray-600">{user.name} • {user.role}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-73px)] print:min-h-0">
        {children}
      </div>
    </div>
  )
}
