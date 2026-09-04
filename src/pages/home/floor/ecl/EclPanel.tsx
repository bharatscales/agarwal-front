import { Printer, ScanBarcode, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ColumnHeader } from "@/components/column-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { getAllOperators } from "@/lib/operator-api"
import { includesStringFilterFn } from "@/lib/table-filter-utils"
import { allowedWipStagesForDept, isOperationSkipped, wipStageLabel } from "@/lib/wo-flow"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type EclPanelProps = any

const ECL_SHIFTS = ["A", "B"]

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isNaN(n) ? undefined : n
}

function parseBalanceWeight(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const parsed = parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
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
  return {
    id,
    header: () => <div className="text-center w-full">{label}</div>,
    columns: [
      {
        id: `${id}Structure`,
        header: () => <div>Structure</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayValue(pick(row.original)?.itemName)}</div>
        ),
      },
      {
        id: `${id}Size`,
        header: () => <div>Size</div>,
        cell: ({ row }: { row: any }) => {
          const size = pick(row.original)?.size
          return <div className="text-sm">{size != null ? String(size) : "-"}</div>
        },
      },
      {
        id: `${id}Micron`,
        header: () => <div>Micron</div>,
        cell: ({ row }: { row: any }) => {
          const micron = pick(row.original)?.micron
          return <div className="text-sm">{micron != null ? String(micron) : "-"}</div>
        },
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
      },
      {
        id: `${id}Wastage`,
        header: () => <div>Wastage</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayKg(pick(row.original)?.wastage)}</div>
        ),
      },
      {
        id: `${id}BalanceWeight`,
        header: () => <div>Balance weight</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{displayKg(pick(row.original)?.balanceWeight)}</div>
        ),
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

function loadedFilmCells(
  entry: { jobCardId: number; roll: any } | null,
  opts: {
    canEdit: boolean
    wastage: string
    balance: string
    onWastage: (value: string) => void
    onBalance: (value: string) => void
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
        <Input
          type="number"
          step="any"
          className="h-7 w-20 px-1.5 text-xs"
          disabled={!opts.canEdit}
          value={opts.wastage}
          onChange={(e) => opts.onWastage(e.target.value)}
        />
      </td>
      <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          step="any"
          className="h-7 w-20 px-1.5 text-xs"
          disabled={!opts.canEdit}
          value={opts.balance}
          onChange={(e) => opts.onBalance(e.target.value)}
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

  const eclProducedRollColumns = useMemo(
    () => [
      asSingleColumnGroup("snoGroup", {
        id: "sno",
        header: () => <div>S. no.</div>,
        cell: ({ row }: { row: any }) => <div className="text-sm">{row.index + 1}</div>,
      }),
      eclInputGroupColumns("input1", input1Label, (row) =>
        pickEclProducedParents(row.parentRolls, getEclParentRole).input1
      ),
      eclInputGroupColumns("input2", input2Label, (row) =>
        pickEclProducedParents(row.parentRolls, getEclParentRole).input2
      ),
      asSingleColumnGroup("inkGsmGroup", {
        accessorKey: "inkGsm",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Extrusion coating (kg)" column={column} placeholder="Filter extrusion..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.inkGsm != null ? `${Number(row.original.inkGsm).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      }),
      asSingleColumnGroup("netweightGroup", {
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
      }),
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
              disabled={!wipPrintingTemplate || eclCreateChildLoading}
              onClick={() => handleEclProducedRollReprint(row.original)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [wipPrintingTemplate, eclCreateChildLoading, eclSelectedWo, input1Label, input2Label, getEclParentRole]
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
                  <DataTable
                    key="floor-ecl-rm-picker"
                    columns={floorEclRmStockColumns}
                    data={floorEclRmRolls}
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

  return eclSelectedWo ? (
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
                          colSpan={7}
                          className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                        >
                          {input1Label}
                        </th>
                        <th
                          colSpan={7}
                          className="text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                        >
                          {input2Label}
                        </th>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", ""].map(
                          (title, i) => (
                            <th
                              key={`input1-${title || "remove"}`}
                              className={`text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`}
                            >
                              {title}
                            </th>
                          )
                        )}
                        {["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", ""].map(
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
                              balance: eclAddRollForm?.wipBalance ?? "0",
                              onWastage: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, wipWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, wipBalance: value } : prev
                                ),
                              onUnload: handleUnloadEclRoll,
                              unloadDisabled: eclCreateChildLoading,
                            })}
                            {loadedFilmCells(row.input2, {
                              canEdit: canEditRow,
                              wastage: eclAddRollForm?.rmWastage ?? "0",
                              balance: eclAddRollForm?.rmBalance ?? "0",
                              onWastage: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, rmWastage: value } : prev
                                ),
                              onBalance: (value) =>
                                setEclAddRollForm((prev: any) =>
                                  prev ? { ...prev, rmBalance: value } : prev
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
                          <Input
                            type="number"
                            step="any"
                            className="h-7 w-24 px-1.5 text-xs"
                            value={eclAddRollForm.extrusionKg}
                            onChange={(e) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, extrusionKg: e.target.value } : prev
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="number"
                            step="any"
                            className="h-7 w-24 px-1.5 text-xs"
                            value={eclAddRollForm.netweight}
                            onChange={(e) =>
                              setEclAddRollForm((prev: any) =>
                                prev ? { ...prev, netweight: e.target.value } : prev
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
                <table className="w-full text-sm">
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
              scrollable
              scrollHeight="45vh"
              compact
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
              eclCreateChildLoading || eclFormCommittedForRollId === eclAddRollForm.roll.id
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
                const outputWeight = form.netweight ? parseFloat(form.netweight) : undefined
                const extrusionKg = parseOptionalNumber(form.extrusionKg)
                const wipWastage = parseOptionalNumber(form.wipWastage) ?? 0
                const rmWastage = parseOptionalNumber(form.rmWastage) ?? 0
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
                      grossweight: outputWeight,
                      wastage: totalWastage,
                      inkGsm: extrusionKg,
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
                  gradeId: form.parent.gradeId,
                  parentRollIds: parentIds,
                  parentBalanceWeights: [
                    parseBalanceWeight(form.wipBalance || "") ?? 0,
                    parseBalanceWeight(form.rmBalance || "") ?? 0,
                  ],
                  parentWastages: [wipWastage, rmWastage],
                  weightAtTime: outputWeight,
                })
                setEclFormCommittedForRollId(form.roll.id)
                getRollsStockByWorkOrder(wo.id, "wip_ecl").then(setEclChildRollsFromDb)
                setEclRollsRefreshKey((key: number) => key + 1)
                setEclCreateChildMessage(
                  wipPrintingTemplate
                    ? "Roll added and label sent to printer."
                    : "Roll added and movement recorded. No WIP printing template configured."
                )
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
  )
}
