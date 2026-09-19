import { Printer, ScanBarcode, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ColumnHeader } from "@/components/column-header"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { getItemsByGroupForMenu, type MenuItem } from "@/lib/item-api"
import { deleteProducedRoll, jobCardApiErrorMessage, updateProducedRoll } from "@/lib/job-card-api"
import {
  hasSemiConsumeChoice,
  NonNegativeDecimalInput,
  parseNonNegativeDecimal,
} from "@/lib/non-negative-decimal-input"
import { getAllOperators } from "@/lib/operator-api"
import { createDualInputGroupPathGetter, includesStringFilterFn } from "@/lib/table-filter-utils"
import { allowedWipStagesForDept, isOperationSkipped, wipStageLabel } from "@/lib/wo-flow"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"
import {
  isProducedRollLocked,
  PRODUCED_ROLL_DELETE_CONFIRM,
  ProducedRollEditField,
  ProducedRollRowActions,
  producedRollEditDialogClassName,
  producedRollEditInputClassName,
} from "../produced-roll-actions"

type EclPanelProps = any

const ECL_SHIFTS = ["A", "B"]
const RM_FILM_GROUP = "rm film"

function displayValue(value: unknown) {
  if (value == null || value === "") return "-"
  return String(value)
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
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(pick(row.original)?.itemName)}</div>
        ),
        meta: mergeByParent,
      },
      {
        id: `${id}Size`,
        header: () => <div>Size</div>,
        cell: ({ row }: { row: any }) => {
          const size = pick(row.original)?.size
          return <div className="text-xs">{size != null ? String(size) : "-"}</div>
        },
        meta: mergeByParent,
      },
      {
        id: `${id}Micron`,
        header: () => <div>Micron</div>,
        cell: ({ row }: { row: any }) => {
          const micron = pick(row.original)?.micron
          return <div className="text-xs">{micron != null ? String(micron) : "-"}</div>
        },
        meta: mergeByParent,
      },
      {
        id: `${id}InputWeight`,
        header: () => <div>Input weight</div>,
        cell: ({ row }: { row: any }) => {
          const parent = pick(row.original)
          return (
            <div className="text-xs">
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
          <div className="text-xs">{displayKg(pick(row.original)?.wastage)}</div>
        ),
        meta: mergeByParent,
      },
      {
        id: `${id}BalanceWeight`,
        header: () => <div>Balance weight</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(pick(row.original)?.balanceWeight)}</div>
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

function eclExtrusionGroupColumns() {
  return {
    id: "extrusion",
    header: () => <div className="text-center w-full">Extrusion</div>,
    columns: [
      {
        accessorKey: "inkGsm",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Coating (kg)" column={column} placeholder="Filter coating..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">
            {row.original.inkGsm != null ? `${Number(row.original.inkGsm).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "trimWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Trim wastage (kg)" column={column} placeholder="Filter trim wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.trimWastage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "lumpsWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Lumps wastage (kg)" column={column} placeholder="Filter lumps wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.lumpsWastage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "eclOutputWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output wastage (kg)" column={column} placeholder="Filter output wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayKg(row.original.eclOutputWastage)}</div>
        ),
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
        {roll.item_name ?? roll.itemName ?? "—"}
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
          aria-label="Roll continue"
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

export function EclPanel(props: EclPanelProps) {
  const {
    eclSelectedWo,
    eclRollsLoading,
    eclLoadedRolls,
    eclAddRollForm,
    eclCreateChildLoading,
    setEclCreateChildLoading,
    setEclCreateChildMessage,
    setEclAddRollForm,
    eclChildRollsLoading,
    eclChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    eclFormCommittedForRollId,
    addEclRoll,
    setEclFormCommittedForRollId,
    setEclChildRollsFromDb,
    getRollsStockByWorkOrder,
    setEclRollsRefreshKey,
    eclCreateChildMessage,
    floorEclBarcode,
    setFloorEclBarcode,
    setFloorEclBarcodeError,
    floorEclBarcodeChecking,
    handleFloorEclBarcodeSubmit,
    floorEclWipRollsLoading,
    openFloorEclWipPicker,
    floorEclBarcodeError,
    floorEclWipPickerOpen,
    closeFloorEclWipPicker,
    floorEclWipRollsError,
    floorEclWipStockColumns,
    floorEclWipRolls,
    floorEclRmPickerOpen,
    closeFloorEclRmPicker,
    floorEclRmRollsLoading,
    floorEclRmRollsError,
    floorEclRmStockColumns,
    floorEclRmRolls,
    openFloorEclRmPicker,
    floorEclDetailWipBarcode,
    setFloorEclDetailWipBarcode,
    floorEclDetailRmBarcode,
    setFloorEclDetailRmBarcode,
    applyFloorEclFromBarcode,
    getEclParentRole,
    eclLoading,
    eclError,
    eclWorkOrders,
    setEclSelectedWo,
    unloadFloorLoadedRoll,
    onSkipWorkOrder,
  } = props

  const [eclOperators, setEclOperators] = useState<string[]>([])
  const [rmFilmItemFilter, setRmFilmItemFilter] = useState("all")
  const [rmFilmWarehouseFilter, setRmFilmWarehouseFilter] = useState<"all" | "virgin_rm" | "rm_balance">("all")
  const [rmFilmItems, setRmFilmItems] = useState<MenuItem[]>([])
  const [eclEditRoll, setEclEditRoll] = useState<any>(null)
  const [eclEditSaving, setEclEditSaving] = useState(false)
  const [eclEditForm, setEclEditForm] = useState({
    netweight: "",
    inkGsm: "",
    trimWastage: "",
    lumpsWastage: "",
    eclOutputWastage: "",
    operatorName: "",
    shift: "",
    input1Id: null as number | null,
    input2Id: null as number | null,
    input1Balance: "",
    input2Balance: "",
  })

  useEffect(() => {
    let cancelled = false
    getAllOperators(0, 500)
      .then((ops) => {
        if (cancelled) return
        const names = ops
          .filter((op) => (op.operation ?? "").toLowerCase() === "ecl")
          .map((op) => op.operatorName.trim())
          .filter(Boolean)
        setEclOperators(Array.from(new Set(names)))
      })
      .catch(() => {
        if (!cancelled) setEclOperators([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!eclAddRollForm) return
    const current = eclAddRollForm.operatorName?.trim() ?? ""
    if (current && eclOperators.includes(current)) return
    const next = eclOperators[0] ?? ""
    if (current === next) return
    setEclAddRollForm((prev: any) => (prev ? { ...prev, operatorName: next } : prev))
  }, [eclOperators, eclAddRollForm?.roll?.id])

  useEffect(() => {
    if (!floorEclRmPickerOpen) {
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
  }, [floorEclRmPickerOpen])

  const rmFilmItemBadges = useMemo(() => {
    const fromMaster = rmFilmItems
      .map((item) => (item.item_code || item.name || "").trim())
      .filter(Boolean)
    if (fromMaster.length > 0) return fromMaster
    const unique = new Map<string, string>()
    for (const roll of floorEclRmRolls) {
      const code = (roll.itemCode || "").trim()
      if (code && !unique.has(code.toLowerCase())) unique.set(code.toLowerCase(), code)
    }
    return [...unique.values()]
  }, [rmFilmItems, floorEclRmRolls])

  const filteredFloorEclRmRolls = useMemo(() => {
    return floorEclRmRolls.filter((roll: { itemCode?: string | null; stage?: string | null }) => {
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
  }, [floorEclRmRolls, rmFilmItemFilter, rmFilmWarehouseFilter])

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )

  const wipParent = eclLoadedRolls.find((r: any) => getEclParentRole(r.roll.stage) === "wip") ?? null
  const rmParent = eclLoadedRolls.find((r: any) => getEclParentRole(r.roll.stage) === "rm") ?? null
  const bothParentsLoaded = wipParent != null && rmParent != null
  const sameJobCard = bothParentsLoaded && wipParent.jobCardId === rmParent.jobCardId
  const canProduce = bothParentsLoaded && sameJobCard

  const wipFilmLabel = wipStageLabel(
    allowedWipStagesForDept("ECL", eclSelectedWo?.skippedOperations)[0]
  )
  const input1Label = `Input 1 (${wipFilmLabel})`
  const input2Label = "Input 2 (RM Film)"

  const eclProducedTotals = useMemo(() => {
    return eclChildRollsFromDb.reduce(
      (acc: { rollCount: number; netWeight: number; wastage: number }, row: any) => {
        acc.rollCount += 1
        acc.netWeight += Number(row.netweight || 0)
        acc.wastage += Number(row.wastage || 0)
        return acc
      },
      { rollCount: 0, netWeight: 0, wastage: 0 }
    )
  }, [eclChildRollsFromDb])

  const handleUnloadEclRoll = async (jobCardId: number, rollId: number) => {
    try {
      setEclCreateChildLoading(true)
      setEclCreateChildMessage(null)
      await unloadFloorLoadedRoll(jobCardId, rollId, "ecl")
      setEclCreateChildMessage("Loaded roll removed.")
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not unload roll."
      setEclCreateChildMessage(detail)
    } finally {
      setEclCreateChildLoading(false)
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

  const handleEclProducedRollReprint = async (r: any) => {
    const wo = eclSelectedWo
    if (!wo || !wipPrintingTemplate) return
    try {
      setEclCreateChildLoading(true)
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
          inkGsm: r.inkGsm,
          trimWastage: r.trimWastage,
          lumpsWastage: r.lumpsWastage,
          eclOutputWastage: r.eclOutputWastage,
          operatorName: r.operatorName,
          shift: r.shift,
          remark: r.remark,
          itemName: wo.itemName ?? r.itemName ?? null,
        },
      }
      const job = await createPrintJob({
        name: `ECL Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
        template_id: wipPrintingTemplate.id,
        data: printData,
        copies: 1,
      })
      setEclCreateChildMessage("Label reprint sent to printer.")
      pollPrintJob(job.id)
    } catch {
      setEclCreateChildMessage("Failed to send reprint to printer.")
    } finally {
      setEclCreateChildLoading(false)
    }
  }

  const refreshEclProducedRolls = () => {
    if (!eclSelectedWo) return
    getRollsStockByWorkOrder(eclSelectedWo.id, "wip_ecl").then(setEclChildRollsFromDb)
    setEclRollsRefreshKey((key: number) => key + 1)
  }

  const openEclProducedEdit = (roll: any) => {
    const { input1, input2 } = pickEclProducedParents(roll.parentRolls, getEclParentRole)
    setEclEditForm({
      netweight: roll.netweight != null ? String(roll.netweight) : "",
      inkGsm: roll.inkGsm != null ? String(roll.inkGsm) : "",
      trimWastage: roll.trimWastage != null ? String(roll.trimWastage) : "",
      lumpsWastage: roll.lumpsWastage != null ? String(roll.lumpsWastage) : "",
      eclOutputWastage: roll.eclOutputWastage != null ? String(roll.eclOutputWastage) : "",
      operatorName: roll.operatorName ?? "",
      shift: roll.shift ?? "",
      input1Id: input1?.id ?? null,
      input2Id: input2?.id ?? null,
      input1Balance: input1?.balanceWeight != null ? String(input1.balanceWeight) : "",
      input2Balance: input2?.balanceWeight != null ? String(input2.balanceWeight) : "",
    })
    setEclEditRoll(roll)
  }

  const handleEclProducedRollDelete = async (row: any) => {
    if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM)) return
    try {
      setEclCreateChildLoading(true)
      await deleteProducedRoll(row.id)
      setEclCreateChildMessage("Produced roll deleted.")
      if (eclEditRoll?.id === row.id) setEclEditRoll(null)
      refreshEclProducedRolls()
    } catch (error) {
      setEclCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."))
    } finally {
      setEclCreateChildLoading(false)
    }
  }

  const handleSaveEclProducedEdit = async () => {
    const roll = eclEditRoll
    if (!roll?.id) return
    const parentRollIds = [eclEditForm.input1Id, eclEditForm.input2Id].filter((id): id is number => id != null)
    const netweight = parseNonNegativeDecimal(eclEditForm.netweight)
    try {
      setEclEditSaving(true)
      await updateProducedRoll(roll.id, {
        netweight,
        grossweight: netweight,
        inkGsm: parseNonNegativeDecimal(eclEditForm.inkGsm),
        trimWastage: parseNonNegativeDecimal(eclEditForm.trimWastage),
        lumpsWastage: parseNonNegativeDecimal(eclEditForm.lumpsWastage),
        eclOutputWastage: parseNonNegativeDecimal(eclEditForm.eclOutputWastage),
        operatorName: eclEditForm.operatorName.trim() || null,
        shift: eclEditForm.shift.trim() || null,
        parentRollIds,
        parentBalanceWeights: parentRollIds.map((id) =>
          id === eclEditForm.input1Id
            ? parseNonNegativeDecimal(eclEditForm.input1Balance) ?? 0
            : parseNonNegativeDecimal(eclEditForm.input2Balance) ?? 0
        ),
      })
      setEclCreateChildMessage("Produced roll updated.")
      setEclEditRoll(null)
      refreshEclProducedRolls()
    } catch (error) {
      setEclCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."))
    } finally {
      setEclEditSaving(false)
    }
  }

  const eclProducedRollColumns = useMemo(
    () => [
      eclInputGroupColumns("input1", input1Label, (row) =>
        pickEclProducedParents(row.parentRolls, getEclParentRole).input1
      ),
      eclInputGroupColumns("input2", input2Label, (row) =>
        pickEclProducedParents(row.parentRolls, getEclParentRole).input2
      ),
      eclExtrusionGroupColumns(),
      asSingleColumnGroup("netweightGroup", {
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output weight (kg)" column={column} placeholder="Filter output weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">
            {row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("operatorNameGroup", {
        accessorKey: "operatorName",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Operator name" column={column} placeholder="Filter operator..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.operatorName)}</div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("shiftGroup", {
        accessorKey: "shift",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Shift" column={column} placeholder="Filter shift..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-xs">{displayValue(row.original.shift)}</div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("actionsGroup", {
        id: "actions",
        header: () => <div className="text-left">Actions</div>,
        cell: ({ row }: { row: any }) => (
          <ProducedRollRowActions
            reprintDisabled={!wipPrintingTemplate || eclCreateChildLoading}
            mutateDisabled={eclCreateChildLoading || isProducedRollLocked(row.original)}
            onReprint={() => handleEclProducedRollReprint(row.original)}
            onEdit={() => openEclProducedEdit(row.original)}
            onDelete={() => void handleEclProducedRollDelete(row.original)}
          />
        ),
      }),
    ],
    [wipPrintingTemplate, eclCreateChildLoading, eclSelectedWo, input1Label, input2Label, getEclParentRole]
  )

  const getEclProducedRowGroupPath = useMemo(
    () =>
      createDualInputGroupPathGetter(eclChildRollsFromDb, (row: any) => {
        const { input1, input2 } = pickEclProducedParents(row.parentRolls, getEclParentRole)
        return { input1Id: input1?.id ?? null, input2Id: input2?.id ?? null }
      }),
    [eclChildRollsFromDb, getEclParentRole]
  )

  const eclLoadedFilmRows = useMemo(() => {
    const byJob = new Map<
      number,
      {
        jobCardId: number
        jobCardNumber: string
        input1: { jobCardId: number; roll: any } | null
        input2: { jobCardId: number; roll: any } | null
      }
    >()
    for (const entry of eclLoadedRolls) {
      const existing = byJob.get(entry.jobCardId) ?? {
        jobCardId: entry.jobCardId,
        jobCardNumber: entry.jobCardNumber,
        input1: null,
        input2: null,
      }
      const role = getEclParentRole(entry.roll.stage)
      if (role === "wip") existing.input1 = entry
      else if (role === "rm") existing.input2 = entry
      byJob.set(entry.jobCardId, existing)
    }
    return Array.from(byJob.values())
  }, [eclLoadedRolls, getEclParentRole])

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
                setFloorEclBarcodeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void applyFloorEclFromBarcode(barcode, { slot: role })
                }
              }}
              disabled={floorEclBarcodeChecking}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={floorEclBarcodeChecking || stockLoading}
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
      {floorEclWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select {input1Label}</CardTitle>
                <CardDescription>
                  {isOperationSkipped(eclSelectedWo?.skippedOperations, "Inspection")
                    ? "Inspection is skipped on this work order, so load a WIP Printing roll as Input 1."
                    : "Load a WIP Inspection roll as Input 1."}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFloorEclWipPicker} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {floorEclWipRollsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                  </div>
                </div>
              ) : (
                <>
                  {floorEclWipRollsError && <p className="text-sm text-red-500 mb-3">{floorEclWipRollsError}</p>}
                  <DataTable
                    key="floor-ecl-wip-picker"
                    columns={floorEclWipStockColumns}
                    data={floorEclWipRolls}
                    getRowId={(row: any) => String(row.id)}
                    singleRowSelection
                    scrollable
                    scrollHeight="60vh"
                    bulkActions={(selectedRows: any[]) => (
                      <Button
                        size="sm"
                        disabled={floorEclBarcodeChecking}
                        onClick={async () => {
                          const selected = selectedRows[0]
                          const barcode = selected?.barcode?.trim()
                          if (!barcode) return
                          await applyFloorEclFromBarcode(barcode, { closePicker: true, slot: "wip" })
                        }}
                      >
                        {floorEclBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                      </Button>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeFloorEclWipPicker}>
                  Close
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
      {floorEclRmPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select {input2Label}</CardTitle>
                <CardDescription>
                  Pick a virgin RM or RM Balance film as Input 2.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFloorEclRmPicker} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {floorEclRmRollsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                  </div>
                </div>
              ) : (
                <>
                  {floorEclRmRollsError && <p className="text-sm text-red-500 mb-3">{floorEclRmRollsError}</p>}
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
                    key={`floor-ecl-rm-picker-${rmFilmItemFilter}-${rmFilmWarehouseFilter}`}
                    columns={floorEclRmStockColumns}
                    data={filteredFloorEclRmRolls}
                    getRowId={(row: any) => String(row.id)}
                    singleRowSelection
                    scrollable
                    scrollHeight="60vh"
                    bulkActions={(selectedRows: any[]) => (
                      <Button
                        size="sm"
                        disabled={floorEclBarcodeChecking}
                        onClick={async () => {
                          const selected = selectedRows[0]
                          const barcode = selected?.barcode?.trim()
                          if (!barcode) return
                          await applyFloorEclFromBarcode(barcode, { closePicker: true, slot: "rm" })
                        }}
                      >
                        {floorEclBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                      </Button>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeFloorEclRmPicker}>
                  Close
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )

  return (
    <>
  {eclSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col-reverse gap-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Loaded films</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            ECL needs two films on the same job card: {input1Label} and {input2Label}.
            Extrusion coating weight is entered when producing.
          </p>
          {eclRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              {!wipParent &&
                renderLoadSlot(
                  "wip",
                  floorEclDetailWipBarcode,
                  setFloorEclDetailWipBarcode,
                  openFloorEclWipPicker,
                  floorEclWipRollsLoading
                )}
              {!rmParent &&
                renderLoadSlot(
                  "rm",
                  floorEclDetailRmBarcode,
                  setFloorEclDetailRmBarcode,
                  openFloorEclRmPicker,
                  floorEclRmRollsLoading
                )}
              {floorEclBarcodeError && <p className="text-sm text-red-500">{floorEclBarcodeError}</p>}
              {bothParentsLoaded && !sameJobCard && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Both films must be loaded on the same ECL job card before producing.
                </p>
              )}
              {eclLoadedFilmRows.length > 0 && (
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
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map(
                          (title, i) => (
                            <th
                              key={`input1-${title || "remove"}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map(
                          (title, i) => (
                            <th
                              key={`input2-${title || "remove"}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {eclLoadedFilmRows.map((row) => {
                        const canEditRow = canProduce && Boolean(eclAddRollForm)
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
                              wastage: eclAddRollForm?.wipWastage ?? "0",
                              balance: eclAddRollForm?.wipBalance ?? "",
                              semiConsumed: Boolean(eclAddRollForm?.wipSemiConsumed),
                              onWastage: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, wipWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setEclAddRollForm((prev: any) =>
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
                                setEclAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        wipSemiConsumed: checked,
                                        wipBalance: checked ? "" : prev.wipBalance,
                                      }
                                    : prev
                                ),
                              onUnload: handleUnloadEclRoll,
                              unloadDisabled: eclCreateChildLoading,
                            })}
                            {loadedFilmCells(row.input2, {
                              canEdit: canEditRow,
                              wastage: eclAddRollForm?.rmWastage ?? "0",
                              balance: eclAddRollForm?.rmBalance ?? "",
                              semiConsumed: Boolean(eclAddRollForm?.rmSemiConsumed),
                              onWastage: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, rmWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setEclAddRollForm((prev: any) =>
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
                                setEclAddRollForm((prev: any) =>
                                  prev
                                    ? {
                                        ...prev,
                                        rmSemiConsumed: checked,
                                        rmBalance: checked ? "" : prev.rmBalance,
                                      }
                                    : prev
                                ),
                              onUnload: handleUnloadEclRoll,
                              unloadDisabled: eclCreateChildLoading,
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {canProduce && eclAddRollForm && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          Extrusion coating (kg)
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          Trim wastage (kg)
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          Lumps wastage (kg)
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          ECL output wastage (kg)
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          Output weight (kg)
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                          Operator name
                        </th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Shift</th>
                        <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1.5 px-2">
                          <NonNegativeDecimalInput
                            className="h-7 w-24 px-1.5 text-xs"
                            value={eclAddRollForm.extrusionKg}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, extrusionKg: value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <NonNegativeDecimalInput
                            className="h-7 w-20 px-1.5 text-xs"
                            value={eclAddRollForm.trimWastage}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, trimWastage: value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <NonNegativeDecimalInput
                            className="h-7 w-20 px-1.5 text-xs"
                            value={eclAddRollForm.lumpsWastage}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, lumpsWastage: value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <NonNegativeDecimalInput
                            className="h-7 w-20 px-1.5 text-xs"
                            value={eclAddRollForm.eclOutputWastage}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, eclOutputWastage: value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <NonNegativeDecimalInput
                            className="h-7 w-24 px-1.5 text-xs"
                            value={eclAddRollForm.netweight}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, netweight: value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <Select
                            value={
                              eclAddRollForm.operatorName && eclOperators.includes(eclAddRollForm.operatorName)
                                ? eclAddRollForm.operatorName
                                : undefined
                            }
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, operatorName: value } : prev
                              )
                            }
                          >
                            <SelectTrigger size="sm" className="h-7 w-36 px-1.5 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {eclOperators.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-2">
                          <Select
                            value={eclAddRollForm.shift || undefined}
                            onValueChange={(value) =>
                              setEclAddRollForm((prev: any) => (prev ? { ...prev, shift: value } : prev))
                            }
                          >
                            <SelectTrigger size="sm" className="h-7 w-16 px-1.5 text-xs">
                              <SelectValue placeholder="Shift" />
                            </SelectTrigger>
                            <SelectContent>
                              {ECL_SHIFTS.map((shiftOption) => (
                                <SelectItem key={shiftOption} value={shiftOption}>
                                  {shiftOption}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="text"
                            className="h-7 w-32 px-1.5 text-xs"
                            value={eclAddRollForm.remark}
                            onChange={(e) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, remark: e.target.value } : prev
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
            {!eclChildRollsLoading && (
              <div className="rounded-[2px] border border-zinc-600 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total produced rolls
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                        {eclProducedTotals.rollCount}
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total output weight (kg)
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                        {eclProducedTotals.netWeight.toFixed(2)} kg
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                        Total wastage (kg)
                      </td>
                      <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">
                        {eclProducedTotals.wastage.toFixed(2)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {eclChildRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
          ) : eclChildRollsFromDb.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No produced rolls found for this work order.</p>
          ) : (
            <DataTable
              columns={eclProducedRollColumns}
              data={eclChildRollsFromDb}
              getRowGroupPath={getEclProducedRowGroupPath}
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
        {!eclRollsLoading && canProduce && eclAddRollForm && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            disabled={
              eclCreateChildLoading ||
              !hasSemiConsumeChoice(eclAddRollForm.wipBalance, eclAddRollForm.wipSemiConsumed) ||
              !hasSemiConsumeChoice(eclAddRollForm.rmBalance, eclAddRollForm.rmSemiConsumed) ||
              eclFormCommittedForRollId === eclAddRollForm.roll.id
            }
            onClick={async () => {
              const form = eclAddRollForm
              const wo = eclSelectedWo
              if (!form || wo?.itemId == null || !wipParent || !rmParent) return
              if (wipParent.jobCardId !== rmParent.jobCardId) {
                setEclCreateChildMessage("Both films must be on the same ECL job card.")
                return
              }
              try {
                setEclCreateChildLoading(true)
                setEclCreateChildMessage(null)
                const parentIds = [wipParent.roll.id, rmParent.roll.id]
                const wipSemiConsumed = Boolean(form.wipSemiConsumed)
                const rmSemiConsumed = Boolean(form.rmSemiConsumed)
                const wipBalanceValue = wipSemiConsumed ? null : parseNonNegativeDecimal(form.wipBalance || "")
                const rmBalanceValue = rmSemiConsumed ? null : parseNonNegativeDecimal(form.rmBalance || "")
                if ((!wipSemiConsumed && wipBalanceValue == null) || (!rmSemiConsumed && rmBalanceValue == null)) {
                  setEclCreateChildMessage("Enter balance weight or tick Roll continue for both films.")
                  return
                }
                const outputWeight = parseNonNegativeDecimal(form.netweight || "") ?? undefined
                const extrusionKg = parseNonNegativeDecimal(form.extrusionKg || "") ?? undefined
                const trimWastage = parseNonNegativeDecimal(form.trimWastage || "") ?? 0
                const lumpsWastage = parseNonNegativeDecimal(form.lumpsWastage || "") ?? 0
                const eclOutputWastage = parseNonNegativeDecimal(form.eclOutputWastage || "") ?? 0
                const wipWastage = parseNonNegativeDecimal(form.wipWastage || "") ?? 0
                const rmWastage = parseNonNegativeDecimal(form.rmWastage || "") ?? 0
                const totalWastage = wipWastage + rmWastage + trimWastage + lumpsWastage + eclOutputWastage
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
                      grossweight: outputWeight,
                      wastage: totalWastage,
                      inkGsm: extrusionKg,
                      trimWastage,
                      lumpsWastage,
                      eclOutputWastage,
                      operatorName: form.operatorName || undefined,
                      shift: form.shift || undefined,
                      remark: form.remark || undefined,
                      itemName: wo.itemName ?? null,
                    },
                  }
                  const job = await createPrintJob({
                    name: `ECL - ${form.jobCardNumber}`,
                    template_id: wipPrintingTemplate.id,
                    data: printData,
                    copies: 1,
                  })
                  pollPrintJob(job.id)
                }
                await addEclRoll(form.jobCardId, {
                  itemId: wo.itemId,
                  rollno: "",
                  size: form.size ? parseFloat(form.size) : undefined,
                  micron: form.micron ? parseFloat(form.micron) : undefined,
                  netweight: outputWeight,
                  grossweight: outputWeight,
                  wastage: totalWastage,
                  operatorName: form.operatorName.trim() || undefined,
                  shift: form.shift.trim() || undefined,
                  remark: form.remark.trim() || undefined,
                  inkGsm: extrusionKg,
                  trimWastage,
                  lumpsWastage,
                  eclOutputWastage,
                  gradeId: form.parent.gradeId,
                  parentRollIds: parentIds,
                  parentBalanceWeights: [wipBalanceValue, rmBalanceValue],
                  parentWastages: [wipWastage, rmWastage],
                  parentSemiConsumed: [wipSemiConsumed, rmSemiConsumed],
                  weightAtTime: outputWeight,
                })
                getRollsStockByWorkOrder(wo.id, "wip_ecl").then(setEclChildRollsFromDb)
                if (wipSemiConsumed || rmSemiConsumed) {
                  setEclFormCommittedForRollId(null)
                  setEclAddRollForm((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          netweight: "",
                          extrusionKg: "",
                          trimWastage: "0",
                          lumpsWastage: "0",
                          eclOutputWastage: "0",
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
                  setEclCreateChildMessage("ECL roll created. Roll continue films kept on the machine.")
                } else {
                  setEclFormCommittedForRollId(form.roll.id)
                  setEclCreateChildMessage(
                    wipPrintingTemplate
                      ? "Roll added and label sent to printer."
                      : "Roll added and movement recorded. No WIP printing template configured."
                  )
                }
                setEclRollsRefreshKey((key: number) => key + 1)
              } catch {
                setEclCreateChildMessage(
                  wipPrintingTemplate
                    ? "Failed to print label. Roll not added or movement not recorded."
                    : "Failed to add roll or record movement."
                )
              } finally {
                setEclCreateChildLoading(false)
              }
            }}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        )}
        {eclCreateChildMessage && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{eclCreateChildMessage}</p>
        )}
      </div>
      {stockPickers}
    </div>
  ) : (
    <>
      <div className="mb-4 space-y-1">
        <Label htmlFor="floor-ecl-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode ({input1Label})
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Load {input1Label} first to open the work order, then load {input2Label}.
        </p>
        <div className="flex flex-wrap items-center gap-2 max-w-2xl">
          <div className="relative min-w-[min(100%,18rem)] flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="floor-ecl-barcode"
              type="text"
              placeholder={`Scan or enter ${input1Label} barcode`}
              value={floorEclBarcode}
              onChange={(e) => {
                setFloorEclBarcode(e.target.value)
                setFloorEclBarcodeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleFloorEclBarcodeSubmit()
                }
              }}
              disabled={floorEclBarcodeChecking}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={floorEclBarcodeChecking || floorEclWipRollsLoading}
            onClick={() => void openFloorEclWipPicker()}
          >
            Select Stock
          </Button>
        </div>
        {floorEclBarcodeError && <p className="text-sm text-red-500">{floorEclBarcodeError}</p>}
      </div>
      {stockPickers}
      {eclLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : eclError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{eclError}</p>
      ) : eclWorkOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
      ) : (
        <DataTable
          columns={floorWorkOrderColumns}
          data={eclWorkOrders}
          getRowId={(row) => String(row.id)}
          onRowClick={(wo) => setEclSelectedWo(wo)}
          scrollable
          scrollHeight="65vh"
          showSelectionSummary={false}
        />
      )}
    </>
  )}
    <Dialog open={Boolean(eclEditRoll)} onOpenChange={(open) => { if (!open) setEclEditRoll(null) }}>
      <DialogContent className={producedRollEditDialogClassName}>
        <DialogHeader>
          <DialogTitle>Edit produced roll</DialogTitle>
          <DialogDescription>Update ECL output fields and leftover balance weights.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <ProducedRollEditField label="Output weight (kg)">
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.netweight} onValueChange={(netweight) => setEclEditForm((prev) => ({ ...prev, netweight }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label="Extrusion coating (kg)">
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.inkGsm} onValueChange={(inkGsm) => setEclEditForm((prev) => ({ ...prev, inkGsm }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label="Trim wastage (kg)">
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.trimWastage} onValueChange={(trimWastage) => setEclEditForm((prev) => ({ ...prev, trimWastage }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label="Lumps wastage (kg)">
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.lumpsWastage} onValueChange={(lumpsWastage) => setEclEditForm((prev) => ({ ...prev, lumpsWastage }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label="ECL output wastage (kg)">
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.eclOutputWastage} onValueChange={(eclOutputWastage) => setEclEditForm((prev) => ({ ...prev, eclOutputWastage }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label="Shift">
            <Select value={eclEditForm.shift || undefined} onValueChange={(shift) => setEclEditForm((prev) => ({ ...prev, shift }))}>
              <SelectTrigger><SelectValue placeholder="Shift" /></SelectTrigger>
              <SelectContent>
                {ECL_SHIFTS.map((shift) => (
                  <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProducedRollEditField>
          <ProducedRollEditField label="Operator name" className="col-span-2">
            <Input value={eclEditForm.operatorName} onChange={(e) => setEclEditForm((prev) => ({ ...prev, operatorName: e.target.value }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label={`${input1Label} balance (kg)`}>
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.input1Balance} onValueChange={(input1Balance) => setEclEditForm((prev) => ({ ...prev, input1Balance }))} />
          </ProducedRollEditField>
          <ProducedRollEditField label={`${input2Label} balance (kg)`}>
            <NonNegativeDecimalInput className={producedRollEditInputClassName} value={eclEditForm.input2Balance} onValueChange={(input2Balance) => setEclEditForm((prev) => ({ ...prev, input2Balance }))} />
          </ProducedRollEditField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setEclEditRoll(null)}>Cancel</Button>
          <Button type="button" disabled={eclEditSaving} onClick={() => void handleSaveEclProducedEdit()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
