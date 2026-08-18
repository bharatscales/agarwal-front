import { CheckCircle, Plus, Printer, ScanBarcode, X } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WorkOrderCreateDialog } from "@/components/work-order-create-dialog"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type PrintingPanelProps = any

function parseBalanceWeight(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const parsed = parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

export function PrintingPanel(props: PrintingPanelProps) {
  const {
    printingSelectedWo,
    printingRollsLoading,
    printingLoadedRolls,
    printingCreateChildLoading,
    setPrintingCreateChildLoading,
    setPrintingCreateChildMessage,
    getRollsStockById,
    setPrintingAddRollEditingField,
    setPrintingAddRollForm,
    printingAddRollForm,
    printingChildRollsLoading,
    printingProducedTotals,
    printingChildRollsFromDb,
    printingProducedRollColumns,
    printingFormCommittedForRollId,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    addPrintedRoll,
    setPrintingFormCommittedForRollId,
    getRollsStockByWorkOrder,
    setPrintingChildRollsFromDb,
    updateRollsStock,
    setPrintingSelectedWo,
    setFloorView,
    updateWorkOrder,
    setPrintingWorkOrders,
    printingCreateChildMessage,
    printingLoading,
    printingError,
    printingWorkOrders,
    unloadFloorLoadedRoll,
    floorPrintingBarcode,
    setFloorPrintingBarcode,
    floorPrintingBarcodeError,
    setFloorPrintingBarcodeError,
    floorPrintingBarcodeChecking,
    handleFloorPrintingBarcodeSubmit,
    floorPrintingRmPickerOpen,
    floorPrintingRmRolls,
    floorPrintingRmRollsLoading,
    floorPrintingRmRollsError,
    floorPrintingRmStockColumns,
    openFloorPrintingRmPicker,
    closeFloorPrintingRmPicker,
    applyFloorPrintingFromBarcode,
    setPrintingRollsRefreshKey,
  } = props

  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false)
  const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(), [])

  const handleUnloadPrintingRoll = async (jobCardId: number, rollId: number) => {
    try {
      setPrintingCreateChildLoading(true)
      setPrintingCreateChildMessage(null)
      await unloadFloorLoadedRoll(jobCardId, rollId, "printing")
      setPrintingCreateChildMessage("Loaded roll removed.")
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not unload roll."
      setPrintingCreateChildMessage(detail)
    } finally {
      setPrintingCreateChildLoading(false)
    }
  }

  return printingSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div>
        <div className="flex flex-col-reverse gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll</h4>
            {printingRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : printingLoadedRolls.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No roll currently loaded for this work order.
                </p>
                <div className="space-y-1 max-w-2xl">
                  <Label htmlFor="floor-printing-barcode" className="text-xs text-gray-600 dark:text-gray-400">
                    Barcode
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[min(100%,18rem)] flex-1">
                      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="floor-printing-barcode"
                        type="text"
                        placeholder="Scan or enter roll barcode"
                        value={floorPrintingBarcode}
                        onChange={(e) => {
                          setFloorPrintingBarcode(e.target.value)
                          setFloorPrintingBarcodeError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            void handleFloorPrintingBarcodeSubmit()
                          }
                        }}
                        disabled={floorPrintingBarcodeChecking}
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
                      disabled={floorPrintingBarcodeChecking || floorPrintingRmRollsLoading}
                      onClick={() => void openFloorPrintingRmPicker()}
                    >
                      Select Stock
                    </Button>
                  </div>
                  {floorPrintingBarcodeError && (
                    <p className="text-sm text-red-500">{floorPrintingBarcodeError}</p>
                  )}
                </div>
                {floorPrintingRmPickerOpen && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                          <CardTitle>Select RM Film roll</CardTitle>
                          <CardDescription>
                            Pick a roll to load into printing (same as scanning its barcode). Non-issued RM virgin and RM Balance rolls are listed.
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={closeFloorPrintingRmPicker} className="h-8 w-8 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {floorPrintingRmRollsLoading ? (
                          <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                              <p className="text-gray-600 dark:text-gray-400">Loading stock…</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {floorPrintingRmRollsError && (
                              <p className="text-sm text-red-500 mb-3">{floorPrintingRmRollsError}</p>
                            )}
                            <DataTable
                              key="floor-printing-rm-picker"
                              columns={floorPrintingRmStockColumns}
                              data={floorPrintingRmRolls}
                              getRowId={(row: any) => String(row.id)}
                              singleRowSelection
                              scrollable
                              scrollHeight="60vh"
                              bulkActions={(selectedRows: any[]) => (
                                <Button
                                  size="sm"
                                  disabled={floorPrintingBarcodeChecking}
                                  onClick={async () => {
                                    const selected = selectedRows[0]
                                    const barcode = selected?.barcode?.trim()
                                    if (!barcode) return
                                    await applyFloorPrintingFromBarcode(barcode, { closePicker: true })
                                  }}
                                >
                                  {floorPrintingBarcodeChecking ? "Loading…" : "Load Selected Roll"}
                                </Button>
                              )}
                            />
                          </>
                        )}
                      </CardContent>
                      <CardFooter>
                        <div className="w-full flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={closeFloorPrintingRmPicker}>
                            Close
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full min-w-[1320px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Job card</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Barcode</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Item (variety)</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Structure</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Size</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Micron</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Input weight (kg)</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Output weight (kg)</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Plain wastage (kg)</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Printed wastage (kg)</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Ink gsm</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Balance weight (kg)</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingLoadedRolls.map(({ jobCardNumber, jobCardId, roll }: any) => {
                      const isSelected = printingAddRollForm?.roll.id === roll.id
                      return (
                        <tr
                          key={`${jobCardNumber}-${roll.id}`}
                          className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-pointer ${
                            isSelected ? "bg-gray-50 dark:bg-gray-800/40" : ""
                          }`}
                          onClick={async () => {
                            if (printingCreateChildLoading) return
                            if (printingAddRollForm?.roll.id === roll.id) return
                            const woItemId = printingSelectedWo?.itemId
                            if (woItemId == null) {
                              setPrintingCreateChildMessage("Work order has no item.")
                              return
                            }
                            try {
                              setPrintingAddRollForm({
                                jobCardNumber,
                                jobCardId,
                                roll,
                                parent: { gradeId: undefined },
                                size: roll.size != null ? String(roll.size) : "",
                                micron: roll.micron != null ? String(roll.micron) : "",
                                netweight: roll.netweight != null ? String(roll.netweight) : "",
                                grossweight: roll.netweight != null ? String(roll.netweight) : "",
                                wastage: "0",
                                plainWastage: "0",
                                printedWastage: "0",
                                inkGsm: "",
                                balanceweight: "",
                              })
                              setPrintingAddRollEditingField(null)
                              const parent = await getRollsStockById(roll.id)
                              setPrintingAddRollForm((prev: any) => {
                                if (!prev || prev.roll.id !== roll.id) return prev
                                return {
                                  ...prev,
                                  parent: { gradeId: parent.gradeId ?? prev.parent.gradeId },
                                }
                              })
                            } catch {
                              setPrintingCreateChildMessage("Failed to load parent roll.")
                            }
                          }}
                        >
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{jobCardNumber}</td>
                          <td className="py-2 px-3 font-mono text-gray-900 dark:text-gray-100">{roll.barcode ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{printingSelectedWo?.itemName ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{roll.item_name ?? roll.itemName ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{roll.size != null ? String(roll.size) : "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{roll.micron != null ? String(roll.micron) : "—"}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{roll.netweight != null ? `${Number(roll.netweight).toFixed(2)} kg` : "—"}</td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 min-w-[140px]"
                              disabled={!isSelected}
                              value={isSelected ? printingAddRollForm.netweight : (roll.netweight != null ? String(roll.netweight) : "")}
                              onChange={(e) =>
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, netweight: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 min-w-[140px]"
                              disabled={!isSelected}
                              value={isSelected ? printingAddRollForm.plainWastage : ""}
                              onChange={(e) =>
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, plainWastage: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 min-w-[140px]"
                              disabled={!isSelected}
                              value={isSelected ? printingAddRollForm.printedWastage : ""}
                              onChange={(e) =>
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, printedWastage: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 min-w-[100px]"
                              disabled={!isSelected}
                              value={isSelected ? printingAddRollForm.inkGsm : ""}
                              onChange={(e) =>
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, inkGsm: e.target.value } : prev
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 min-w-[140px]"
                              disabled={!isSelected}
                              value={
                                isSelected
                                  ? printingAddRollForm.balanceweight
                                  : roll.balanceWeight != null
                                    ? String(roll.balanceWeight)
                                    : ""
                              }
                              onChange={(e) => {
                                const nextValue = e.target.value
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, balanceweight: nextValue } : prev
                                )
                                const parsed = parseBalanceWeight(nextValue)
                                setPrintingChildRollsFromDb((prev: any[]) =>
                                  prev.map((row) => {
                                    const parentIds = row.parentRollIds || (row.parentRollId != null ? [row.parentRollId] : [])
                                    if (parentIds.length > 0 && !parentIds.includes(roll.id)) return row
                                    return { ...row, balanceWeight: parsed, parentBalanceWeight: parsed }
                                  })
                                )
                              }}
                              onBlur={async (e) => {
                                if (!isSelected) return
                                const parsed = parseBalanceWeight(e.currentTarget.value)
                                try {
                                  await updateRollsStock(roll.id, { balanceWeight: parsed })
                                  const children = printingChildRollsFromDb.filter((row: any) => {
                                    const parentIds = row.parentRollIds || (row.parentRollId != null ? [row.parentRollId] : [])
                                    return parentIds.length === 0 || parentIds.includes(roll.id)
                                  })
                                  await Promise.all(
                                    children.map((child: any) =>
                                      updateRollsStock(child.id, { balanceWeight: parsed })
                                    )
                                  )
                                } catch {
                                  setPrintingCreateChildMessage("Failed to save balance weight.")
                                }
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Remove loaded roll"
                              disabled={printingCreateChildLoading}
                              onClick={() => void handleUnloadPrintingRoll(jobCardId, roll.id)}
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
              {!printingChildRollsLoading && (
                <div className="rounded-[2px] border border-zinc-600 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total produced rolls</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">{printingProducedTotals.rollCount}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total output weight (kg)</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">{printingProducedTotals.netWeight.toFixed(2)} kg</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total plain wastage (kg)</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">{printingProducedTotals.plainWastage.toFixed(2)} kg</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total printed wastage (kg)</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">{printingProducedTotals.printedWastage.toFixed(2)} kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {printingChildRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
            ) : printingChildRollsFromDb.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No produced rolls found for this work order.</p>
            ) : (
              <DataTable
                columns={printingProducedRollColumns}
                data={printingChildRollsFromDb}
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
        {!printingRollsLoading && printingLoadedRolls.length > 0 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-2"
              disabled={printingCreateChildLoading || (printingAddRollForm != null && printingFormCommittedForRollId === printingAddRollForm.roll.id)}
              onClick={async () => {
                const form = printingAddRollForm
                const wo = printingSelectedWo
                if (form && wo?.itemId != null) {
                  try {
                    setPrintingCreateChildLoading(true)
                    setPrintingCreateChildMessage(null)
                    const parentIds = printingLoadedRolls.map((r: any) => r.roll.id)
                    if (parentIds.length === 0) {
                      setPrintingCreateChildMessage("Load an RM roll before printing.")
                      return
                    }
                    const netweightValue = form.netweight ? parseFloat(form.netweight) : undefined
                    const plainWastageValue = parseBalanceWeight(form.plainWastage || "")
                    const printedWastageValue = parseBalanceWeight(form.printedWastage || "")
                    const inkGsmValue = parseBalanceWeight(form.inkGsm || "")
                    const wastageValue =
                      plainWastageValue != null || printedWastageValue != null
                        ? (plainWastageValue || 0) + (printedWastageValue || 0)
                        : undefined
                    const balanceValue = parseBalanceWeight(form.balanceweight || "")
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
                          netweight: netweightValue,
                          grossweight: netweightValue,
                          wastage: wastageValue,
                          plainWastage: plainWastageValue,
                          printedWastage: printedWastageValue,
                          inkGsm: inkGsmValue,
                          itemName: wo.itemName ?? null,
                        },
                      }
                      const job = await createPrintJob({
                        name: `WIP Printing - ${form.jobCardNumber}`,
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
                    await addPrintedRoll(form.jobCardId, {
                      itemId: wo.itemId,
                      rollno: "",
                      size: form.size ? parseFloat(form.size) : undefined,
                      micron: form.micron ? parseFloat(form.micron) : undefined,
                      netweight: netweightValue,
                      grossweight: netweightValue,
                      wastage: wastageValue,
                      plainWastage: plainWastageValue ?? undefined,
                      printedWastage: printedWastageValue ?? undefined,
                      inkGsm: inkGsmValue ?? undefined,
                      gradeId: form.parent.gradeId,
                      parentRollIds: parentIds,
                      weightAtTime: netweightValue,
                      balanceWeight: balanceValue ?? undefined,
                    })
                    setPrintingFormCommittedForRollId(form.roll.id)
                    getRollsStockByWorkOrder(wo.id, "wip_printed").then(setPrintingChildRollsFromDb)
                    setPrintingRollsRefreshKey((key: number) => key + 1)
                  } catch {
                    setPrintingCreateChildMessage(
                      wipPrintingTemplate
                        ? "Failed to print label. Roll not added or movement not recorded."
                        : "Failed to add roll or record movement."
                    )
                  } finally {
                    setPrintingCreateChildLoading(false)
                  }
                }
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {printingAddRollForm && printingChildRollsFromDb.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={printingCreateChildLoading}
                onClick={async () => {
                  const form = printingAddRollForm
                  if (!form) return
                  if (!window.confirm("Are you sure you want to finish? This will mark the loaded roll as consumed.")) return
                  try {
                    setPrintingCreateChildLoading(true)
                    setPrintingCreateChildMessage(null)
                    await updateRollsStock(form.roll.id, { consumed: true })
                    setPrintingCreateChildMessage("Loaded roll marked as consumed.")
                    setPrintingCreateChildLoading(false)
                    setTimeout(() => {
                      setPrintingSelectedWo(null)
                      setFloorView(null)
                    }, 0)
                  } catch {
                    setPrintingCreateChildMessage("Failed to mark roll as consumed.")
                    setPrintingCreateChildLoading(false)
                  }
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Roll Finish
              </Button>
            )}
          </div>
        )}
        {!printingRollsLoading &&
          !printingChildRollsLoading &&
          printingLoadedRolls.length === 0 &&
          printingChildRollsFromDb.length > 0 &&
          printingSelectedWo && (
          <div className="ml-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-2"
              disabled={printingCreateChildLoading}
              onClick={async () => {
                const wo = printingSelectedWo
                if (!wo) return
                if (!window.confirm("Are you sure you want to finish this work order?")) return
                try {
                  setPrintingCreateChildLoading(true)
                  setPrintingCreateChildMessage(null)
                  await updateWorkOrder(wo.id, { status: "printed" })
                  setPrintingCreateChildMessage("Work order marked as printed.")
                  setPrintingWorkOrders((prev: any[]) => prev.filter((x) => x.id !== wo.id))
                  setPrintingSelectedWo(null)
                } catch {
                  setPrintingCreateChildMessage("Failed to finish work order.")
                } finally {
                  setPrintingCreateChildLoading(false)
                }
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Finish WO
            </Button>
          </div>
        )}
        {printingCreateChildMessage && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{printingCreateChildMessage}</p>
        )}
      </div>
    </div>
  ) : (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setIsAddWorkOrderOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Work Order</span>
        </Button>
      </div>
      {printingLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : printingError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{printingError}</p>
      ) : printingWorkOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
      ) : (
        <DataTable
          columns={floorWorkOrderColumns}
          data={printingWorkOrders}
          getRowId={(row) => String(row.id)}
          onRowClick={(wo) => setPrintingSelectedWo(wo)}
          scrollable
          scrollHeight="65vh"
          showSelectionSummary={false}
        />
      )}
      <WorkOrderCreateDialog
        open={isAddWorkOrderOpen}
        onOpenChange={setIsAddWorkOrderOpen}
        onCreated={(newWorkOrder) => {
          setPrintingWorkOrders((prev: any[]) => [newWorkOrder, ...prev])
        }}
      />
    </>
  )
}

