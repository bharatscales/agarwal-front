import { Printer, ScanBarcode, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ColumnHeader } from "@/components/column-header"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { getItemsByGroupForMenu, type MenuItem } from "@/lib/item-api"
import {
  hasSemiConsumeChoice,
  NonNegativeDecimalInput,
  parseNonNegativeDecimal,
} from "@/lib/non-negative-decimal-input"
import { getAllOperators } from "@/lib/operator-api"
import { createDualInputGroupPathGetter, includesStringFilterFn } from "@/lib/table-filter-utils"
import { allowedWipStagesForDept, isOperationSkipped, wipStageLabel } from "@/lib/wo-flow"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type LaminationPanelProps = any

const LAMINATION_SHIFTS = ["A", "B"]
const RM_FILM_GROUP = "rm film"
const RM_ADHESIVE_GROUP = "adhesive"

function displayValue(value: unknown) {
  if (value == null || value === "") return "-"
  return String(value)
}

function displayStructure(value: unknown) {
  const text = value == null || value === "" ? "" : String(value)
  if (!text) return <span>—</span>
  const shown = text.length > 7 ? `${text.slice(0, 7)}...` : text
  return (
    <span className="inline-block max-w-[4.75rem] whitespace-nowrap" title={text}>
      {shown}
    </span>
  )
}

function adhesiveItemLabel(item: { item_code?: string | null; name?: string | null }) {
  return (item.item_code || item.name || "").trim()
}

function pickAdhesiveByHint(items: Array<{ id: number; item_code?: string | null; name?: string | null }>, hint: "oh" | "nco") {
  return (
    items.find((item) => {
      const text = `${item.item_code ?? ""} ${item.name ?? ""}`.toLowerCase()
      if (hint === "nco") return text.includes("nco")
      return (text.includes("oh") || text.includes("polyol")) && !text.includes("nco")
    }) ?? null
  )
}

function AdhesiveItemSelect({
  value,
  items,
  placeholder,
  disabled,
  onChange,
}: {
  value: string
  items: MenuItem[]
  placeholder: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 w-28 px-1.5 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => {
          const label = adhesiveItemLabel(item) || String(item.id)
          return (
            <SelectItem key={item.id} value={String(item.id)} title={label}>
              {label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function outputMeterFromParent(outputKg: number | null, parent: { netweight?: number | null; meter?: number | null } | null | undefined) {
  if (outputKg == null || !(outputKg >= 0) || !parent) return ""
  const parentKg = Number(parent.netweight)
  const parentMeter = Number(parent.meter)
  if (!(parentKg > 0) || !(parentMeter > 0)) return ""
  return String(Math.round(parentMeter * (outputKg / parentKg)))
}

function displayKg(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : `${n.toFixed(2)} kg`
}

type EclParentRollSummary = {
  id: number
  itemName?: string | null
  size?: number | null
  micron?: number | null
  netweight?: number | null
  meter?: number | null
  wastage?: number | null
  balanceWeight?: number | null
  stage?: string | null
}

function pickEclProducedParents(
  parentRolls: EclParentRollSummary[] | undefined,
  getRole: (stage: string | null | undefined) => "wip" | "rm" | null
) {
  const parents = parentRolls ?? []
  let input1 = parents.find((p) => getRole(p.stage) === "wip") ?? null
  let input2 = parents.find((p) => getRole(p.stage) === "rm") ?? null
  if (!input1 && !input2 && parents.length >= 1) {
    input1 = parents[0] ?? null
    input2 = parents[1] ?? null
  } else if (!input1 && parents.length > 0) {
    input1 = parents.find((p) => p.id !== input2?.id) ?? null
  } else if (!input2 && parents.length > 0) {
    input2 = parents.find((p) => p.id !== input1?.id) ?? null
  }
  return { input1, input2 }
}

function eclInputGroupColumns(
  id: "input1" | "input2",
  label: string,
  pick: (row: any) => EclParentRollSummary | null
) {
  const mergeByParent = {
    mergeRows: true,
    getMergeKey: (row: any) => pick(row)?.id ?? null,
  }
  return {
    id,
    header: () => <div className="text-center w-full">{label}</div>,
    columns: [
      {
        id: `${id}Structure`,
        header: () => <div>Structure</div>,
        size: 80,
        minSize: 72,
        maxSize: 88,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayStructure(pick(row.original)?.itemName)}</div>
        ),
        meta: mergeByParent,
      },
      {
        id: `${id}Size`,
        header: () => <div>Size</div>,
        cell: ({ row }: { row: any }) => {
          const size = pick(row.original)?.size
          return <div className="text-sm">{size != null ? String(size) : "-"}</div>
        },
        meta: mergeByParent,
      },
      {
        id: `${id}Micron`,
        header: () => <div>Micron</div>,
        cell: ({ row }: { row: any }) => {
          const micron = pick(row.original)?.micron
          return <div className="text-sm">{micron != null ? String(micron) : "-"}</div>
        },
        meta: mergeByParent,
      },
      {
        id: `${id}InputWeight`,
        header: () => <div>Input weight</div>,
        cell: ({ row }: { row: any }) => {
          const parent = pick(row.original)
          return (
            <div className="text-sm">
              {parent ? formatWeightWithMeter(parent.netweight, parent.meter) : "-"}
            </div>
          )
        },
        meta: mergeByParent,
      },
      {
        id: `${id}Wastage`,
        header: () => <div>Wastage</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayKg(pick(row.original)?.wastage)}</div>
        ),
        meta: mergeByParent,
      },
      {
        id: `${id}BalanceWeight`,
        header: () => <div>Balance weight</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayKg(pick(row.original)?.balanceWeight)}</div>
        ),
        meta: mergeByParent,
      },
    ],
  }
}

