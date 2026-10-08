import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { jobCardApiErrorMessage } from "@/lib/job-card-api"

export type CloseWithoutOutputTarget = {
  jobCardId: number
  rollId: number
  label: string
  barcode: string
  structure: string
  weightKg: number | null
  balanceKg: number | null
  wastageKg: number | null
  plainWastageKg?: number | null
  printedWastageKg?: number | null
  inkGsm?: number | null
  inkGsmByInkWt?: number | null
}

export function CloseWithoutOutputDialog({
  target,
  saving,
  onOpenChange,
  onConfirm,
}: {
  target: CloseWithoutOutputTarget | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open) setError(null)
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consume film</DialogTitle>
          <DialogDescription>
            This film is used now. No output roll is created, and it does not return to stock. Output weight and meter are ignored. Values already entered on the loaded roll are kept. If a balance weight is entered, that weight becomes a balance roll. The film stays on this job card and becomes a parent when the output roll is created.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-gray-500 dark:text-gray-400">Film</dt>
              <dd className="text-gray-900 dark:text-gray-100">{target.label}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Barcode</dt>
              <dd className="text-gray-900 dark:text-gray-100">{target.barcode || "—"}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Structure</dt>
              <dd className="text-gray-900 dark:text-gray-100">{target.structure || "—"}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Loaded weight</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {target.weightKg != null ? `${Number(target.weightKg).toFixed(2)} kg` : "—"}
              </dd>
              {target.balanceKg != null && target.balanceKg > 0 && (
                <>
                  <dt className="text-gray-500 dark:text-gray-400">Balance roll</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{Number(target.balanceKg).toFixed(2)} kg</dd>
                </>
              )}
            </dl>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={async () => {
              setError(null)
              try {
                await onConfirm()
              } catch (confirmError) {
                setError(jobCardApiErrorMessage(confirmError, "Could not consume this roll."))
              }
            }}
          >
            {saving ? "Consuming…" : "Consume film"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type ClosedWithoutOutputRow = {
  id: number
  jobCardId: number
  jobCardNumber: string
  label: string
  structure: string
  weightLabel: string
  wastageLabel: string
  balanceLabel: string
}

export function ClosedWithoutOutputList({
  rows,
  undoing,
  onUndo,
}: {
  rows: ClosedWithoutOutputRow[]
  undoing?: boolean
  onUndo?: (row: ClosedWithoutOutputRow) => void
}) {
  if (rows.length === 0) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Consumed films</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        These films are used. They will be parents of the next output roll.
      </p>
      <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {["Job card", "Film", "Structure", "Loaded weight", "Wastage", "Balance", ""].map((title) => (
                <th key={title || "undo"} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <td className="py-1.5 px-2 text-gray-900 dark:text-gray-100">{row.jobCardNumber}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.label}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.structure}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.weightLabel}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.wastageLabel}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.balanceLabel}</td>
                <td className="py-1.5 px-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    title="Undo this consume, clear wastage, and return the film to stock"
                    disabled={undoing || !onUndo}
                    onClick={() => {
                      if (!onUndo) return
                      if (
                        !window.confirm(
                          `Undo consume for ${row.label}? Wastage will be cleared, the balance roll will be removed, and the film will return to stock.`
                        )
                      ) {
                        return
                      }
                      onUndo(row)
                    }}
                  >
                    Undo
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
