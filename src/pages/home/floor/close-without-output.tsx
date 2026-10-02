import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CLOSE_WITHOUT_OUTPUT_REASONS, jobCardApiErrorMessage } from "@/lib/job-card-api"
import { NonNegativeDecimalInput, parseNonNegativeDecimal } from "@/lib/non-negative-decimal-input"

export type CloseWithoutOutputTarget = {
  jobCardId: number
  rollId: number
  label: string
  barcode: string
  structure: string
  weightKg: number | null
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
  onConfirm: (values: { wastage: number; reason: string; remark: string }) => Promise<void>
}) {
  const [wastage, setWastage] = useState("")
  const [reason, setReason] = useState("")
  const [remark, setRemark] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    setWastage(target.weightKg != null ? String(target.weightKg) : "")
    setReason("")
    setRemark("")
    setError(null)
  }, [target])

  const wastageValue = parseNonNegativeDecimal(wastage)

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consume film</DialogTitle>
          <DialogDescription>
            This film is used now. No output roll is created yet, and it does not return to stock. It stays on this job card and becomes a parent when the output roll is created.
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
            </dl>
            <div className="space-y-1">
              <Label>Wastage (kg)</Label>
              <NonNegativeDecimalInput
                value={wastage}
                onValueChange={setWastage}
                disabled={saving}
                className="h-8 w-full px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select value={reason || undefined} onValueChange={setReason} disabled={saving}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {CLOSE_WITHOUT_OUTPUT_REASONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="close-without-output-remark">Remark</Label>
              <Input
                id="close-without-output-remark"
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                disabled={saving}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || wastageValue == null || !reason}
            onClick={async () => {
              if (wastageValue == null) {
                setError("Enter wastage weight.")
                return
              }
              if (!reason) {
                setError("Choose a reason.")
                return
              }
              setError(null)
              try {
                await onConfirm({ wastage: wastageValue, reason, remark })
              } catch (error) {
                setError(jobCardApiErrorMessage(error, "Could not close this roll."))
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
  jobCardNumber: string
  label: string
  structure: string
  weightLabel: string
  wastageLabel: string
  reason: string
}

export function ClosedWithoutOutputList({ rows }: { rows: ClosedWithoutOutputRow[] }) {
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
              {["Job card", "Film", "Structure", "Loaded weight", "Wastage", "Reason"].map((title) => (
                <th key={title} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
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
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
