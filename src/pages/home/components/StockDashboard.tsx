import { BarChart3, Box } from "lucide-react"

import { Button } from "@/components/ui/button"
import { rmReportBlocks } from "../constants"

type StockDashboardProps = {
  onNavigate: (path: string) => void
}

export function StockDashboard({ onNavigate }: StockDashboardProps) {
  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Home Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Welcome to Production ERP
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mb-8">
        <Button
          type="button"
          variant="outline"
          className="h-24 flex flex-col items-center justify-center gap-2 text-base"
          onClick={() => onNavigate("/manufacturing/stock-entry")}
        >
          <Box className="h-6 w-6" />
          <span>Stock Entry</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-24 flex flex-col items-center justify-center gap-2 text-base"
          onClick={() => onNavigate("/manufacturing/reports/stock")}
        >
          <BarChart3 className="h-6 w-6" />
          <span>Stock Report</span>
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          RM Report
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rmReportBlocks.map(({ label, icon: Icon, path }) => (
            <Button
              key={path}
              type="button"
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 text-sm"
              onClick={() => onNavigate(path)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center leading-tight">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
