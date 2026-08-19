import { Plus, Printer, ScanBarcode, X } from "lucide-react"
import { useMemo } from "react"

import { ColumnHeader } from "@/components/column-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatWeightWithMeter } from "@/lib/film-calc"
import { includesStringFilterFn } from "@/lib/table-filter-utils"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type InspectionPanelProps = any

export function InspectionPanel(props: InspectionPanelProps) {
  const {
    inspectionSelectedWo,
    inspectionRollsLoading,
    inspectionLoadedRolls,
    inspectionAddRollForm,
    inspectionCreateChildLoading,
    setInspectionCreateChildLoading,
    setInspectionCreateChildMessage,
    getRollsStockById,
    scaleWeight,
    setInspectionAddRollForm,
    inspectionChildRollsLoading,
    inspectionChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    inspectionFormCommittedForRollId,
    addInspectionRoll,
    setInspectionFormCommittedForRollId,
    setInspectionChildRollsFromDb,
    inspectionCreateChildMessage,
    floorInspectionBarcode,
    setFloorInspectionBarcode,
    setFloorInspectionBarcodeError,
    floorInspectionBarcodeChecking,
    handleFloorInspectionBarcodeSubmit,
    floorInspectionWipRollsLoading,
    openFloorInspectionWipPicker,
    floorInspectionBarcodeError,
    floorInspectionWipPickerOpen,
    closeFloorInspectionWipPicker,
    floorInspectionWipRollsError,
    floorInspectionWipStockColumns,
    floorInspectionWipRolls,
    applyFloorInspectionFromBarcode,
    inspectionLoading,
    inspectionError,
    inspectionWorkOrders,
    setInspectionSelectedWo,
    unloadFloorLoadedRoll,
    getRollsStockByWorkOrder,
    onSkipWorkOrder,
  } = props

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )

  const inspectionProducedTotals = useMemo(() => {
    return inspectionChildRollsFromDb.reduce(
      (acc: { rollCount: number; netWeight: number; grossWeight: number }, row: any) => {
        acc.rollCount += 1
        acc.netWeight += Number(row.netweight || 0)
        acc.grossWeight += Number(row.grossweight || 0)
        return acc
      },
      { rollCount: 0, netWeight: 0, grossWeight: 0 }
    )
  }, [inspectionChildRollsFromDb])

  const handleUnloadInspectionRoll = async (jobCardId: number, rollId: number) => {
    try {
      setInspectionCreateChildLoading(true)
      setInspectionCreateChildMessage(null)
      await unloadFloorLoadedRoll(jobCardId, rollId, "inspection")
      setInspectionCreateChildMessage("Loaded roll removed.")
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not unload roll."
      setInspectionCreateChildMessage(detail)
    } finally {
      setInspectionCreateChildLoading(false)
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

  const handleInspectionProducedRollReprint = async (r: any) => {
    const wo = inspectionSelectedWo
    if (!wo || !wipPrintingTemplate) return
    try {
      setInspectionCreateChildLoading(true)
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
          grossweight: r.grossweight,
          itemName: wo.itemName ?? r.itemName ?? null,
        },
      }
      const job = await createPrintJob({
        name: `Inspection Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
        template_id: wipPrintingTemplate.id,
        data: printData,
        copies: 1,
      })
      setInspectionCreateChildMessage("Label reprint sent to printer.")
      pollPrintJob(job.id)
    } catch {
      setInspectionCreateChildMessage("Failed to send reprint to printer.")
    } finally {
      setInspectionCreateChildLoading(false)
    }
  }

  const inspectionProducedRollColumns = useMemo(
    () => [
      {
        id: "sno",
        header: () => <div>S. no.</div>,
        cell: ({ row }: { row: any }) => <div className="text-sm">{row.index + 1}</div>,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "size",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.size != null ? String(row.original.size) : "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "micron",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.micron != null ? String(row.original.micron) : "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Net weight (kg)" column={column} placeholder="Filter net weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "grossweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Gross weight (kg)" column={column} placeholder="Filter gross weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.grossweight != null ? `${Number(row.original.grossweight).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        id: "reprint",
        header: () => <div className="text-left">Reprint</div>,
        cell: ({ row }: { row: any }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!wipPrintingTemplate || inspectionCreateChildLoading}
              onClick={() => handleInspectionProducedRollReprint(row.original)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [wipPrintingTemplate, inspectionCreateChildLoading, inspectionSelectedWo]
  )

  const selectLoadedRoll = async (jobCardNumber: string, jobCardId: number, roll: any) => {
    if (inspectionCreateChildLoading) return
    if (inspectionAddRollForm?.roll.id === roll.id) return
    const woItemId = inspectionSelectedWo?.itemId
    if (woItemId == null) {
      setInspectionCreateChildMessage("Work order has no item.")
      return
    }
    const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
    setInspectionAddRollForm({
      jobCardNumber,
      jobCardId,
      roll,
      parent: { gradeId: undefined },
      size: roll.size != null ? String(roll.size) : "",
      micron: roll.micron != null ? String(roll.micron) : "",
      netweight: roll.netweight != null ? String(roll.netweight) : "",
      grossweight:
        grossFromScale || (roll.netweight != null ? String(roll.netweight) : ""),
    })
    try {
      const parent = await getRollsStockById(roll.id)
      setInspectionAddRollForm((prev: any) => {
        if (!prev || prev.roll.id !== roll.id) return prev
        return {
          ...prev,
          parent: { gradeId: parent.gradeId ?? prev.parent.gradeId },
          grossweight:
            prev.grossweight ||
            (parent.grossweight != null ? String(parent.grossweight) : prev.grossweight),
        }
      })
    } catch {
      setInspectionCreateChildMessage("Failed to load parent roll.")
    }
  }

  const barcodeAndStockPicker = (
    <>
      <div className="space-y-1 max-w-2xl">
        <Label htmlFor="floor-inspection-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[min(100%,18rem)] flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="floor-inspection-barcode"
              type="text"
              placeholder="Scan or enter roll barcode"
              value={floorInspectionBarcode}
              onChange={(e) => {
                setFloorInspectionBarcode(e.target.value)
                setFloorInspectionBarcodeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleFloorInspectionBarcodeSubmit()
                }
              }}
              disabled={floorInspectionBarcodeChecking}
              className="pl-9"
              autoComplete="off"
              autoFocus
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={floorInspectionBarcodeChecking || floorInspectionWipRollsLoading}
            onClick={() => void openFloorInspectionWipPicker()}
          >
            Select Stock
          </Button>
        </div>
        {floorInspectionBarcodeError && (
          <p className="text-sm text-red-500">{floorInspectionBarcodeError}</p>
        )}
      </div>
      {floorInspectionWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select WIP Printing roll</CardTitle>
                <CardDescription>
                  Pick a roll to load into inspection (same as scanning its barcode). Only unused WIP Printing rolls from this work order are listed.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFloorInspectionWipPicker} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {floorInspectionWipRollsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                  </div>
                </div>
              ) : (
                <>
                  {floorInspectionWipRollsError && (
                    <p className="text-sm text-red-500 mb-3">{floorInspectionWipRollsError}</p>
                  )}
                  <DataTable
                    key="floor-inspection-wip-picker"
                    columns={floorInspectionWipStockColumns}
                    data={floorInspectionWipRolls}
                    getRowId={(row: any) => String(row.id)}
                    singleRowSelection
                    scrollable
                    scrollHeight="60vh"
                    bulkActions={(selectedRows: any[]) => (
                      <Button
                        size="sm"
                        disabled={floorInspectionBarcodeChecking}
                        onClick={async () => {
                          const selected = selectedRows[0]
                          const barcode = selected?.barcode?.trim()
                          if (!barcode) return
                          await applyFloorInspectionFromBarcode(barcode, { closePicker: true })
                        }}
                      >
                        {floorInspectionBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                      </Button>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeFloorInspectionWipPicker}>
                  Close
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )

  return inspectionSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div>
        <div className="flex flex-col-reverse gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll</h4>
            {inspectionRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : inspectionLoadedRolls.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No roll currently loaded for this work order.
                </p>
                {barcodeAndStockPicker}
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Job card</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Structure</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Size</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Micron</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Input weight (kg)</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Net weight (kg)</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">Gross weight (kg)</th>
                      <th className="text-right py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionLoadedRolls.map(({ jobCardNumber, jobCardId, roll }: any) => {
                      const isSelected = inspectionAddRollForm?.roll.id === roll.id
                      return (
                        <tr
                          key={`${jobCardNumber}-${roll.id}`}
                          className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-pointer ${
                            isSelected ? "bg-gray-50 dark:bg-gray-800/40" : ""
                          }`}
                          onClick={() => void selectLoadedRoll(jobCardNumber, jobCardId, roll)}
                        >
                          <td className="py-1.5 px-2 text-gray-900 dark:text-gray-100">{jobCardNumber}</td>
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
                              disabled={!isSelected}
                              value={isSelected ? inspectionAddRollForm.netweight : (roll.netweight != null ? String(roll.netweight) : "")}
                              onChange={(e) =>
                                setInspectionAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, netweight: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-7 w-20 px-1.5 text-xs"
                              disabled={!isSelected}
                              value={
                                isSelected
                                  ? inspectionAddRollForm.grossweight
                                  : roll.netweight != null
                                    ? String(roll.netweight)
                                    : ""
                              }
                              onChange={(e) =>
                                setInspectionAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, grossweight: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Remove loaded roll"
                              disabled={inspectionCreateChildLoading}
                              onClick={() => void handleUnloadInspectionRoll(jobCardId, roll.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Produced rolls</h4>
              {!inspectionChildRollsLoading && (
                <div className="rounded-[2px] border border-zinc-600 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                          Total produced rolls
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                          {inspectionProducedTotals.rollCount}
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                          Total net weight (kg)
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">
                          {inspectionProducedTotals.netWeight.toFixed(2)} kg
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">
                          Total gross weight (kg)
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">
                          {inspectionProducedTotals.grossWeight.toFixed(2)} kg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {inspectionChildRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
            ) : inspectionChildRollsFromDb.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No produced rolls found for this work order.</p>
            ) : (
              <DataTable
                columns={inspectionProducedRollColumns}
                data={inspectionChildRollsFromDb}
                scrollable
                scrollHeight="45vh"
                compact
                showSelectionSummary={false}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
        {!inspectionRollsLoading && inspectionLoadedRolls.length > 0 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-2"
              disabled={
                inspectionCreateChildLoading ||
                (inspectionAddRollForm != null && inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id)
              }
              onClick={async () => {
                const form = inspectionAddRollForm
                const wo = inspectionSelectedWo
                if (form && wo?.itemId != null) {
                  try {
                    setInspectionCreateChildLoading(true)
                    setInspectionCreateChildMessage(null)
                    const parentIds = inspectionLoadedRolls.map((r: any) => r.roll.id)
                    if (parentIds.length === 0) {
                      setInspectionCreateChildMessage("Load a roll before printing.")
                      return
                    }
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
                          netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                          grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                          itemName: wo.itemName ?? null,
                        },
                      }
                      const job = await createPrintJob({
                        name: `Inspection - ${form.jobCardNumber}`,
                        template_id: wipPrintingTemplate.id,
                        data: printData,
                        copies: 1,
                      })
                      pollPrintJob(job.id)
                    }
                    await addInspectionRoll(form.jobCardId, {
                      itemId: wo.itemId,
                      rollno: "",
                      size: form.size ? parseFloat(form.size) : undefined,
                      micron: form.micron ? parseFloat(form.micron) : undefined,
                      netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                      grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                      gradeId: form.parent.gradeId,
                      parentRollIds: parentIds.length > 0 ? parentIds : undefined,
                      weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined,
                    })
                    setInspectionFormCommittedForRollId(form.roll.id)
                    getRollsStockByWorkOrder(wo.id, "wip_inspection").then(setInspectionChildRollsFromDb)
                    setInspectionCreateChildMessage(
                      wipPrintingTemplate
                        ? "Roll added and label sent to printer."
                        : "Roll added and movement recorded. No WIP printing template configured."
                    )
                  } catch {
                    setInspectionCreateChildMessage(
                      wipPrintingTemplate
                        ? "Failed to print label. Roll not added or movement not recorded."
                        : "Failed to add roll or record movement."
                    )
                  } finally {
                    setInspectionCreateChildLoading(false)
                  }
                }
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {inspectionAddRollForm && inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setInspectionFormCommittedForRollId(null)
                  setInspectionAddRollForm((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          size: prev.roll.size != null ? String(prev.roll.size) : "",
                          micron: prev.roll.micron != null ? String(prev.roll.micron) : "",
                          netweight: prev.roll.netweight != null ? String(prev.roll.netweight) : "",
                          grossweight: "",
                        }
                      : null
                  )
                }}
              >
                <Plus className="h-4 w-4" />
                Add new roll
              </Button>
            )}
          </div>
        )}
        {inspectionCreateChildMessage && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{inspectionCreateChildMessage}</p>
        )}
      </div>
    </div>
  ) : (
    <>
      {inspectionLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : inspectionError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{inspectionError}</p>
      ) : inspectionWorkOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
      ) : (
        <DataTable
          columns={floorWorkOrderColumns}
          data={inspectionWorkOrders}
          getRowId={(row) => String(row.id)}
          onRowClick={(wo) => setInspectionSelectedWo(wo)}
          scrollable
          scrollHeight="65vh"
          showSelectionSummary={false}
        />
      )}
    </>
  )
}