function asSingleColumnGroup(id: string, column: Record<string, unknown>) {
  return {
    id,
    header: () => null,
    columns: [column],
  }
}

function displayMeter(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) || n <= 0 ? "-" : `${Math.round(n)} m`
}

function displayOhPercent(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : `${n.toFixed(2)} %`
}

function laminationOutputGroupColumns() {
  return {
    id: "output",
    header: () => <div className="text-center w-full">Output</div>,
    columns: [
      {
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output weight (kg)" column={column} placeholder="Filter output weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "meter",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output meter" column={column} placeholder="Filter output meter..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-sm">{displayMeter(row.original.meter)}</div>,
        filterFn: includesStringFilterFn,
      },
      {
        id: "adhesiveOh",
        accessorFn: (row: any) => row.adhesiveOhItemName ?? "",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Adhesive OH" column={column} placeholder="Filter adhesive OH..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayValue(row.original.adhesiveOhItemName)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        id: "adhesiveNco",
        accessorFn: (row: any) => row.adhesiveNcoItemName ?? "",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Adhesive NCO" column={column} placeholder="Filter adhesive NCO..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayValue(row.original.adhesiveNcoItemName)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "ohPercent",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="OH %" column={column} placeholder="Filter OH %..." />
        ),
        cell: ({ row }: { row: any }) => <div className="text-sm">{displayOhPercent(row.original.ohPercent)}</div>,
        filterFn: includesStringFilterFn,
      },
    ],
  }
}

