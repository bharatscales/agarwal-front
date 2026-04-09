import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { FloorDepartmentId } from "../constants"

type FloorShellProps = {
  isMobile: boolean
  sidebarState: "expanded" | "collapsed"
  floorView: FloorDepartmentId | null
  floorViewLabel: string | null
  userName?: string
  onBackToDepartments: () => void
  isScaleConnected: boolean
  isScaleConnecting: boolean
  scaleWeight: number | null
  scaleWeightError: string | null
  isSerialSupported: boolean
  onConnectScale: () => void
  printerName: string
  printerAvailable: boolean
  websocketConnected: boolean
  printingPrintStatus: "idle" | "printing" | "done"
  children: ReactNode
}

export function FloorShell({
  isMobile,
  sidebarState,
  floorView,
  floorViewLabel,
  userName,
  onBackToDepartments,
  isScaleConnected,
  isScaleConnecting,
  scaleWeight,
  scaleWeightError,
  isSerialSupported,
  onConnectScale,
  printerName,
  printerAvailable,
  websocketConnected,
  printingPrintStatus,
  children,
}: FloorShellProps) {
  return (
    <div className="pt-16 pb-10">
      <div
        className="fixed top-0 h-16 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-50 transition-all duration-200"
        style={{
          left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
          right: 0,
        }}
      >
        {floorView !== null && (
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {floorViewLabel ?? floorView}
            </h2>
          </div>
        )}
        <div className="flex items-center gap-3">
          {floorView !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 shrink-0 h-auto py-1.5 px-2"
              onClick={onBackToDepartments}
              aria-label="Back to Departments"
              title="Back to Departments"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold">Floor Dashboard</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Welcome, {userName ?? "User"}.
                </span>
              </span>
            </Button>
          )}
          {floorView === null && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Floor Dashboard
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Welcome, {userName ?? "User"}.
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[130px] text-center flex flex-col items-center justify-center gap-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
              Weight
            </div>
            {isScaleConnected || isScaleConnecting ? (
              <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {scaleWeightError
                  ? scaleWeightError
                  : scaleWeight != null
                    ? `${Number(scaleWeight).toFixed(2)} kg`
                    : "…"}
              </div>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 min-w-[90px] px-3 text-xs font-semibold"
                onClick={onConnectScale}
                disabled={!isSerialSupported || isScaleConnecting}
              >
                {!isSerialSupported ? "No Serial" : "Connect"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6">{children}</div>

      <div
        className="fixed bottom-0 h-7 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 z-50 transition-all duration-200"
        style={{
          left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
          right: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Printer:</span>
          <span className="text-xs text-gray-900 dark:text-gray-100 font-semibold">{printerName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Status:</span>
          <span
            className={`text-xs font-semibold ${
              !printerAvailable
                ? "text-red-600 dark:text-red-400"
                : printingPrintStatus === "printing"
                  ? "text-blue-600 dark:text-blue-400"
                  : printingPrintStatus === "done"
                    ? "text-green-600 dark:text-green-400"
                    : websocketConnected
                      ? "text-gray-600 dark:text-gray-400"
                      : "text-yellow-600 dark:text-yellow-400"
            }`}
          >
            {!printerAvailable
              ? "Not available"
              : printingPrintStatus === "printing"
                ? "Printing..."
                : printingPrintStatus === "done"
                  ? "Done"
                  : websocketConnected
                    ? "Idle"
                    : "Poll"}
          </span>
        </div>
      </div>
    </div>
  )
}
