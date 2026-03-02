import {
  Box,
  BarChart3,
  ClipboardCheck,
  Cylinder,
  Droplets,
  Factory,
  FlaskConical,
  Layers,
  Printer,
  Scissors,
  StickyNote,
  Truck,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import WorkOrder from "./work-order"

const homeActions = [
  { label: "Stock", icon: Box, path: "/manufacturing/stock-entry" },
  { label: "Work Order", icon: Factory, path: "/manufacturing/work-order" },
  { label: "Printing", icon: Printer },
  { label: "Inspection", icon: ClipboardCheck },
  { label: "Slitter", icon: Scissors },
  { label: "ECL Department", icon: Factory },
  { label: "Laminations", icon: Layers },
  { label: "Dispatch", icon: Truck },
]

// RM report blocks matching sidebar Reports menu (for stock-department homepage)
const rmReportBlocks = [
  { label: "Rm Film Stock", icon: Cylinder, path: "/manufacturing/reports/stock" },
  { label: "Rm Film Issued", icon: Cylinder, path: "/manufacturing/reports/roll-issues" },
  { label: "Rm Ink Stock", icon: Droplets, path: "/manufacturing/reports/ink-stock" },
  { label: "Rm Ink Issued", icon: Droplets, path: "/manufacturing/reports/ink-issues" },
  { label: "Rm Adhesive Stock", icon: StickyNote, path: "/manufacturing/reports/adhesive-stock" },
  { label: "Rm Adhesive Issued", icon: StickyNote, path: "/manufacturing/reports/adhesive-issues" },
  { label: "Rm Chemical Stock", icon: FlaskConical, path: "/manufacturing/reports/chemical-stock" },
  { label: "Rm Chemical Issued", icon: FlaskConical, path: "/manufacturing/reports/chemical-issues" },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const isStockUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "stock" || user?.department === "Stock")

  const isPrintingUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "printing" || user?.department === "Printing")

  // Printing department: home screen is the Work Order screen
  if (isPrintingUser) {
    return <WorkOrder />
  }

  if (isStockUser) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Home Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Welcome to Production ERP
          </p>
        </div>

        {/* 2 main blocks for stock user */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mb-8">
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-base"
            onClick={() => navigate("/manufacturing/stock-entry")}
          >
            <Box className="h-6 w-6" />
            <span>Stock Entry</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-base"
            onClick={() => navigate("/manufacturing/reports/stock")}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Stock Report</span>
          </Button>
        </div>

        {/* RM Report: all report blocks as in menu bar */}
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
                onClick={() => navigate(path)}
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
            // Printing user: hide Stock Entry
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
              if (path) {
                navigate(path)
              }
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
