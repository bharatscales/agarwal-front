import { Plus, Printer, ScanBarcode, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

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

type SlitDraft = {
  key: string
  size: string
  netweight: string
  coreSize: string
  coilDia: string
  slitDirection: string
  jobRepeat: string
  coilRewinding: string
}

function newSlitKey() {
  return `slit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptySlit(seed?: Partial<SlitDraft>): SlitDraft {
  return {
    key: seed?.key || newSlitKey(),
    size: "",
    netweight: "",
    coreSize: seed?.coreSize ?? "",
    coilDia: seed?.coilDia ?? "",
    slitDirection: seed?.slitDirection ?? "",
    jobRepeat: seed?.jobRepeat ?? "",
    coilRewinding: seed?.coilRewinding ?? "",
  }
}

function trimWastageTotal(value?: string) {
  const amount = parseNonNegativeDecimal(value || "") ?? 0
  return String(Number(amount.toFixed(2)))
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
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    consumeSlittingRoll,
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
    netweight: "",
    trimWastage: "",
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
      (sum: number, r: any) => sum + (Number(r.trimWastage) || 0),
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
          netweight: r.netweight,
          wastage: r.trimWastage,
          trimWastage: r.trimWastage,
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
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output weight" column={column} placeholder="Filter weight..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-xs">{displayKg(row.original.netweight)}</div>,
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
                netweight: roll.netweight != null ? String(roll.netweight) : "",
                trimWastage: roll.trimWastage != null ? String(roll.trimWastage) : "",
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


  const slitRows: SlitDraft[] =
    Array.isArray(slittingAddRollForm?.slits) && slittingAddRollForm.slits.length > 0
      ? slittingAddRollForm.slits
      : []

  useEffect(() => {
    if (!slittingAddRollForm?.roll?.id) return
    if (Array.isArray(slittingAddRollForm.slits) && slittingAddRollForm.slits.length > 0) return
    setSlittingAddRollForm((prev: any) => {
      if (!prev || (Array.isArray(prev.slits) && prev.slits.length > 0)) return prev
      return {
        ...prev,
        slits: [emptySlit()],
        balanceweight: prev.balanceweight ?? "",
        trimWastage: prev.trimWastage ?? "0",
        wastage: trimWastageTotal(prev.trimWastage ?? "0"),
      }
    })
  }, [slittingAddRollForm, setSlittingAddRollForm])

  const updateSlit = (key: string, patch: Partial<SlitDraft>) => {
    setSlittingAddRollForm((prev: any) => {
      if (!prev) return prev
      const current: SlitDraft[] = Array.isArray(prev.slits) && prev.slits.length > 0 ? prev.slits : [emptySlit()]
      return {
        ...prev,
        slits: current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      }
    })
  }

  const addSlitRow = () => {
    setSlittingAddRollForm((prev: any) => {
      if (!prev) return prev
      const current: SlitDraft[] = Array.isArray(prev.slits) ? prev.slits : []
      const last = current[current.length - 1]
      return { ...prev, slits: [...current, emptySlit(last)] }
    })
  }

  const removeSlitRow = (key: string) => {
    setSlittingAddRollForm((prev: any) => {
      if (!prev) return prev
      const current: SlitDraft[] = Array.isArray(prev.slits) ? prev.slits : []
      const slits = current.filter((row) => row.key !== key)
      return { ...prev, slits: slits.length > 0 ? slits : [emptySlit()] }
    })
  }

  const handleConsumeSlittingRoll = async () => {
    const form = slittingAddRollForm
    const wo = slittingSelectedWo
    if (!form || wo?.itemId == null) return
    const rows: SlitDraft[] = Array.isArray(form.slits) ? form.slits : []
    const children: Array<{
      size: number
      netweight: number
      coilRewinding?: number
      slitDirection?: string
      coreSize?: number
      coilDia?: number
      jobRepeat?: number
    }> = []
    for (const row of rows) {
      const touched = [row.size, row.netweight, row.coreSize, row.coilDia, row.slitDirection, row.jobRepeat, row.coilRewinding]
        .some((value) => String(value || "").trim() !== "")
      if (!touched) continue
      const width = parseNonNegativeDecimal(row.size || "")
      const weight = parseNonNegativeDecimal(row.netweight || "")
      if (width == null || width <= 0 || weight == null || weight <= 0) {
        setSlittingCreateChildMessage("Each slit needs a width and an output weight.")
        return
      }
      children.push({
        size: width,
        netweight: weight,
        coilRewinding: parseNonNegativeDecimal(row.coilRewinding || "") ?? undefined,
        slitDirection: row.slitDirection.trim() || undefined,
        coreSize: parseNonNegativeDecimal(row.coreSize || "") ?? undefined,
        coilDia: parseNonNegativeDecimal(row.coilDia || "") ?? undefined,
        jobRepeat: parseNonNegativeDecimal(row.jobRepeat || "") ?? undefined,
      })
    }
    if (children.length === 0) {
      setSlittingCreateChildMessage("Add at least one slit with a width and an output weight.")
      return
    }
    const parentWidth = Number(form.roll?.size)
    const widthTotal = children.reduce((sum, child) => sum + child.size, 0)
    if (parentWidth > 0 && widthTotal > parentWidth + 0.5) {
      setSlittingCreateChildMessage(
        `Slit widths total ${widthTotal.toFixed(2)} mm, which is wider than the loaded roll (${parentWidth.toFixed(2)} mm).`
      )
      return
    }
    const trim = parseNonNegativeDecimal(form.trimWastage || "") ?? 0
    const balance = parseNonNegativeDecimal(form.balanceweight || "") ?? 0
    const inputWeight = Number(form.roll?.netweight) || 0
    const outputWeight = children.reduce((sum, child) => sum + child.netweight, 0)
    if (inputWeight > 0 && outputWeight + trim + balance > inputWeight + 0.05) {
      setSlittingCreateChildMessage("Output weight, trim wastage, and balance are more than the loaded roll weight.")
      return
    }
    try {
      setSlittingCreateChildLoading(true)
      setSlittingCreateChildMessage(null)
      const result = await consumeSlittingRoll(form.jobCardId, {
        parentRollId: form.roll.id,
        itemId: wo.itemId,
        micron: form.micron ? parseFloat(form.micron) : undefined,
        gradeId: form.parent?.gradeId,
        trimWastage: trim,
        wastage: trim,
        balanceWeight: balance,
        children,
      })
      const created = result.rolls ?? []
      if (wipPrintingTemplate && created.length > 0) {
        try {
          for (const roll of created) {
            const job = await createPrintJob({
              name: `Slitting - ${form.jobCardNumber}`,
              template_id: wipPrintingTemplate.id,
              copies: 1,
              data: {
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
                  id: roll.id,
                  barcode: roll.barcode,
                  size: roll.size,
                  netweight: roll.netweight,
                  micron: roll.micron,
                  wastage: roll.wastage,
                  trimWastage: trim,
                  itemName: wo.itemName ?? null,
                },
              },
            })
            pollPrintJob(job.id)
          }
          setSlittingCreateChildMessage(
            `Loaded roll consumed. ${created.length} finished roll${created.length === 1 ? "" : "s"} created and labels sent to the printer.`
          )
        } catch {
          setSlittingCreateChildMessage(
            `Loaded roll consumed. ${created.length} finished roll${created.length === 1 ? "" : "s"} created. Label printing failed; reprint from the list.`
          )
        }
      } else {
        const count = created.length || children.length
        setSlittingCreateChildMessage(
          `Loaded roll consumed. ${count} finished roll${count === 1 ? "" : "s"} created.`
        )
      }
      setSlittingRollsRefreshKey?.((key: number) => key + 1)
    } catch (error) {
      setSlittingCreateChildMessage(jobCardApiErrorMessage(error, "Could not consume this roll."))
    } finally {
      setSlittingCreateChildLoading(false)
    }
  }

  const slittingParentLoader = (
          <div className="mb-4 space-y-1">
            <Label htmlFor="floor-slitting-barcode" className="text-xs text-gray-600 dark:text-gray-400">
              Barcode (parent roll)
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {slittingSelectedWo ? "Scan a roll from this work order, or pick one from stock, to load it on the slitter." : "Scan a WIP Printing, Inspection, ECL, or Lamination roll to open the work order and load it."}
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
  )

  return (
    <>
      {slittingSelectedWo ? (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col-reverse gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Loaded parent</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Load one roll. Enter each slit, then consume the roll. That creates every finished roll and records trim wastage once.
              </p>
              {slittingRollsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : !parent ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No roll currently loaded for this work order.
                  </p>
                  {slittingParentLoader}
                </div>
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
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Trim wastage (kg)</Label>
                          <NonNegativeDecimalInput
                            className="h-8 w-28"
                            value={slittingAddRollForm.trimWastage || ""}
                            onValueChange={(trimWastage) =>
                              setSlittingAddRollForm((prev: any) =>
                                prev
                                  ? { ...prev, trimWastage, wastage: trimWastageTotal(trimWastage) }
                                  : prev
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Balance weight (kg)</Label>
                          <NonNegativeDecimalInput
                            className="h-8 w-28"
                            value={slittingAddRollForm.balanceweight || ""}
                            onValueChange={(balanceweight) =>
                              setSlittingAddRollForm((prev: any) => (prev ? { ...prev, balanceweight } : prev))
                            }
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 pb-2">
                          {slitRows.length} slit{slitRows.length === 1 ? "" : "s"}
                          {parent?.roll?.size != null ? ` · parent width ${parent.roll.size} mm` : ""}
                          {parent?.roll?.netweight != null ? ` · loaded ${Number(parent.roll.netweight).toFixed(2)} kg` : ""}
                        </p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <th className="text-left py-1.5 px-2 font-medium">Width (mm)</th>
                              <th className="text-left py-1.5 px-2 font-medium">Output weight (kg)</th>
                              <th className="text-left py-1.5 px-2 font-medium">Core size</th>
                              <th className="text-left py-1.5 px-2 font-medium">Coil dia</th>
                              <th className="text-left py-1.5 px-2 font-medium">Direction</th>
                              <th className="text-left py-1.5 px-2 font-medium">Repeat</th>
                              <th className="text-left py-1.5 px-2 font-medium">Coil rewinding</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {slitRows.map((row, index) => (
                              <tr key={row.key} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-20 px-1.5 text-xs" value={row.size} onValueChange={(size) => updateSlit(row.key, { size })} />
                                </td>
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-24 px-1.5 text-xs" value={row.netweight} onValueChange={(netweight) => updateSlit(row.key, { netweight })} />
                                </td>
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-16 px-1.5 text-xs" value={row.coreSize} onValueChange={(coreSize) => updateSlit(row.key, { coreSize })} />
                                </td>
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-16 px-1.5 text-xs" value={row.coilDia} onValueChange={(coilDia) => updateSlit(row.key, { coilDia })} />
                                </td>
                                <td className="py-1.5 px-2">
                                  <Select value={row.slitDirection || undefined} onValueChange={(slitDirection) => updateSlit(row.key, { slitDirection })}>
                                    <SelectTrigger size="sm" className="h-7 w-28 px-1.5 text-xs">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SLIT_DIRECTIONS.map((dir) => (
                                        <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-16 px-1.5 text-xs" value={row.jobRepeat} onValueChange={(jobRepeat) => updateSlit(row.key, { jobRepeat })} />
                                </td>
                                <td className="py-1.5 px-2">
                                  <NonNegativeDecimalInput className="h-7 w-20 px-1.5 text-xs" value={row.coilRewinding} onValueChange={(coilRewinding) => updateSlit(row.key, { coilRewinding })} />
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={`Remove slit ${index + 1}`} onClick={() => removeSlitRow(row.key)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addSlitRow}>
                        <Plus className="h-4 w-4" />
                        Add slit
                      </Button>
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
                            Trim wastage (kg)
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
                  No finished rolls yet. Consume the loaded roll to create them.
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
                onClick={() => void handleConsumeSlittingRoll()}
              >
                <Printer className="h-4 w-4" />
                Consume roll
              </Button>
            )}
            {slittingCreateChildMessage && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{slittingCreateChildMessage}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {slittingParentLoader}

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
          {floorSlittingParentPickerOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle>Select parent roll</CardTitle>
                    <CardDescription>
                      {slittingSelectedWo
                        ? "Pick a roll from this work order to load into slitting."
                        : "Pick a WIP Printing, Inspection, ECL, or Lamination roll to load into slitting."}
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

      <Dialog
        open={Boolean(slittingEditRoll)}
        onOpenChange={(open) => {
          if (!open) setSlittingEditRoll(null)
        }}
      >
        <DialogContent className={producedRollEditDialogClassName}>
          <DialogHeader>
            <DialogTitle>Edit produced roll</DialogTitle>
            <DialogDescription>Update width, output weight, trim wastage, and coil fields.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <ProducedRollEditField label="Output weight (kg)">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.netweight}
                onValueChange={(netweight) => setSlittingEditForm((prev) => ({ ...prev, netweight }))}
              />
            </ProducedRollEditField>
            <ProducedRollEditField label="Trim wastage (kg)">
              <NonNegativeDecimalInput
                className={producedRollEditInputClassName}
                value={slittingEditForm.trimWastage}
                onValueChange={(trimWastage) => setSlittingEditForm((prev) => ({ ...prev, trimWastage }))}
              />
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
                  const trimWastage = parseNonNegativeDecimal(slittingEditForm.trimWastage) ?? 0
                  const netweight = parseNonNegativeDecimal(slittingEditForm.netweight)
                  await updateProducedRoll(roll.id, {
                    size: parseNonNegativeDecimal(slittingEditForm.size),
                    netweight,
                    grossweight: netweight,
                    jobRepeat: parseNonNegativeDecimal(slittingEditForm.jobRepeat),
                    wastage: trimWastage,
                    trimWastage,
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
