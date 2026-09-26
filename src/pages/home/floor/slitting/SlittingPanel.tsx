import { Printer, ScanBarcode, X } from "lucide-react"
import { useMemo, useState } from "react"

import { ColumnHeader } from "@/components/column-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatWeightWithMeter } from "@/lib/film-calc"
import { deleteProducedRoll, jobCardApiErrorMessage, updateProducedRoll } from "@/lib/job-card-api"
import { NonNegativeDecimalInput, parseNonNegativeDecimal } from "@/lib/non-negative-decimal-input"
import { includesStringFilterFn } from "@/lib/table-filter-utils"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"
import {
  isProducedRollLocked,
  PRODUCED_ROLL_DELETE_CONFIRM,
  ProducedRollEditField,
  ProducedRollRowActions,
  producedRollEditDialogClassName,
  producedRollEditInputClassName,
} from "../produced-roll-actions"

type SlittingPanelProps = any

const SLIT_DIRECTIONS = ["Readable", "Unreadable", "LHS", "RHS"] as const

function stageLabel(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase()
  if (s === "wip_printed" || s === "wip-printing") return "WIP Printing"
  if (s === "wip_inspection" || s === "wip-inspection") return "WIP Inspection"
  if (s === "wip_ecl" || s === "wip-ecl") return "WIP ECL"
  if (s === "wip_lamination" || s === "wip-lamination") return "WIP Lamination"
  if (s === "finished_goods" || s === "finished-goods") return "Finished goods"
  return stage || "—"
}

function displayValue(value: unknown) {
  if (value == null || value === "") return "-"
  return String(value)
}

function displayKg(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : `${n.toFixed(2)} kg`
}

function sumSlittingWastages(form: {
  trimWastage?: string
  eclWastage?: string
  printedWastage?: string
  laminationWastage?: string
  slitterWastage?: string
}) {
  const parts = [
    parseNonNegativeDecimal(form.trimWastage || "") ?? 0,
    parseNonNegativeDecimal(form.eclWastage || "") ?? 0,
    parseNonNegativeDecimal(form.printedWastage || "") ?? 0,
    parseNonNegativeDecimal(form.laminationWastage || "") ?? 0,
    parseNonNegativeDecimal(form.slitterWastage || "") ?? 0,
  ]
  return String(Number(parts.reduce((a, b) => a + b, 0).toFixed(2)))
}

function patchSlittingWastage(
  prev: any,
  key: "trimWastage" | "eclWastage" | "printedWastage" | "laminationWastage" | "slitterWastage",
  value: string
) {
  if (!prev) return prev
  const next = { ...prev, [key]: value }
  return { ...next, wastage: sumSlittingWastages(next) }
}

function emptySlittingOutputFields(micron: string) {
  return {
    micron,
    trimWastage: "0",
    eclWastage: "0",
    printedWastage: "0",
    laminationWastage: "0",
    slitterWastage: "0",
    wastage: "0",
    coilRewinding: "",
    slitDirection: "",
    coreSize: "",
    coilDia: "",
    size: "",
    jobRepeat: "",
  }
}