function loadedFilmCells(
  entry: { jobCardId: number; roll: any } | null,
  opts: {
    canEdit: boolean
    wastage: string
    balance: string
    semiConsumed: boolean
    onWastage: (value: string) => void
    onBalance: (value: string) => void
    onSemiConsumed: (checked: boolean) => void
    onUnload: (jobCardId: number, rollId: number) => void
    unloadDisabled: boolean
  }
) {
  const roll = entry?.roll
  if (!roll) {
    return (
      <>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
        <td className="py-1.5 px-2" />
      </>
    )
  }
  return (
    <>
      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
        {displayStructure(roll.item_name ?? roll.itemName)}
      </td>
      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
        {roll.size != null ? String(roll.size) : "—"}
      </td>
      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
        {roll.micron != null ? String(roll.micron) : "—"}
      </td>
      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">
        {formatWeightWithMeter(roll.netweight, roll.meter)}
      </td>
      <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
        <NonNegativeDecimalInput
          disabled={!opts.canEdit}
          value={opts.wastage}
          onValueChange={opts.onWastage}
        />
      </td>
      <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
        <NonNegativeDecimalInput
          disabled={!opts.canEdit || opts.semiConsumed}
          value={opts.semiConsumed ? "" : opts.balance}
                          onValueChange={opts.onBalance}
        />
      </td>
      <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={opts.semiConsumed}
          disabled={!opts.canEdit || opts.unloadDisabled}
          aria-label="Semi consumed"
          title="Keep this roll loaded; do not create a balance roll"
          onCheckedChange={(checked) => opts.onSemiConsumed(checked === true)}
        />
      </td>
      <td className="py-1.5 px-2 text-right" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Remove loaded roll"
          disabled={opts.unloadDisabled}
          onClick={() => void opts.onUnload(entry.jobCardId, roll.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </td>
    </>
  )
}

export function LaminationPanel(props: LaminationPanelProps) {
  const {
    laminationSelectedWo,
    laminationRollsLoading,
    laminationLoadedRolls,
    laminationAddRollForm,
    laminationCreateChildLoading,
    setLaminationCreateChildLoading,
    setLaminationCreateChildMessage,
    setLaminationAddRollForm,
    laminationChildRollsLoading,
    laminationChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    laminationFormCommittedForRollId,
    addLaminationRoll,
    setLaminationFormCommittedForRollId,
    setLaminationChildRollsFromDb,
    getRollsStockByWorkOrder,
    setLaminationRollsRefreshKey,
    laminationCreateChildMessage,
    floorLaminationBarcode,
    setFloorLaminationBarcode,
    setFloorLaminationBarcodeError,
    floorLaminationBarcodeChecking,
    handleFloorLaminationBarcodeSubmit,
    floorLaminationWipRollsLoading,
    openFloorLaminationWipPicker,
    floorLaminationBarcodeError,
    floorLaminationWipPickerOpen,
    closeFloorLaminationWipPicker,
    floorLaminationWipRollsError,
    floorLaminationWipStockColumns,
    floorLaminationWipRolls,
    floorLaminationRmPickerOpen,
    closeFloorLaminationRmPicker,
    floorLaminationRmRollsLoading,
    floorLaminationRmRollsError,
    floorLaminationRmStockColumns,
    floorLaminationRmRolls,
    openFloorLaminationRmPicker,
    floorLaminationDetailWipBarcode,
    setFloorLaminationDetailWipBarcode,
    floorLaminationDetailRmBarcode,
    setFloorLaminationDetailRmBarcode,
    applyFloorLaminationFromBarcode,
    getLaminationParentRole,
    laminationLoading,
    laminationError,
    laminationWorkOrders,
    setLaminationSelectedWo,
    unloadFloorLoadedRoll,
    onSkipWorkOrder,
  } = props

  const [laminationOperators, setLaminationOperators] = useState<string[]>([])
  const [rmFilmItemFilter, setRmFilmItemFilter] = useState("all")
  const [rmFilmWarehouseFilter, setRmFilmWarehouseFilter] = useState<"all" | "virgin_rm" | "rm_balance">("all")
  const [rmFilmItems, setRmFilmItems] = useState<MenuItem[]>([])
  const [adhesiveItems, setAdhesiveItems] = useState<MenuItem[]>([])

  useEffect(() => {
    let cancelled = false
    getAllOperators(0, 500)
      .then((ops) => {
        if (cancelled) return
        const names = ops
          .filter((op) => (op.operation ?? "").toLowerCase() === "lamination")
          .map((op) => op.operatorName.trim())
          .filter(Boolean)
        setLaminationOperators(Array.from(new Set(names)))
      })
      .catch(() => {
        if (!cancelled) setLaminationOperators([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!laminationAddRollForm) return
    const current = laminationAddRollForm.operatorName?.trim() ?? ""
    if (current && laminationOperators.includes(current)) return
    const next = laminationOperators[0] ?? ""
    if (current === next) return
    setLaminationAddRollForm((prev: any) => (prev ? { ...prev, operatorName: next } : prev))
  }, [laminationOperators, laminationAddRollForm?.roll?.id])

  useEffect(() => {
    let cancelled = false
    getItemsByGroupForMenu(RM_ADHESIVE_GROUP)
      .then((items) => {
        if (!cancelled) setAdhesiveItems(items)
      })
      .catch(() => {
        if (!cancelled) setAdhesiveItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!laminationAddRollForm || adhesiveItems.length === 0) return
    const oh = pickAdhesiveByHint(adhesiveItems, "oh")
    const nco = pickAdhesiveByHint(adhesiveItems, "nco")
    setLaminationAddRollForm((prev: any) => {
      if (!prev) return prev
      const nextOh = prev.adhesiveOhItemId || (oh ? String(oh.id) : "")
      const nextNco = prev.adhesiveNcoItemId || (nco ? String(nco.id) : "")
      if (nextOh === prev.adhesiveOhItemId && nextNco === prev.adhesiveNcoItemId) return prev
      return { ...prev, adhesiveOhItemId: nextOh, adhesiveNcoItemId: nextNco }
    })
  }, [adhesiveItems, laminationAddRollForm?.roll?.id])

  useEffect(() => {
    if (!floorLaminationRmPickerOpen) {
      setRmFilmItemFilter("all")
      setRmFilmWarehouseFilter("all")
      return
    }
    let cancelled = false
    getItemsByGroupForMenu(RM_FILM_GROUP)
      .then((items) => {
        if (!cancelled) setRmFilmItems(items)
      })
      .catch(() => {
        if (!cancelled) setRmFilmItems([])
      })
    return () => {
      cancelled = true
    }
  }, [floorLaminationRmPickerOpen])

  const rmFilmItemBadges = useMemo(() => {
    const fromMaster = rmFilmItems
      .map((item) => (item.item_code || item.name || "").trim())
      .filter(Boolean)
    if (fromMaster.length > 0) return fromMaster
    const unique = new Map<string, string>()
    for (const roll of floorLaminationRmRolls) {
      const code = (roll.itemCode || "").trim()
      if (code && !unique.has(code.toLowerCase())) unique.set(code.toLowerCase(), code)
    }
    return [...unique.values()]
  }, [rmFilmItems, floorLaminationRmRolls])

  const filteredFloorLaminationRmRolls = useMemo(() => {
    return floorLaminationRmRolls.filter((roll: { itemCode?: string | null; stage?: string | null }) => {
      if (rmFilmItemFilter !== "all") {
        const selected = rmFilmItemFilter.toLowerCase()
        if ((roll.itemCode || "").trim().toLowerCase() !== selected) return false
      }
      if (rmFilmWarehouseFilter !== "all") {
        const stage = (roll.stage ?? "").toLowerCase().replace(/-/g, "_")
        if (stage !== rmFilmWarehouseFilter) return false
      }
      return true
    })
  }, [floorLaminationRmRolls, rmFilmItemFilter, rmFilmWarehouseFilter])

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )

  const wipParent = laminationLoadedRolls.find((r: any) => getLaminationParentRole(r.roll.stage) === "wip") ?? null
  const rmParent = laminationLoadedRolls.find((r: any) => getLaminationParentRole(r.roll.stage) === "rm") ?? null
  const bothParentsLoaded = wipParent != null && rmParent != null
  const sameJobCard = bothParentsLoaded && wipParent.jobCardId === rmParent.jobCardId
  const canProduce = bothParentsLoaded && sameJobCard

  const wipFilmLabel = wipStageLabel(
    allowedWipStagesForDept("Lamination", laminationSelectedWo?.skippedOperations)[0]
  )
  const input1Label = `Input 1 (${wipFilmLabel})`
  const input2Label = "Input 2 (RM Film)"

  const laminationProducedTotals = useMemo(() => {
    return laminationChildRollsFromDb.reduce(
      (acc: { rollCount: number; netWeight: number; wastage: number }, row: any) => {
        acc.rollCount += 1
        acc.netWeight += Number(row.netweight || 0)
        acc.wastage += Number(row.wastage || 0)
        return acc
      },
      { rollCount: 0, netWeight: 0, wastage: 0 }
    )
  }, [laminationChildRollsFromDb])

  const handleUnloadLaminationRoll = async (jobCardId: number, rollId: number) => {
    try {
      setLaminationCreateChildLoading(true)
      setLaminationCreateChildMessage(null)
      await unloadFloorLoadedRoll(jobCardId, rollId, "lamination")
      setLaminationCreateChildMessage("Loaded roll removed.")
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not unload roll."
      setLaminationCreateChildMessage(detail)
    } finally {
      setLaminationCreateChildLoading(false)
    }
  }

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

  const handleLaminationProducedRollReprint = async (r: any) => {
    const wo = laminationSelectedWo
    if (!wo || !wipPrintingTemplate) return
    try {
      setLaminationCreateChildLoading(true)
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
          micron: r.micron,
          netweight: r.netweight,
          wastage: r.wastage,
          operatorName: r.operatorName,
          shift: r.shift,
          remark: r.remark,
          itemName: wo.itemName ?? r.itemName ?? null,
        },
      }
      const job = await createPrintJob({
        name: `Lamination Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
        template_id: wipPrintingTemplate.id,
        data: printData,
        copies: 1,
      })
      setLaminationCreateChildMessage("Label reprint sent to printer.")
      pollPrintJob(job.id)
    } catch {
      setLaminationCreateChildMessage("Failed to send reprint to printer.")
    } finally {
      setLaminationCreateChildLoading(false)
    }
  }

  const laminationProducedRollColumns = useMemo(
    () => [
      asSingleColumnGroup("snoGroup", {
        id: "sno",
        header: () => <div>S. no.</div>,
        cell: ({ row }: { row: any }) => <div className="text-sm">{row.index + 1}</div>,
      }),
      eclInputGroupColumns("input1", input1Label, (row) =>
        pickEclProducedParents(row.parentRolls, getLaminationParentRole).input1
      ),
      eclInputGroupColumns("input2", input2Label, (row) =>
        pickEclProducedParents(row.parentRolls, getLaminationParentRole).input2
      ),
      laminationOutputGroupColumns(),
      asSingleColumnGroup("operatorNameGroup", {
        accessorKey: "operatorName",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Operator name" column={column} placeholder="Filter operator..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayValue(row.original.operatorName)}</div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("shiftGroup", {
        accessorKey: "shift",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Shift" column={column} placeholder="Filter shift..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayValue(row.original.shift)}</div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("reprintGroup", {
        id: "reprint",
        header: () => <div className="text-left">Reprint</div>,
        cell: ({ row }: { row: any }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!wipPrintingTemplate || laminationCreateChildLoading}
              onClick={() => handleLaminationProducedRollReprint(row.original)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [wipPrintingTemplate, laminationCreateChildLoading, laminationSelectedWo, input1Label, input2Label, getLaminationParentRole]
  )

  const getLaminationProducedRowGroupPath = useMemo(
    () =>
      createDualInputGroupPathGetter(laminationChildRollsFromDb, (row: any) => {
        const { input1, input2 } = pickEclProducedParents(row.parentRolls, getLaminationParentRole)
        return { input1Id: input1?.id ?? null, input2Id: input2?.id ?? null }
      }),
    [laminationChildRollsFromDb, getLaminationParentRole]
  )

  const laminationLoadedFilmRows = useMemo(() => {
    const byJob = new Map<
      number,
      {
        jobCardId: number
        jobCardNumber: string
        input1: { jobCardId: number; roll: any } | null
        input2: { jobCardId: number; roll: any } | null
      }
    >()
    for (const entry of laminationLoadedRolls) {
      const existing = byJob.get(entry.jobCardId) ?? {
        jobCardId: entry.jobCardId,
        jobCardNumber: entry.jobCardNumber,
        input1: null,
        input2: null,
      }
      const role = getLaminationParentRole(entry.roll.stage)
      if (role === "wip") existing.input1 = entry
      else if (role === "rm") existing.input2 = entry
      byJob.set(entry.jobCardId, existing)
    }
    return Array.from(byJob.values())
  }, [laminationLoadedRolls, getLaminationParentRole])

  const renderLoadSlot = (
    role: "wip" | "rm",
    barcode: string,
    setBarcode: (v: string) => void,
    onSelectStock: () => void,
    stockLoading: boolean
  ) => {
    const title = role === "wip" ? input1Label : input2Label
    const placeholder =
      role === "wip" ? `Scan ${input1Label} barcode` : `Scan ${input2Label} barcode`
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}: not loaded yet.</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[min(100%,16rem)] flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={placeholder}
              value={barcode}
              onChange={(e) => {
                setBarcode(e.target.value)
                setFloorLaminationBarcodeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void applyFloorLaminationFromBarcode(barcode, { slot: role })
                }
              }}
              disabled={floorLaminationBarcodeChecking}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={floorLaminationBarcodeChecking || stockLoading}
            onClick={() => void onSelectStock()}
          >
            Select Stock
          </Button>
        </div>
      </div>
    )
  }

  const stockPickers = (
    <>
      {floorLaminationWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select {input1Label}</CardTitle>
                <CardDescription>
                  {isOperationSkipped(laminationSelectedWo?.skippedOperations, "ECL")
                    ? isOperationSkipped(laminationSelectedWo?.skippedOperations, "Inspection")
                      ? "ECL and Inspection are skipped on this work order, so load a WIP Printing roll as Input 1."
                      : "ECL is skipped on this work order, so load a WIP Inspection roll as Input 1."
                    : "Load a WIP ECL roll as Input 1."}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFloorLaminationWipPicker} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {floorLaminationWipRollsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                  </div>
                </div>
              ) : (
                <>
                  {floorLaminationWipRollsError && <p className="text-sm text-red-500 mb-3">{floorLaminationWipRollsError}</p>}
                  <DataTable
                    key="floor-lamination-wip-picker"
                    columns={floorLaminationWipStockColumns}
                    data={floorLaminationWipRolls}
                    getRowId={(row: any) => String(row.id)}
                    singleRowSelection
                    scrollable
                    scrollHeight="60vh"
                    bulkActions={(selectedRows: any[]) => (
                      <Button
                        size="sm"
                        disabled={floorLaminationBarcodeChecking}
                        onClick={async () => {
                          const selected = selectedRows[0]
                          const barcode = selected?.barcode?.trim()
                          if (!barcode) return
                          await applyFloorLaminationFromBarcode(barcode, { closePicker: true, slot: "wip" })
                        }}
                      >
                        {floorLaminationBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                      </Button>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeFloorLaminationWipPicker}>
                  Close
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
      {floorLaminationRmPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select {input2Label}</CardTitle>
                <CardDescription>
                  Pick a virgin RM or RM Balance film as Input 2.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFloorLaminationRmPicker} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {floorLaminationRmRollsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                  </div>
                </div>
              ) : (
                <>
                  {floorLaminationRmRollsError && <p className="text-sm text-red-500 mb-3">{floorLaminationRmRollsError}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        asChild
                        variant={rmFilmItemFilter === "all" ? "default" : "outline"}
                        className="cursor-pointer"
                      >
                        <button type="button" onClick={() => setRmFilmItemFilter("all")}>
                          All
                        </button>
                      </Badge>
                      {rmFilmItemBadges.map((itemCode) => (
                        <Badge
                          key={itemCode}
                          asChild
                          variant={rmFilmItemFilter.toLowerCase() === itemCode.toLowerCase() ? "default" : "outline"}
                          className="cursor-pointer"
                        >
                          <button type="button" onClick={() => setRmFilmItemFilter(itemCode)}>
                            {itemCode}
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 ml-auto">
                      {(
                        [
                          { value: "all", label: "ALL" },
                          { value: "virgin_rm", label: "RM Virgin" },
                          { value: "rm_balance", label: "RM Balance" },
                        ] as const
                      ).map((warehouse) => (
                        <Badge
                          key={warehouse.value}
                          asChild
                          variant={rmFilmWarehouseFilter === warehouse.value ? "default" : "outline"}
                          className="cursor-pointer"
                        >
                          <button type="button" onClick={() => setRmFilmWarehouseFilter(warehouse.value)}>
                            {warehouse.label}
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DataTable
                    key={`floor-lamination-rm-picker-${rmFilmItemFilter}-${rmFilmWarehouseFilter}`}
                    columns={floorLaminationRmStockColumns}
                    data={filteredFloorLaminationRmRolls}
                    getRowId={(row: any) => String(row.id)}
                    singleRowSelection
                    scrollable
                    scrollHeight="60vh"
                    bulkActions={(selectedRows: any[]) => (
                      <Button
                        size="sm"
                        disabled={floorLaminationBarcodeChecking}
                        onClick={async () => {
                          const selected = selectedRows[0]
                          const barcode = selected?.barcode?.trim()
                          if (!barcode) return
                          await applyFloorLaminationFromBarcode(barcode, { closePicker: true, slot: "rm" })
                        }}
                      >
                        {floorLaminationBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                      </Button>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeFloorLaminationRmPicker}>
                  Close
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )

  return laminationSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col-reverse gap-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Loaded films</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Lamination needs two films on the same job card: {input1Label} and {input2Label}.
          </p>
          {laminationRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              {!wipParent &&
                renderLoadSlot(
                  "wip",
                  floorLaminationDetailWipBarcode,
                  setFloorLaminationDetailWipBarcode,
                  openFloorLaminationWipPicker,
                  floorLaminationWipRollsLoading
                )}
              {!rmParent &&
                renderLoadSlot(
                  "rm",
                  floorLaminationDetailRmBarcode,
                  setFloorLaminationDetailRmBarcode,
                  openFloorLaminationRmPicker,
                  floorLaminationRmRollsLoading
                )}
              {floorLaminationBarcodeError && <p className="text-sm text-red-500">{floorLaminationBarcodeError}</p>}
              {bothParentsLoaded && !sameJobCard && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Both films must be loaded on the same Lamination job card before producing.
                </p>
              )}
              {laminationLoadedFilmRows.length > 0 && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th rowSpan={2} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle">
                          Job card
                        </th>
                        <th
                          colSpan={8}
                          className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                        >
                          {input1Label}
                        </th>
                        <th
                          colSpan={8}
                          className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                        >
                          {input2Label}
                        </th>
                        <th
                          colSpan={5}
                          className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                        >
                          Output
                        </th>
                        <th rowSpan={2} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle border-l border-gray-200 dark:border-gray-700">
                          Operator name
                        </th>
                        <th rowSpan={2} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle">
                          Shift
                        </th>
                        <th rowSpan={2} className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle">
                          Remark
                        </th>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Semi consumed", ""].map(
                          (title, i) => (
                            <th
                              key={`input1-${title || "remove"}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""} ${title === "Structure" ? "w-16 max-w-[4.75rem]" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Semi consumed", ""].map(
                          (title, i) => (
                            <th
                              key={`input2-${title || "remove"}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""} ${title === "Structure" ? "w-16 max-w-[4.75rem]" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                        {["Output weight (kg)", "Output meter", "Adhesive OH", "Adhesive NCO", "OH %"].map(
                          (title, i) => (
                            <th
                              key={`output-${title}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {laminationLoadedFilmRows.map((row) => {
                        const canEditRow = canProduce && Boolean(laminationAddRollForm)
                        const showProduce =
                          canEditRow && row.jobCardId === laminationAddRollForm?.jobCardId
                        return (
                          <tr
                            key={row.jobCardId}
                            className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                          >
                            <td className="py-1.5 px-2 text-gray-900 dark:text-gray-100">
                              {row.jobCardNumber}
                            </td>
                            {loadedFilmCells(row.input1, {
                              canEdit: canEditRow,
                              wastage: laminationAddRollForm?.wipWastage ?? "0",
                              balance: laminationAddRollForm?.wipBalance ?? "",
                              semiConsumed: Boolean(laminationAddRollForm?.wipSemiConsumed),
                              onWastage: (value) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev ? { ...prev, wipWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        wipBalance: value,
                                        wipSemiConsumed:
                                          parseNonNegativeDecimal(value) != null ? false : prev.wipSemiConsumed,
                                      }
                                    : prev
                                ),
                              onSemiConsumed: (checked) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        wipSemiConsumed: checked,
                                        wipBalance: checked ? "" : prev.wipBalance,
                                      }
                                    : prev
                                ),
                              onUnload: handleUnloadLaminationRoll,
                              unloadDisabled: laminationCreateChildLoading,
                            })}
                            {loadedFilmCells(row.input2, {
                              canEdit: canEditRow,
                              wastage: laminationAddRollForm?.rmWastage ?? "0",
                              balance: laminationAddRollForm?.rmBalance ?? "",
                              semiConsumed: Boolean(laminationAddRollForm?.rmSemiConsumed),
                              onWastage: (value) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev ? { ...prev, rmWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        rmBalance: value,
                                        rmSemiConsumed:
                                          parseNonNegativeDecimal(value) != null ? false : prev.rmSemiConsumed,
                                      }
                                    : prev
                                ),
                              onSemiConsumed: (checked) =>
                                setLaminationAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        rmSemiConsumed: checked,
                                        rmBalance: checked ? "" : prev.rmBalance,
                                      }
                                    : prev
                                ),
                              onUnload: handleUnloadLaminationRoll,
                              unloadDisabled: laminationCreateChildLoading,
                            })}
                            {showProduce && laminationAddRollForm ? (
                              <>
                                <td className="py-1.5 px-2 border-l border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                  <NonNegativeDecimalInput
                                    className="h-7 w-24 px-1.5 text-xs"
                                    value={laminationAddRollForm.netweight}
                                    onValueChange={(value) =>
                                      setLaminationAddRollForm((prev: any) => {
                                        if (!prev) return prev
                                        const kg = parseNonNegativeDecimal(value)
                                        return {
                                          ...prev,
                                          netweight: value,
                                          meter: outputMeterFromParent(kg, wipParent?.roll) || prev.meter,
                                        }
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <NonNegativeDecimalInput
                                    className="h-7 w-20 px-1.5 text-xs"
                                    value={laminationAddRollForm.meter}
                                    onValueChange={(value) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, meter: value } : prev
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <AdhesiveItemSelect
                                    value={laminationAddRollForm.adhesiveOhItemId}
                                    items={adhesiveItems}
                                    placeholder="OH"
                                    onChange={(value) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, adhesiveOhItemId: value } : prev
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <AdhesiveItemSelect
                                    value={laminationAddRollForm.adhesiveNcoItemId}
                                    items={adhesiveItems}
                                    placeholder="NCO"
                                    onChange={(value) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, adhesiveNcoItemId: value } : prev
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <NonNegativeDecimalInput
                                    className="h-7 w-16 px-1.5 text-xs"
                                    value={laminationAddRollForm.ohPercent}
                                    onValueChange={(value) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, ohPercent: value } : prev
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-1.5 px-2 border-l border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={
                                      laminationAddRollForm.operatorName && laminationOperators.includes(laminationAddRollForm.operatorName)
                                        ? laminationAddRollForm.operatorName
                                        : undefined
                                    }
                                    onValueChange={(value) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, operatorName: value } : prev
                                      )
                                    }
                                  >
                                    <SelectTrigger size="sm" className="h-7 w-36 px-1.5 text-xs">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {laminationOperators.map((name) => (
                                        <SelectItem key={name} value={name}>
                                          {name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={laminationAddRollForm.shift || undefined}
                                    onValueChange={(value) =>
                                      setLaminationAddRollForm((prev: any) => (prev ? { ...prev, shift: value } : prev))
                                    }
                                  >
                                    <SelectTrigger size="sm" className="h-7 w-16 px-1.5 text-xs">
                                      <SelectValue placeholder="Shift" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LAMINATION_SHIFTS.map((shiftOption) => (
                                        <SelectItem key={shiftOption} value={shiftOption}>
                                          {shiftOption}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="text"
                                    className="h-7 w-32 px-1.5 text-xs"
                                    value={laminationAddRollForm.remark}
                                    onChange={(e) =>
                                      setLaminationAddRollForm((prev: any) =>
                                        prev ? { ...prev, remark: e.target.value } : prev
                                      )
                                    }
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">—</td>
                              </>
                            )}
                          </tr>
                        )
                      })}
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
            {!laminationChildRollsLoading && (
              <div className="rounded-[2px] border border-zinc-600 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total produced rolls
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                        {laminationProducedTotals.rollCount}
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total output weight (kg)
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                        {laminationProducedTotals.netWeight.toFixed(2)} kg
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total wastage (kg)
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">
                        {laminationProducedTotals.wastage.toFixed(2)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {laminationChildRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
          ) : laminationChildRollsFromDb.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No produced rolls found for this work order.</p>
          ) : (
            <DataTable
              columns={laminationProducedRollColumns}
              data={laminationChildRollsFromDb}
              getRowGroupPath={getLaminationProducedRowGroupPath}
              scrollable
              scrollHeight="45vh"
              compact
              showSelectionSummary={false}
            />
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
        {!laminationRollsLoading && canProduce && laminationAddRollForm && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            disabled={
              laminationCreateChildLoading ||
              !hasSemiConsumeChoice(laminationAddRollForm.wipBalance, laminationAddRollForm.wipSemiConsumed) ||
              !hasSemiConsumeChoice(laminationAddRollForm.rmBalance, laminationAddRollForm.rmSemiConsumed) ||
              laminationFormCommittedForRollId === laminationAddRollForm.roll.id
            }
            onClick={async () => {
              const form = laminationAddRollForm
              const wo = laminationSelectedWo
              if (!form || wo?.itemId == null || !wipParent || !rmParent) return
              if (wipParent.jobCardId !== rmParent.jobCardId) {
                setLaminationCreateChildMessage("Both films must be on the same Lamination job card.")
                return
              }
              try {
                setLaminationCreateChildLoading(true)
                setLaminationCreateChildMessage(null)
                const parentIds = [wipParent.roll.id, rmParent.roll.id]
                const wipSemiConsumed = Boolean(form.wipSemiConsumed)
                const rmSemiConsumed = Boolean(form.rmSemiConsumed)
                const wipBalanceValue = wipSemiConsumed ? null : parseNonNegativeDecimal(form.wipBalance || "")
                const rmBalanceValue = rmSemiConsumed ? null : parseNonNegativeDecimal(form.rmBalance || "")
                if ((!wipSemiConsumed && wipBalanceValue == null) || (!rmSemiConsumed && rmBalanceValue == null)) {
                  setLaminationCreateChildMessage("Enter balance weight or tick Semi consumed for both films.")
                  return
                }
                const outputWeight = parseNonNegativeDecimal(form.netweight || "") ?? undefined
                const outputMeter = parseNonNegativeDecimal(form.meter || "") ?? undefined
                const ohPercent = parseNonNegativeDecimal(form.ohPercent || "") ?? undefined
                const adhesiveOhItemId = form.adhesiveOhItemId ? Number(form.adhesiveOhItemId) : undefined
                const adhesiveNcoItemId = form.adhesiveNcoItemId ? Number(form.adhesiveNcoItemId) : undefined
                const wipWastage = parseNonNegativeDecimal(form.wipWastage || "") ?? 0
                const rmWastage = parseNonNegativeDecimal(form.rmWastage || "") ?? 0
                const totalWastage = wipWastage + rmWastage
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
                      size: form.size ? parseFloat(form.size) : undefined,
                      micron: form.micron ? parseFloat(form.micron) : undefined,
                      netweight: outputWeight,
                      meter: outputMeter,
                      grossweight: outputWeight,
                      wastage: totalWastage,
                      operatorName: form.operatorName || undefined,
                      shift: form.shift || undefined,
                      remark: form.remark || undefined,
                      adhesiveOhItemId: Number.isFinite(adhesiveOhItemId) ? adhesiveOhItemId : undefined,
                      adhesiveNcoItemId: Number.isFinite(adhesiveNcoItemId) ? adhesiveNcoItemId : undefined,
                      ohPercent,
                      itemName: wo.itemName ?? null,
                    },
                  }
                  const job = await createPrintJob({
                    name: `Lamination - ${form.jobCardNumber}`,
                    template_id: wipPrintingTemplate.id,
                    data: printData,
                    copies: 1,
                  })
                  pollPrintJob(job.id)
                }
                await addLaminationRoll(form.jobCardId, {
                  itemId: wo.itemId,
                  rollno: "",
                  size: form.size ? parseFloat(form.size) : undefined,
                  micron: form.micron ? parseFloat(form.micron) : undefined,
                  netweight: outputWeight,
                  meter: outputMeter,
                  grossweight: outputWeight,
                  wastage: totalWastage,
                  operatorName: form.operatorName.trim() || undefined,
                  shift: form.shift.trim() || undefined,
                  remark: form.remark.trim() || undefined,
                  adhesiveOhItemId: Number.isFinite(adhesiveOhItemId) ? adhesiveOhItemId : undefined,
                  adhesiveNcoItemId: Number.isFinite(adhesiveNcoItemId) ? adhesiveNcoItemId : undefined,
                  ohPercent,
                  gradeId: form.parent.gradeId,
                  parentRollIds: parentIds,
                  parentBalanceWeights: [wipBalanceValue, rmBalanceValue],
                  parentWastages: [wipWastage, rmWastage],
                  parentSemiConsumed: [wipSemiConsumed, rmSemiConsumed],
                  weightAtTime: outputWeight,
                })
                getRollsStockByWorkOrder(wo.id, "wip_lamination").then(setLaminationChildRollsFromDb)
                if (wipSemiConsumed || rmSemiConsumed) {
                  setLaminationFormCommittedForRollId(null)
                  setLaminationAddRollForm((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          netweight: "",
                          meter: "",
                          wipWastage: "0",
                          rmWastage: "0",
                          wipBalance: wipSemiConsumed ? "" : prev.wipBalance,
                          rmBalance: rmSemiConsumed ? "" : prev.rmBalance,
                          wipSemiConsumed: false,
                          rmSemiConsumed: false,
                          remark: "",
                        }
                      : prev
                  )
                  setLaminationCreateChildMessage("Lamination roll created. Semi-consumed films kept on the machine.")
                } else {
                  setLaminationFormCommittedForRollId(form.roll.id)
                  setLaminationCreateChildMessage(
                    wipPrintingTemplate
                      ? "Roll added and label sent to printer."
                      : "Roll added and movement recorded. No WIP printing template configured."
                  )
                }
                setLaminationRollsRefreshKey((key: number) => key + 1)
              } catch {
                setLaminationCreateChildMessage(
                  wipPrintingTemplate
                    ? "Failed to print label. Roll not added or movement not recorded."
                    : "Failed to add roll or record movement."
                )
              } finally {
                setLaminationCreateChildLoading(false)
              }
            }}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        )}
        {laminationCreateChildMessage && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{laminationCreateChildMessage}</p>
        )}
      </div>
      {stockPickers}
    </div>
  ) : (
    <>
      <div className="mb-4 space-y-1">
        <Label htmlFor="floor-lamination-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode ({input1Label})
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Load {input1Label} first to open the work order, then load {input2Label}.
        </p>
        <div className="flex flex-wrap items-center gap-2 max-w-2xl">
          <div className="relative min-w-[min(100%,18rem)] flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="floor-lamination-barcode"
              type="text"
              placeholder={`Scan or enter ${input1Label} barcode`}
              value={floorLaminationBarcode}
              onChange={(e) => {
                setFloorLaminationBarcode(e.target.value)
                setFloorLaminationBarcodeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleFloorLaminationBarcodeSubmit()
                }
              }}
              disabled={floorLaminationBarcodeChecking}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={floorLaminationBarcodeChecking || floorLaminationWipRollsLoading}
            onClick={() => void openFloorLaminationWipPicker()}
          >
            Select Stock
          </Button>
        </div>
        {floorLaminationBarcodeError && <p className="text-sm text-red-500">{floorLaminationBarcodeError}</p>}
      </div>
      {stockPickers}
      {laminationLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : laminationError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{laminationError}</p>
      ) : laminationWorkOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
      ) : (
        <DataTable
          columns={floorWorkOrderColumns}
          data={laminationWorkOrders}
          getRowId={(row) => String(row.id)}
          onRowClick={(wo) => setLaminationSelectedWo(wo)}
          scrollable
          scrollHeight="65vh"
          showSelectionSummary={false}
        />
      )}
    </>
  )
}
