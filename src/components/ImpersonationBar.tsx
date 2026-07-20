import { useNavigate } from "react-router-dom"
import { VenetianMask, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

export const IMPERSONATION_BAR_HEIGHT = 36

export function ImpersonationBar() {
  const { user, impersonatedBy, exitImpersonation } = useAuth()
  const navigate = useNavigate()

  if (!impersonatedBy || !user) {
    return null
  }

  const handleExit = async () => {
    try {
      await exitImpersonation()
      navigate("/users", { replace: true })
    } catch {
      // Error already logged in AuthContext
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-9 items-center justify-between border-b border-orange-500/40 bg-orange-600 px-3 text-white shadow-md"
      style={{ height: IMPERSONATION_BAR_HEIGHT }}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <VenetianMask className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Viewing as <strong className="font-semibold">{user.username}</strong>
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 shrink-0 bg-white/95 px-2 text-xs text-orange-700 hover:bg-white"
        onClick={handleExit}
      >
        <X className="mr-1 h-3.5 w-3.5" />
        Exit Impersonate
      </Button>
    </div>
  )
}
