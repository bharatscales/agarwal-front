
import {
  Box,
  ClipboardCheck,
  Factory,
  Layers,
  Printer,
  Scissors,
  Truck,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"

const homeActions = [
  { label: "Stock", icon: Box, path: "/manufacturing/stock-entry" },
  { label: "Printing", icon: Printer },
  { label: "Inspection", icon: ClipboardCheck },
  { label: "Slitter", icon: Scissors },
  { label: "ECL Department", icon: Factory },
  { label: "Laminations", icon: Layers },
  { label: "Dispatch", icon: Truck },
]

export default function Home() {
  const navigate = useNavigate()

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
        {homeActions.map(({ label, icon: Icon, path }) => (
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