export function SlittingPanel(props: SlittingPanelProps) {
  const {
    slittingSelectedWo,
    slittingRollsLoading,
    slittingLoadedRolls,
    slittingAddRollForm,
    setSlittingAddRollForm,
    slittingCreateChildLoading,
    setSlittingCreateChildLoading,
    setSlittingCreateChildMessage,
    slittingChildRollsLoading,
    slittingChildRollsFromDb,
    setSlittingChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    addSlittingRoll,
    slittingCreateChildMessage,
    floorSlittingBarcode,
    setFloorSlittingBarcode,
    setFloorSlittingBarcodeError,
    floorSlittingBarcodeChecking,
    handleFloorSlittingBarcodeSubmit,
    floorSlittingParentRollsLoading,
    openFloorSlittingParentPicker,
    floorSlittingBarcodeError,
    floorSlittingParentPickerOpen,
    closeFloorSlittingParentPicker,
    floorSlittingParentRollsError,
    floorSlittingParentStockColumns,
    floorSlittingParentRolls,
    applyFloorSlittingFromBarcode,
    slittingLoading,
    slittingError,
    slittingWorkOrders,
    setSlittingSelectedWo,
    getRollsStockByParentIds,
    unloadFloorLoadedRoll,
    onSkipWorkOrder,
    setSlittingRollsRefreshKey,
  } = props

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )
  const parent = slittingLoadedRolls[0] ?? null
  const [slittingEditRoll, setSlittingEditRoll] = useState<any>(null)
  const [slittingEditSaving, setSlittingEditSaving] = useState(false)
  const [slittingEditForm, setSlittingEditForm] = useState({
    trimWastage: "",
    eclWastage: "",
    printedWastage: "",
    laminationWastage: "",
    slitterWastage: "",
    wastage: "",
    coilRewinding: "",
    slitDirection: "",
    coreSize: "",
    coilDia: "",
    size: "",
    jobRepeat: "",
  })

  const slittingProducedTotals = useMemo(() => {
    const rollCount = slittingChildRollsFromDb.length
    const totalWastage = slittingChildRollsFromDb.reduce(
      (sum: number, r: any) => sum + (Number(r.wastage) || 0),
      0
    )
    return { rollCount, totalWastage }
  }, [slittingChildRollsFromDb])

  const pollPrintJob = (jobId: number) => {
    setPrintingPrintStatus("printing")
    let pollCount = 0
    const maxPolls = 30
    const pollInterval = setInterval(async () => {
      pollCount++
      try {
        const updatedJob = await getPrintJob(jobId)
        if (updatedJob.status === "done") {
          clearInterval(pollInterval)
          setPrintingPrintStatus("done")
          setTimeout(() => setPrintingPrintStatus("idle"), 3000)
        } else if (updatedJob.status === "failed" || pollCount >= maxPolls) {
          clearInterval(pollInterval)
          setPrintingPrintStatus("idle")
        }
      } catch {
        clearInterval(pollInterval)
        setPrintingPrintStatus("idle")
      }
    }, 1000)
  }

  const refreshSlittingProducedRolls = () => {
    const parentIds = slittingLoadedRolls.map((r: any) => r.roll.id)
    if (parentIds.length > 0) {
      getRollsStockByParentIds(parentIds, "finished_goods").then(setSlittingChildRollsFromDb)
    } else {
      setSlittingChildRollsFromDb([])
    }
    setSlittingRollsRefreshKey?.((key: number) => key + 1)
  }

  const handleUnloadSlittingRoll = async (jobCardId: number, rollId: number) => {
    try {
      setSlittingCreateChildLoading(true)
      setSlittingCreateChildMessage(null)
      await unloadFloorLoadedRoll(jobCardId, rollId, "slitting")
      setSlittingCreateChildMessage("Loaded roll removed.")
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not unload roll."
      setSlittingCreateChildMessage(detail)
    } finally {
      setSlittingCreateChildLoading(false)
    }
  }

  const resetFieldsForNextSlit = () => {
    setSlittingAddRollForm((prev: any) =>
      prev
        ? {
            ...prev,
            ...emptySlittingOutputFields(prev.micron || ""),
          }
        : null
    )
  }

  const handleSlittingProducedRollReprint = async (r: any) => {
    const wo = slittingSelectedWo
    if (!wo || !wipPrintingTemplate) return
    try {
      setSlittingCreateChildLoading(true)
      const printData = {
        workOrder: {
          id: wo.id,
          woNumber: wo.woNumber,
          partyName: wo.partyName,
          partyCode: wo.partyCode,
          itemName: wo.itemName,
          itemCode: wo.itemCode,
          plannedQty: wo.plannedQty,
          producedQty: wo.producedQty,
          status: wo.status,
          priority: wo.priority,
          createdAt: wo.createdAt,
          startedAt: wo.startedAt,
          completedAt: wo.completedAt,
        },
        roll: {
          id: r.id,
          barcode: r.barcode,
          size: r.size,
          jobRepeat: r.jobRepeat,
          micron: r.micron,
          wastage: r.wastage,
          trimWastage: r.trimWastage,
          eclWastage: r.eclWastage,
          printedWastage: r.printedWastage,
          laminationWastage: r.laminationWastage,
          slitterWastage: r.slitterWastage,
          coilRewinding: r.coilRewinding,
          slitDirection: r.slitDirection,
          coreSize: r.coreSize,
          coilDia: r.coilDia,
          itemName: wo.itemName ?? r.itemName ?? null,
        },
      }
      const job = await createPrintJob({
        name: `Slitting Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
        template_id: wipPrintingTemplate.id,
        data: printData,
        copies: 1,
      })
      setSlittingCreateChildMessage("Label reprint sent to printer.")
      pollPrintJob(job.id)
    } catch {
      setSlittingCreateChildMessage("Failed to send reprint to printer.")
    } finally {
      setSlittingCreateChildLoading(false)
    }
  }

  const handleSlittingProducedRollDelete = async (r: any) => {
    if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM)) return
    try {
      setSlittingCreateChildLoading(true)
      await deleteProducedRoll(r.id)
      setSlittingCreateChildMessage("Produced roll deleted.")
      if (slittingEditRoll?.id === r.id) setSlittingEditRoll(null)
      refreshSlittingProducedRolls()
    } catch (error) {
      setSlittingCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."))
    } finally {
      setSlittingCreateChildLoading(false)
    }
  }

  const slittingProducedRollColumns = useMemo(
    () => [
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="font-mono text-xs">{displayValue(row.original.barcode)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "trimWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Trim wastage" column={column} placeholder="Filter trim..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-xs">{displayKg(row.original.trimWastage)}</div>,
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "eclWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="ECL wastage" column={column} placeholder="Filter ECL..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-xs">{displayKg(row.original.eclWastage)}</div>,
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "printedWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Print wastage" column={column} placeholder="Filter print..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.printedWastage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "laminationWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Lamination wastage" column={column} placeholder="Filter lamination..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.laminationWastage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "slitterWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Slitter wastage" column={column} placeholder="Filter slitter..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.slitterWastage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "wastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Total wastage" column={column} placeholder="Filter total..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-xs">{displayKg(row.original.wastage)}</div>,
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "coilRewinding",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Coil rewinding" column={column} placeholder="Filter rewinding..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.coilRewinding)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "slitDirection",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Direction" column={column} placeholder="Filter direction..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.slitDirection)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "coreSize",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Core size" column={column} placeholder="Filter core..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.coreSize)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "coilDia",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Coil dia" column={column} placeholder="Filter coil dia..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.coilDia)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        id: "jobSize",
        header: () => <div className="text-center w-full">Job size</div>,
        columns: [
          {
            accessorKey: "size",
            header: ({ column }: { column: any }) => (
              <ColumnHeader title="Width" column={column} placeholder="Filter width..." />
            ),
            cell: ({ row }: { row: any }) => (
              <div className="text-xs">{displayValue(row.original.size)}</div>
            ),
            filterFn: includesStringFilterFn,
          },
          {
            accessorKey: "jobRepeat",
            header: ({ column }: { column: any }) => (
              <ColumnHeader title="Repeat" column={column} placeholder="Filter repeat..." />
            ),
            cell: ({ row }: { row: any }) => (
              <div className="text-xs">{displayValue(row.original.jobRepeat)}</div>
            ),
            filterFn: includesStringFilterFn,
          },
        ],
      },
      {
        id: "actions",
        header: () => <div className="text-left">Actions</div>,
        cell: ({ row }: { row: any }) => (
          <ProducedRollRowActions
            reprintDisabled={!wipPrintingTemplate || slittingCreateChildLoading}
            mutateDisabled={slittingCreateChildLoading || isProducedRollLocked(row.original)}
            onReprint={() => void handleSlittingProducedRollReprint(row.original)}
            onEdit={() => {
              const roll = row.original
              setSlittingEditForm({
                trimWastage: roll.trimWastage != null ? String(roll.trimWastage) : "",
                eclWastage: roll.eclWastage != null ? String(roll.eclWastage) : "",
                printedWastage: roll.printedWastage != null ? String(roll.printedWastage) : "",
                laminationWastage: roll.laminationWastage != null ? String(roll.laminationWastage) : "",
                slitterWastage: roll.slitterWastage != null ? String(roll.slitterWastage) : "",
                wastage: roll.wastage != null ? String(roll.wastage) : "",
                coilRewinding: roll.coilRewinding != null ? String(roll.coilRewinding) : "",
                slitDirection: roll.slitDirection ?? "",
                coreSize: roll.coreSize != null ? String(roll.coreSize) : "",
                coilDia: roll.coilDia != null ? String(roll.coilDia) : "",
                size: roll.size != null ? String(roll.size) : "",
                jobRepeat: roll.jobRepeat != null ? String(roll.jobRepeat) : "",
              })
              setSlittingEditRoll(roll)
            }}
            onDelete={() => void handleSlittingProducedRollDelete(row.original)}
          />
        ),
      },
    ],
    [wipPrintingTemplate, slittingCreateChildLoading, slittingSelectedWo]
  )

  return (
    <>
      {slittingSelectedWo ? (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col-reverse gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Loaded parent</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Load one parent (WIP Printed, Inspection, ECL, or Lamination). Produce multiple finished rolls one by
                one, then unload when done.
              </p>
              {slittingRollsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : !parent ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No roll currently loaded for this work order.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Job card
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Barcode
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Stage
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Structure
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Size
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Micron
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                            Input weight
                          </th>
                          <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300" />
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                          <td className="py-1.5 px-2 text-gray-900 dark:text-gray-100">
                            {parent.jobCardNumber}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-gray-900 dark:text-gray-100">
                            {parent.roll.barcode}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
                            {stageLabel(parent.roll.stage)}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
                            {displayValue(parent.roll.item_name ?? parent.roll.itemName)}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
                            {displayValue(parent.roll.size)}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
                            {displayValue(parent.roll.micron)}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
                            {formatWeightWithMeter(parent.roll.netweight, parent.roll.meter)}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Remove loaded roll"
                              disabled={slittingCreateChildLoading}
                              onClick={() => void handleUnloadSlittingRoll(parent.jobCardId, parent.roll.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {slittingAddRollForm && (
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th
                              colSpan={6}
                              className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300"
                            >
                              Wastage
                            </th>
                            <th
                              colSpan={4}
                              className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                            >
                              Coil
                            </th>
                            <th
                              colSpan={2}
                              className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                            >
                              Job size
                            </th>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Trim wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              ECL wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Print wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Lamination wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Slitter wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Total wastage
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700">
                              Coil rewinding
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Direction
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Core size
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Coil dia
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700">
                              Width
                            </th>
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Repeat
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.trimWastage}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    patchSlittingWastage(prev, "trimWastage", value)
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.eclWastage}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    patchSlittingWastage(prev, "eclWastage", value)
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.printedWastage}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    patchSlittingWastage(prev, "printedWastage", value)
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.laminationWastage}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    patchSlittingWastage(prev, "laminationWastage", value)
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.slitterWastage}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    patchSlittingWastage(prev, "slitterWastage", value)
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="text-xs text-gray-900 dark:text-gray-100">
                                {slittingAddRollForm.wastage || "0"}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 border-l border-gray-200 dark:border-gray-700">
                              <NonNegativeDecimalInput
                                className="h-7 w-20 px-1.5 text-xs"
                                value={slittingAddRollForm.coilRewinding}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, coilRewinding: value } : prev
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <Select
                                value={slittingAddRollForm.slitDirection || undefined}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, slitDirection: value } : prev
                                  )
                                }
                              >
                                <SelectTrigger size="sm" className="h-7 w-28 px-1.5 text-xs">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SLIT_DIRECTIONS.map((dir) => (
                                    <SelectItem key={dir} value={dir}>
                                      {dir}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-16 px-1.5 text-xs"
                                value={slittingAddRollForm.coreSize}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, coreSize: value } : prev
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-16 px-1.5 text-xs"
                                value={slittingAddRollForm.coilDia}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, coilDia: value } : prev
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2 border-l border-gray-200 dark:border-gray-700">
                              <NonNegativeDecimalInput
                                className="h-7 w-16 px-1.5 text-xs"
                                value={slittingAddRollForm.size}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, size: value } : prev
                                  )
                                }
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <NonNegativeDecimalInput
                                className="h-7 w-16 px-1.5 text-xs"
                                value={slittingAddRollForm.jobRepeat}
                                onValueChange={(value) =>
                                  setSlittingAddRollForm((prev: any) =>
                                    prev ? { ...prev, jobRepeat: value } : prev
                                  )
                                }
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Produced rolls</h4>
                {!slittingChildRollsLoading && (
                  <div className="rounded-[2px] border border-zinc-600 overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                            Total produced rolls
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                            {slittingProducedTotals.rollCount}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                            Total wastage (kg)
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">
                            {slittingProducedTotals.totalWastage.toFixed(2)} kg
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {slittingChildRollsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
              ) : slittingChildRollsFromDb.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No produced rolls found for this parent. Print each slit roll below.
                </p>
              ) : (
                <DataTable
                  columns={slittingProducedRollColumns}
                  data={slittingChildRollsFromDb}
                  scrollable
                  scrollHeight="45vh"
                  compact
                  size="xs"
                  showSelectionSummary={false}
                />
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
            {!slittingRollsLoading && parent && slittingAddRollForm && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-2"
                disabled={slittingCreateChildLoading}
                onClick={async () => {
                  const form = slittingAddRollForm
                  const wo = slittingSelectedWo
                  if (!form || wo?.itemId == null) return
                  try {
                    setSlittingCreateChildLoading(true)
                    setSlittingCreateChildMessage(null)
                    const parentIds = [form.roll.id]
                    const trimWastage = parseNonNegativeDecimal(form.trimWastage || "") ?? 0
                    const eclWastage = parseNonNegativeDecimal(form.eclWastage || "") ?? 0
                    const printedWastage = parseNonNegativeDecimal(form.printedWastage || "") ?? 0
                    const laminationWastage = parseNonNegativeDecimal(form.laminationWastage || "") ?? 0
                    const slitterWastage = parseNonNegativeDecimal(form.slitterWastage || "") ?? 0
                    const totalWastage =
                      parseNonNegativeDecimal(form.wastage || "") ??
                      trimWastage + eclWastage + printedWastage + laminationWastage + slitterWastage
                    const width = parseNonNegativeDecimal(form.size || "") ?? undefined
                    const jobRepeat = parseNonNegativeDecimal(form.jobRepeat || "") ?? undefined
                    const coilRewinding = parseNonNegativeDecimal(form.coilRewinding || "") ?? undefined
                    const coreSize = parseNonNegativeDecimal(form.coreSize || "") ?? undefined
                    const coilDia = parseNonNegativeDecimal(form.coilDia || "") ?? undefined
                    if (wipPrintingTemplate) {
                      const printData = {
                        workOrder: {
                          id: wo.id,
                          woNumber: wo.woNumber,
                          partyName: wo.partyName,
                          partyCode: wo.partyCode,
                          itemName: wo.itemName,
                          itemCode: wo.itemCode,
                          plannedQty: wo.plannedQty,
                          producedQty: wo.producedQty,
                          status: wo.status,
                          priority: wo.priority,
                          createdAt: wo.createdAt,
                          startedAt: wo.startedAt,
                          completedAt: wo.completedAt,
                        },
                        jobCard: { id: form.jobCardId, jobCardNumber: form.jobCardNumber },
                        roll: {
                          size: width,
                          jobRepeat,
                          micron: form.micron ? parseFloat(form.micron) : undefined,
                          wastage: totalWastage,
                          trimWastage,
                          eclWastage,
                          printedWastage,
                          laminationWastage,
                          slitterWastage,
                          coilRewinding,
                          slitDirection: form.slitDirection || undefined,
                          coreSize,
                          coilDia,
                          itemName: wo.itemName ?? null,
                        },
                      }
                      const job = await createPrintJob({
                        name: `Slitting - ${form.jobCardNumber}`,
                        template_id: wipPrintingTemplate.id,
                        data: printData,
                        copies: 1,
                      })
                      pollPrintJob(job.id)
                    }
                    await addSlittingRoll(form.jobCardId, {
                      itemId: wo.itemId,
                      rollno: "",
                      size: width,
                      micron: form.micron ? parseFloat(form.micron) : undefined,
                      wastage: totalWastage,
                      trimWastage,
                      eclWastage,
                      printedWastage,
                      laminationWastage,
                      slitterWastage,
                      coilRewinding,
                      slitDirection: form.slitDirection.trim() || undefined,
                      coreSize,
                      coilDia,
                      jobRepeat,
                      gradeId: form.parent.gradeId,
                      parentRollIds: parentIds,
                    })
                    const children = await getRollsStockByParentIds(parentIds, "finished_goods")
                    setSlittingChildRollsFromDb(children)
                    resetFieldsForNextSlit()
                    setSlittingCreateChildMessage(
                      wipPrintingTemplate
                        ? "Roll added and label sent to printer. Enter the next slit when ready."
                        : "Roll added. Enter the next slit when ready. No label template configured."
                    )
                  } catch (error) {
                    setSlittingCreateChildMessage(
                      jobCardApiErrorMessage(
                        error,
                        wipPrintingTemplate
                          ? "Failed to print label. Roll not added or movement not recorded."
                          : "Failed to add roll or record movement."
                      )
                    )
                  } finally {
                    setSlittingCreateChildLoading(false)
                  }
                }}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            )}
            {slittingCreateChildMessage && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{slittingCreateChildMessage}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 space-y-1">
            <Label htmlFor="floor-slitting-barcode" className="text-xs text-gray-600 dark:text-gray-400">
              Barcode (parent roll)
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Scan WIP Printed, WIP Inspection, WIP ECL, or WIP Lamination to open the work order and load the parent.
            </p>
            <div className="flex flex-wrap items-center gap-2 max-w-2xl">
              <div className="relative min-w-[min(100%,18rem)] flex-1">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="floor-slitting-barcode"
                  type="text"
                  placeholder="Scan or enter parent roll barcode"
                  value={floorSlittingBarcode}
                  onChange={(e) => {
                    setFloorSlittingBarcode(e.target.value)
                    setFloorSlittingBarcodeError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void handleFloorSlittingBarcodeSubmit()
                    }
                  }}
                  disabled={floorSlittingBarcodeChecking}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                disabled={floorSlittingBarcodeChecking || floorSlittingParentRollsLoading}
                onClick={() => void openFloorSlittingParentPicker()}
              >
                Select Stock
              </Button>
            </div>
            {floorSlittingBarcodeError && <p className="text-sm text-red-500">{floorSlittingBarcodeError}</p>}
          </div>

          {floorSlittingParentPickerOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle>Select parent roll</CardTitle>
                    <CardDescription>
                      Pick a WIP Printed, WIP Inspection, WIP ECL, or WIP Lamination roll to load into Slitting.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeFloorSlittingParentPicker} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {floorSlittingParentRollsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {floorSlittingParentRollsError && (
                        <p className="text-sm text-red-500 mb-3">{floorSlittingParentRollsError}</p>
                      )}
                      <DataTable
                        key="floor-slitting-parent-picker"
                        columns={floorSlittingParentStockColumns}
                        data={floorSlittingParentRolls}
                        getRowId={(row: any) => String(row.id)}
                        singleRowSelection
                        scrollable
                        scrollHeight="60vh"
                        bulkActions={(selectedRows: any[]) => (
                          <Button
                            size="sm"
                            disabled={floorSlittingBarcodeChecking}
                            onClick={async () => {
                              const selected = selectedRows[0]
                              const barcode = selected?.barcode?.trim()
                              if (!barcode) return
                              await applyFloorSlittingFromBarcode(barcode, { closePicker: true })
                            }}
                          >
                            {floorSlittingBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                          </Button>
                        )}
                      />
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="w-full flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeFloorSlittingParentPicker}>
                      Close
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}

          {slittingLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : slittingError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{slittingError}</p>
          ) : slittingWorkOrders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
          ) : (
            <DataTable
              columns={floorWorkOrderColumns}
              data={slittingWorkOrders}
              getRowId={(row) => String(row.id)}
              onRowClick={(wo) => setSlittingSelectedWo(wo)}
              scrollable
              scrollHeight="65vh"
              showSelectionSummary={false}
            />
          )}
        </>
      )}
      <Dialog
        open={Boolean(slittingEditRoll)}
        onOpenChange={(open) => {
          if (!open) setSlittingEditRoll(null)
        }}
      >
        <DialogContent className={producedRollEditDialogClassName}>
          <DialogHeader>
            <DialogTitle>Edit produced roll</DialogTitle>
            <DialogDescription>Update slit wastage, coil, and job size fields.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <ProducedRollEditField label="Trim wastage">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.trimWastage}
                onValueChange={(trimWastage) =>
                  setSlittingEditForm((prev) => ({
                    ...prev,
                    trimWastage,
                    wastage: sumSlittingWastages({ ...prev, trimWastage }),
                  }))
                }
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="ECL wastage">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.eclWastage}
                onValueChange={(eclWastage) =>
                  setSlittingEditForm((prev) => ({
                    ...prev,
                    eclWastage,
                    wastage: sumSlittingWastages({ ...prev, eclWastage }),
                  }))
                }
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Print wastage">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.printedWastage}
                onValueChange={(printedWastage) =>
                  setSlittingEditForm((prev) => ({
                    ...prev,
                    printedWastage,
                    wastage: sumSlittingWastages({ ...prev, printedWastage }),
                  }))
                }
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Lamination wastage">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.laminationWastage}
                onValueChange={(laminationWastage) =>
                  setSlittingEditForm((prev) => ({
                    ...prev,
                    laminationWastage,
                    wastage: sumSlittingWastages({ ...prev, laminationWastage }),
                  }))
                }
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Slitter wastage">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.slitterWastage}
                onValueChange={(slitterWastage) =>
                  setSlittingEditForm((prev) => ({
                    ...prev,
                    slitterWastage,
                    wastage: sumSlittingWastages({ ...prev, slitterWastage }),
                  }))
                }
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Total wastage">
              <Input className={producedRollEditInputClassName} value={slittingEditForm.wastage} readOnly />
            </ProducedRollEditField>
            <ProducedRollEditField label="Coil rewinding">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.coilRewinding}
                onValueChange={(coilRewinding) => setSlittingEditForm((prev) => ({ ...prev, coilRewinding }))}
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Direction">
              <Select
                value={slittingEditForm.slitDirection || undefined}
                onValueChange={(slitDirection) => setSlittingEditForm((prev) => ({ ...prev, slitDirection }))}
              >
                <SelectTrigger size="sm" className="h-7 w-full px-1.5 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SLIT_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir} value={dir}>
                      {dir}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ProducedRollEditField>
            <ProducedRollEditField label="Core size">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.coreSize}
                onValueChange={(coreSize) => setSlittingEditForm((prev) => ({ ...prev, coreSize }))}
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Coil dia">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.coilDia}
                onValueChange={(coilDia) => setSlittingEditForm((prev) => ({ ...prev, coilDia }))}
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Width">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.size}
                onValueChange={(size) => setSlittingEditForm((prev) => ({ ...prev, size }))}
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Repeat">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.jobRepeat}
                onValueChange={(jobRepeat) => setSlittingEditForm((prev) => ({ ...prev, jobRepeat }))}
              />
            </ProducedRollEditField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSlittingEditRoll(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={slittingEditSaving}
              onClick={async () => {
                const roll = slittingEditRoll
                if (!roll?.id) return
                try {
                  setSlittingEditSaving(true)
                  const trimWastage = parseNonNegativeDecimal(slittingEditForm.trimWastage)
                  const eclWastage = parseNonNegativeDecimal(slittingEditForm.eclWastage)
                  const printedWastage = parseNonNegativeDecimal(slittingEditForm.printedWastage)
                  const laminationWastage = parseNonNegativeDecimal(slittingEditForm.laminationWastage)
                  const slitterWastage = parseNonNegativeDecimal(slittingEditForm.slitterWastage)
                  const totalWastage =
                    parseNonNegativeDecimal(slittingEditForm.wastage) ??
                    (trimWastage ?? 0) +
                      (eclWastage ?? 0) +
                      (printedWastage ?? 0) +
                      (laminationWastage ?? 0) +
                      (slitterWastage ?? 0)
                  await updateProducedRoll(roll.id, {
                    size: parseNonNegativeDecimal(slittingEditForm.size),
                    jobRepeat: parseNonNegativeDecimal(slittingEditForm.jobRepeat),
                    wastage: totalWastage,
                    trimWastage,
                    eclWastage,
                    printedWastage,
                    laminationWastage,
                    slitterWastage,
                    coilRewinding: parseNonNegativeDecimal(slittingEditForm.coilRewinding),
                    slitDirection: slittingEditForm.slitDirection.trim() || null,
                    coreSize: parseNonNegativeDecimal(slittingEditForm.coreSize),
                    coilDia: parseNonNegativeDecimal(slittingEditForm.coilDia),
                  })
                  setSlittingCreateChildMessage("Produced roll updated.")
                  setSlittingEditRoll(null)
                  refreshSlittingProducedRolls()
                } catch (error) {
                  setSlittingCreateChildMessage(
                    jobCardApiErrorMessage(error, "Failed to update produced roll.")
                  )
                } finally {
                  setSlittingEditSaving(false)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
