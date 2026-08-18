import { Check, Pencil, Printer, ScanBarcode, X } from "lucide-react"
import { useMemo } from "react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type SlittingPanelProps = any

function stageLabel(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase()
  if (s === "wip_printed" || s === "wip-printing") return "WIP Printing"
  if (s === "wip_ecl" || s === "wip-ecl") return "WIP ECL"
  if (s === "wip_lamination" || s === "wip-lamination") return "WIP Lamination"
  if (s === "finished_goods" || s === "finished-goods") return "Finished goods"
  return stage || "—"
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
    setSlittingAddRollEditingField,
    slittingAddRollEditingField,
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
  } = props

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )
  const parent = slittingLoadedRolls[0] ?? null

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

  const resetWeightsForNextSlit = () => {
    setSlittingAddRollForm((prev: any) =>
      prev
        ? {
            ...prev,
            netweight: "",
            grossweight: "",
          }
        : null
    )
    setSlittingAddRollEditingField(null)
  }

  return slittingSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Parent roll</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Load one parent (WIP Printed, WIP ECL, or WIP Lamination). Produce multiple finished rolls of different weights one by one, then unload when done.
          </p>
          {slittingRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : !parent ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p>
          ) : (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Job card: {parent.jobCardNumber}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 -mt-1 -mr-1"
                  title="Remove loaded roll"
                  disabled={slittingCreateChildLoading}
                  onClick={() => void handleUnloadSlittingRoll(parent.jobCardId, parent.roll.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 text-gray-600 dark:text-gray-400">
                <div>
                  <dt className="text-xs uppercase text-gray-500">Barcode</dt>
                  <dd className="font-mono text-gray-900 dark:text-gray-100">{parent.roll.barcode}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Stage</dt>
                  <dd>{stageLabel(parent.roll.stage)}</dd>
                </div>
                {(parent.roll.item_name ?? parent.roll.itemName) != null && (
                  <div>
                    <dt className="text-xs uppercase text-gray-500">Structure</dt>
                    <dd>{parent.roll.item_name ?? parent.roll.itemName}</dd>
                  </div>
                )}
                {parent.roll.size != null && (
                  <div>
                    <dt className="text-xs uppercase text-gray-500">Size</dt>
                    <dd>{parent.roll.size}</dd>
                  </div>
                )}
                {parent.roll.netweight != null && (
                  <div>
                    <dt className="text-xs uppercase text-gray-500">Net weight</dt>
                    <dd>{Number(parent.roll.netweight).toFixed(2)} kg</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {(slittingChildRollsLoading || slittingChildRollsFromDb.length > 0) && (
            <div className="mt-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Produced rolls</h4>
              {slittingChildRollsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Barcode</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Size</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Micron</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Net weight</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Gross weight</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Reprint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slittingChildRollsFromDb.map((r: any) => (
                        <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                          <td className="py-2 px-3 font-mono text-gray-900 dark:text-gray-100">{r.barcode || "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.size != null ? String(r.size) : "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.micron != null ? String(r.micron) : "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.netweight != null ? `${Number(r.netweight).toFixed(2)} kg` : "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.grossweight != null ? `${Number(r.grossweight).toFixed(2)} kg` : "—"}</td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!wipPrintingTemplate || slittingCreateChildLoading}
                              onClick={async () => {
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
                                      micron: r.micron,
                                      netweight: r.netweight,
                                      grossweight: r.grossweight,
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
                                  setPrintingPrintStatus("printing")
                                  let pollCount = 0
                                  const maxPolls = 30
                                  const pollInterval = setInterval(async () => {
                                    pollCount++
                                    try {
                                      const updatedJob = await getPrintJob(job.id)
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
                                } catch {
                                  setSlittingCreateChildMessage("Failed to send reprint to printer.")
                                } finally {
                                  setSlittingCreateChildLoading(false)
                                }
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {parent && slittingAddRollForm && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Enter weights for the next slit roll, then Print. The parent stays loaded so you can repeat.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs">Item (from work order)</Label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                    {slittingSelectedWo?.itemName ?? "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Net weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {slittingAddRollEditingField === "netweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={slittingAddRollForm.netweight}
                          onChange={(e) =>
                            setSlittingAddRollForm((prev: any) =>
                              prev ? { ...prev, netweight: e.target.value } : null
                            )
                          }
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setSlittingAddRollEditingField(null)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                          {slittingAddRollForm.netweight || "—"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setSlittingAddRollEditingField("netweight")}
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Gross weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {slittingAddRollEditingField === "grossweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={slittingAddRollForm.grossweight}
                          onChange={(e) =>
                            setSlittingAddRollForm((prev: any) =>
                              prev ? { ...prev, grossweight: e.target.value } : null
                            )
                          }
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setSlittingAddRollEditingField(null)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                          {slittingAddRollForm.grossweight || "—"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setSlittingAddRollEditingField("grossweight")}
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
          {!slittingRollsLoading && parent && slittingAddRollForm && (
            <div className="flex gap-2">
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
                        name: `Slitting - ${form.jobCardNumber}`,
                        template_id: wipPrintingTemplate.id,
                        data: printData,
                        copies: 1,
                      })
                      setPrintingPrintStatus("printing")
                      let pollCount = 0
                      const maxPolls = 30
                      const pollInterval = setInterval(async () => {
                        pollCount++
                        try {
                          const updatedJob = await getPrintJob(job.id)
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
                    await addSlittingRoll(form.jobCardId, {
                      itemId: wo.itemId,
                      rollno: "",
                      size: form.size ? parseFloat(form.size) : undefined,
                      micron: form.micron ? parseFloat(form.micron) : undefined,
                      netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                      grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                      gradeId: form.parent.gradeId,
                      parentRollIds: parentIds,
                      weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined,
                    })
                    const children = await getRollsStockByParentIds(parentIds, "finished_goods")
                    setSlittingChildRollsFromDb(children)
                    resetWeightsForNextSlit()
                    setSlittingCreateChildMessage(
                      wipPrintingTemplate
                        ? "Roll added and label sent to printer. Enter the next weight when ready."
                        : "Roll added. Enter the next weight when ready. No label template configured."
                    )
                  } catch {
                    setSlittingCreateChildMessage(
                      wipPrintingTemplate
                        ? "Failed to print label. Roll not added or movement not recorded."
                        : "Failed to add roll or record movement."
                    )
                  } finally {
                    setSlittingCreateChildLoading(false)
                  }
                }}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          )}
          {slittingCreateChildMessage && (
            <p className="text-xs text-gray-600 dark:text-gray-400">{slittingCreateChildMessage}</p>
          )}
        </div>
      </div>
    </div>
  ) : (
    <>
      <div className="mb-4 space-y-1">
        <Label htmlFor="floor-slitting-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode (parent roll)
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Scan WIP Printed, WIP ECL, or WIP Lamination to open the work order and load the parent.
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
                  Pick a WIP Printed, WIP ECL, or WIP Lamination roll to load into Slitting.
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
  )
}
