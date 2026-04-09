import { CheckCircle, Plus, Printer } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PrintingPanelProps = any

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
    scaleWeight,
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
  } = props

  return printingSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div>
        <div className="flex flex-col-reverse gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll</h4>
            {printingRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : printingLoadedRolls.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No roll currently loaded for this work order.
              </p>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
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
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Wastage (kg)</th>
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
                            const woItemId = printingSelectedWo?.itemId
                            if (woItemId == null) {
                              setPrintingCreateChildMessage("Work order has no item.")
                              return
                            }
                            try {
                              setPrintingCreateChildLoading(true)
                              setPrintingCreateChildMessage(null)
                              const parent = await getRollsStockById(roll.id)
                              setPrintingAddRollEditingField(null)
                              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                              setPrintingAddRollForm({
                                jobCardNumber,
                                jobCardId,
                                roll,
                                parent: { gradeId: parent.gradeId },
                                size: roll.size != null ? String(roll.size) : "",
                                micron: roll.micron != null ? String(roll.micron) : "",
                                netweight: roll.netweight != null ? String(roll.netweight) : "",
                                grossweight:
                                  grossFromScale ||
                                  (parent.grossweight != null
                                    ? String(parent.grossweight)
                                    : roll.netweight != null
                                      ? String(roll.netweight)
                                      : ""),
                                wastage: parent.wastage != null ? String(parent.wastage) : "0",
                              })
                            } catch {
                              setPrintingCreateChildMessage("Failed to load parent roll.")
                            } finally {
                              setPrintingCreateChildLoading(false)
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
                              value={isSelected ? printingAddRollForm.wastage : ""}
                              onChange={(e) =>
                                setPrintingAddRollForm((prev: any) =>
                                  prev && prev.roll.id === roll.id ? { ...prev, wastage: e.target.value } : prev
                                )
                              }
                            />
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
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total net weight (kg)</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600">{printingProducedTotals.netWeight.toFixed(2)} kg</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600">Total net wastage (kg)</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold">{printingProducedTotals.netWastage.toFixed(2)} kg</td>
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
                    const netweightValue = form.netweight ? parseFloat(form.netweight) : undefined
                    const wastageValue = form.wastage ? parseFloat(form.wastage) : undefined
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
                      gradeId: form.parent.gradeId,
                      parentRollIds: parentIds.length > 0 ? parentIds : undefined,
                      weightAtTime: netweightValue,
                    })
                    setPrintingFormCommittedForRollId(form.roll.id)
                    getRollsStockByWorkOrder(wo.id, "wip_printed").then(setPrintingChildRollsFromDb)
                    setPrintingCreateChildMessage(
                      wipPrintingTemplate
                        ? "Roll added and label sent to printer."
                        : "Roll added and movement recorded. No WIP printing template configured."
                    )
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
            {printingAddRollForm && printingFormCommittedForRollId === printingAddRollForm.roll.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setPrintingFormCommittedForRollId(null)
                  setPrintingAddRollForm((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          size: prev.roll.size != null ? String(prev.roll.size) : "",
                          micron: prev.roll.micron != null ? String(prev.roll.micron) : "",
                          netweight: prev.roll.netweight != null ? String(prev.roll.netweight) : "",
                          grossweight: "",
                          wastage: "0",
                        }
                      : null
                  )
                }}
              >
                <Plus className="h-4 w-4" />
                Add new roll
              </Button>
            )}
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
        {!printingRollsLoading && printingLoadedRolls.length === 0 && printingSelectedWo && (
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
      {printingLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : printingError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{printingError}</p>
      ) : printingWorkOrders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th>
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th>
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th>
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {printingWorkOrders.map((wo: any) => (
                <tr
                  key={wo.id}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => setPrintingSelectedWo(wo)}
                >
                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                  <td className="py-2">
                    <span
                      className={
                        wo.status === "in_progress"
                          ? "text-blue-600 dark:text-blue-400"
                          : wo.status === "completed" || wo.status === "printed"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                      }
                    >
                      {wo.status?.replace("_", " ") ?? "-"}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">Click to view loaded roll</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
