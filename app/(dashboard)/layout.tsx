import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/shared/SignOutButton"
import BranchSwitcher from "@/components/shared/BranchSwitcher"
import { CurrencyProvider } from "@/components/shared/CurrencyProvider"
import { getCurrencySymbol } from "@/lib/settings"
import { getUserBranches, getActiveBranchFilter, ALL_BRANCHES } from "@/lib/branch-context"

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
  const currencySymbol = await getCurrencySymbol()
  const branches = await getUserBranches()
  const activeBranchFilter = await getActiveBranchFilter()
  const showBranchSwitcher = user.role === "ADMIN" || branches.length > 1

  return (
    <CurrencyProvider symbol={currencySymbol}>
    <div className="min-h-screen print:min-h-0 print:bg-white">
      {/* Topbar */}
      <div className="glass-overlay sticky top-0 z-40 print:hidden">
        <div className="max-w-full mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-accent">
              <span className="text-white text-lg font-bold">POS</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text font-display">POS Sistema</h1>
              <p className="text-xs text-muted">{user.name} • {user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showBranchSwitcher && (
              <BranchSwitcher
                branches={branches}
                activeBranchId={activeBranchFilter === ALL_BRANCHES ? "ALL" : activeBranchFilter}
                isAdmin={user.role === "ADMIN"}
              />
            )}
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-73px)] print:min-h-0 print:bg-white">
        {children}
      </div>
    </div>
    </CurrencyProvider>
  )
}
