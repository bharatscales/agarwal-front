import { Button } from "@/components/ui/button"
import { homeActions } from "../constants"

type GeneralDashboardProps = {
  isPrintingUser: boolean
  onNavigate: (path: string) => void
}

export function GeneralDashboard({ isPrintingUser, onNavigate }: GeneralDashboardProps) {
  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Home Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Welcome to Production ERP
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl">
        {homeActions
          .filter(({ path, label }) => {
            if (isPrintingUser && (path === "/manufacturing/stock-entry" || label === "Stock")) {
              return false
            }
            return true
          })
          .map(({ label, icon: Icon, path }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 text-base"
              onClick={() => {
                if (path) onNavigate(path)
              }}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </Button>
          ))}
      </div>
    </div>
  )
}
