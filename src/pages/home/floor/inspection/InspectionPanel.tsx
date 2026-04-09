import { Check, Pencil, Plus, Printer, ScanBarcode, X } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    setInspectionAddRollEditingField,
    scaleWeight,
    setInspectionAddRollForm,
    inspectionChildRollsLoading,
    inspectionChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    inspectionFormCommittedForRollId,
    inspectionAddRollEditingField,
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
  } = props

  return inspectionSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll</h4>
            {inspectionRollsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : inspectionLoadedRolls.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p>
            ) : (
              <div className="space-y-4">
                {inspectionLoadedRolls.map(({ jobCardNumber, jobCardId, roll }: any) => (
                  <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">Job card: {jobCardNumber}</div>
                    <dl className="grid grid-cols-5 gap-x-6 gap-y-2 text-gray-600 dark:text-gray-400">
                      <div>
                        <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Barcode</dt>
                        <dd className="font-mono text-gray-900 dark:text-gray-100">{roll.barcode}</dd>
                      </div>
                      {(roll.item_name ?? roll.itemName) != null && (
                        <div>
                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Structure</dt>
                          <dd>{roll.item_name ?? roll.itemName}</dd>
                        </div>
                      )}
                      {roll.size != null && (
                        <div>
                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Size</dt>
                          <dd>{roll.size}</dd>
                        </div>
                      )}
                      {roll.micron != null && (
                        <div>
                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Micron</dt>
                          <dd>{roll.micron}</dd>
                        </div>
                      )}
                      {roll.netweight != null && (
                        <div>
                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Net weight</dt>
                          <dd>{Number(roll.netweight).toFixed(2)} kg</dd>
                        </div>
                      )}
                    </dl>
                    {!(inspectionAddRollForm?.roll.id === roll.id) && (
                      <div className="mt-4 pt-3 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={inspectionCreateChildLoading}
                          onClick={async () => {
                            try {
                              setInspectionCreateChildLoading(true)
                              setInspectionCreateChildMessage(null)
                              const parent = await getRollsStockById(roll.id)
                              setInspectionAddRollEditingField(null)
                              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                              setInspectionAddRollForm({
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
                              })
                            } catch {
                              setInspectionCreateChildMessage("Failed to load parent roll.")
                            } finally {
                              setInspectionCreateChildLoading(false)
                            }
                          }}
                        >
                          Add to stock
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(inspectionChildRollsLoading || inspectionChildRollsFromDb.length > 0) && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Produced rolls</h4>
              {inspectionChildRollsLoading ? (
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
                      {inspectionChildRollsFromDb.map((r: any) => (
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
                              disabled={!wipPrintingTemplate || inspectionCreateChildLoading}
                              onClick={async () => {
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
                                  setInspectionCreateChildMessage("Failed to send reprint to printer.")
                                } finally {
                                  setInspectionCreateChildLoading(false)
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

          {inspectionAddRollForm && inspectionFormCommittedForRollId !== inspectionAddRollForm.roll.id && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs">Item (from work order)</Label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{inspectionSelectedWo?.itemName ?? "—"}</p>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs">Barcode</Label>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 mt-0.5">{inspectionAddRollForm.roll.barcode ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs">Net weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {inspectionAddRollEditingField === "netweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={inspectionAddRollForm.netweight}
                          onChange={(e) => setInspectionAddRollForm((prev: any) => (prev ? { ...prev, netweight: e.target.value } : null))}
                          autoFocus
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setInspectionAddRollEditingField(null)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{inspectionAddRollForm.netweight || "—"}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setInspectionAddRollEditingField("netweight")}>
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Gross weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {inspectionAddRollEditingField === "grossweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={inspectionAddRollForm.grossweight}
                          onChange={(e) => setInspectionAddRollForm((prev: any) => (prev ? { ...prev, grossweight: e.target.value } : null))}
                          autoFocus
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setInspectionAddRollEditingField(null)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{inspectionAddRollForm.grossweight || "—"}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setInspectionAddRollEditingField("grossweight")}>
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
          {!inspectionRollsLoading && inspectionLoadedRolls.length > 0 && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-2"
                disabled={inspectionCreateChildLoading || (inspectionAddRollForm != null && inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id)}
                onClick={async () => {
                  const form = inspectionAddRollForm
                  const wo = inspectionSelectedWo
                  if (form && wo?.itemId != null) {
                    try {
                      setInspectionCreateChildLoading(true)
                      setInspectionCreateChildMessage(null)
                      const parentIds = inspectionLoadedRolls.map((r: any) => r.roll.id)
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
                      props.getRollsStockByParentIds(parentIds, "wip_inspection").then(setInspectionChildRollsFromDb)
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
    </div>
  ) : (
    <>
      <div className="mb-4 space-y-1">
        <Label htmlFor="floor-inspection-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode
        </Label>
        <div className="flex flex-wrap items-center gap-2 max-w-2xl">
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
        {floorInspectionBarcodeError && <p className="text-sm text-red-500">{floorInspectionBarcodeError}</p>}
      </div>
      {floorInspectionWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select WIP Printing roll</CardTitle>
                <CardDescription>
                  Pick a roll to load into inspection (same as scanning its barcode). Non-issued rolls in WIP Printing stage are listed.
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
                  {floorInspectionWipRollsError && <p className="text-sm text-red-500 mb-3">{floorInspectionWipRollsError}</p>}
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
      {inspectionLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : inspectionError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{inspectionError}</p>
      ) : inspectionWorkOrders.length === 0 ? (
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
              {inspectionWorkOrders.map((wo: any) => (
                <tr
                  key={wo.id}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => setInspectionSelectedWo(wo)}
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
