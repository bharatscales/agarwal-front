import { Check, Pencil, Plus, Printer, ScanBarcode, X } from "lucide-react"
import { useMemo } from "react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type EclPanelProps = any

function stageLabel(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase()
  if (s === "wip_printed" || s === "wip-printing") return "WIP Printing"
  if (s === "wip_inspection" || s === "wip-inspection") return "WIP Inspection"
  if (s === "virgin_rm" || s === "virgin-rm") return "RM Film"
  if (s === "rm_balance") return "RM Balance"
  return stage || "—"
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
    getRollsStockById,
    setEclAddRollEditingField,
    scaleWeight,
    setEclAddRollForm,
    eclChildRollsLoading,
    eclChildRollsFromDb,
    wipPrintingTemplate,
    createPrintJob,
    getPrintJob,
    setPrintingPrintStatus,
    eclFormCommittedForRollId,
    eclAddRollEditingField,
    addEclRoll,
    setEclFormCommittedForRollId,
    setEclChildRollsFromDb,
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

  const floorWorkOrderColumns = useMemo(
    () => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined),
    [onSkipWorkOrder]
  )

  const wipParent = eclLoadedRolls.find((r: any) => getEclParentRole(r.roll.stage) === "wip") ?? null
  const rmParent = eclLoadedRolls.find((r: any) => getEclParentRole(r.roll.stage) === "rm") ?? null
  const bothParentsLoaded = wipParent != null && rmParent != null
  const sameJobCard =
    bothParentsLoaded && wipParent.jobCardId === rmParent.jobCardId
  const canProduce = bothParentsLoaded && sameJobCard
  const hasProducedChildren = eclChildRollsFromDb.length > 0

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

  const renderParentSlot = (
    role: "wip" | "rm",
    entry: { jobCardNumber: string; jobCardId: number; roll: any } | null,
    barcode: string,
    setBarcode: (v: string) => void,
    onSelectStock: () => void
  ) => {
    const title = role === "wip" ? "Parent 1 — WIP parent" : "Parent 2 — RM Film"
    const placeholder =
      role === "wip" ? "Scan WIP parent barcode" : "Scan RM Film (virgin RM or RM Balance) barcode"

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-gray-700 dark:text-gray-300">{title}</div>
          {entry && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 -mt-1 -mr-1"
              title={
                hasProducedChildren
                  ? "Cannot unload: produced rolls exist for these parents"
                  : "Remove loaded roll"
              }
              disabled={eclCreateChildLoading || hasProducedChildren}
              onClick={() => void handleUnloadEclRoll(entry.jobCardId, entry.roll.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {entry ? (
          <>
            <div className="text-xs text-gray-500">Job card: {entry.jobCardNumber}</div>
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 text-gray-600 dark:text-gray-400">
              <div>
                <dt className="text-xs uppercase text-gray-500">Barcode</dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">{entry.roll.barcode}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Stage</dt>
                <dd>{stageLabel(entry.roll.stage)}</dd>
              </div>
              {(entry.roll.item_name ?? entry.roll.itemName) != null && (
                <div>
                  <dt className="text-xs uppercase text-gray-500">Structure</dt>
                  <dd>{entry.roll.item_name ?? entry.roll.itemName}</dd>
                </div>
              )}
              {entry.roll.size != null && (
                <div>
                  <dt className="text-xs uppercase text-gray-500">Size</dt>
                  <dd>{entry.roll.size}</dd>
                </div>
              )}
              {entry.roll.netweight != null && (
                <div>
                  <dt className="text-xs uppercase text-gray-500">Net weight</dt>
                  <dd>{Number(entry.roll.netweight).toFixed(2)} kg</dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Not loaded yet.</p>
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
                disabled={floorEclBarcodeChecking || (role === "wip" ? floorEclWipRollsLoading : floorEclRmRollsLoading)}
                onClick={() => void onSelectStock()}
              >
                Select Stock
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return eclSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Parent rolls</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            ECL needs both parents on the same job card: one WIP parent roll and one RM Film roll.
          </p>
          {eclRollsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              {renderParentSlot(
                "wip",
                wipParent,
                floorEclDetailWipBarcode,
                setFloorEclDetailWipBarcode,
                openFloorEclWipPicker
              )}
              {renderParentSlot(
                "rm",
                rmParent,
                floorEclDetailRmBarcode,
                setFloorEclDetailRmBarcode,
                openFloorEclRmPicker
              )}
              {floorEclBarcodeError && <p className="text-sm text-red-500">{floorEclBarcodeError}</p>}
              {bothParentsLoaded && !sameJobCard && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Both parents must be loaded on the same ECL job card before producing.
                </p>
              )}
            </div>
          )}

          {canProduce && !(eclAddRollForm && eclFormCommittedForRollId === eclAddRollForm.roll.id) && (
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={eclCreateChildLoading}
                onClick={async () => {
                  try {
                    setEclCreateChildLoading(true)
                    setEclCreateChildMessage(null)
                    const source = wipParent!
                    const parent = await getRollsStockById(source.roll.id)
                    setEclAddRollEditingField(null)
                    const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                    setEclAddRollForm({
                      jobCardNumber: source.jobCardNumber,
                      jobCardId: source.jobCardId,
                      roll: source.roll,
                      parent: { gradeId: parent.gradeId },
                      size: source.roll.size != null ? String(source.roll.size) : "",
                      micron: source.roll.micron != null ? String(source.roll.micron) : "",
                      netweight: source.roll.netweight != null ? String(source.roll.netweight) : "",
                      grossweight:
                        grossFromScale ||
                        (parent.grossweight != null
                          ? String(parent.grossweight)
                          : source.roll.netweight != null
                            ? String(source.roll.netweight)
                            : ""),
                    })
                  } catch {
                    setEclCreateChildMessage("Failed to load parent roll.")
                  } finally {
                    setEclCreateChildLoading(false)
                  }
                }}
              >
                Add to stock
              </Button>
            </div>
          )}

          {(eclChildRollsLoading || eclChildRollsFromDb.length > 0) && (
            <div className="mt-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Produced rolls</h4>
              {eclChildRollsLoading ? (
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
                      {eclChildRollsFromDb.map((r: any) => (
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
                              disabled={!wipPrintingTemplate || eclCreateChildLoading}
                              onClick={async () => {
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
                                      grossweight: r.grossweight,
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
                                  setEclCreateChildMessage("Failed to send reprint to printer.")
                                } finally {
                                  setEclCreateChildLoading(false)
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

          {eclAddRollForm && eclFormCommittedForRollId !== eclAddRollForm.roll.id && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs">Item (from work order)</Label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{eclSelectedWo?.itemName ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs">Net weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {eclAddRollEditingField === "netweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={eclAddRollForm.netweight}
                          onChange={(e) => setEclAddRollForm((prev: any) => (prev ? { ...prev, netweight: e.target.value } : null))}
                          autoFocus
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEclAddRollEditingField(null)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{eclAddRollForm.netweight || "—"}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEclAddRollEditingField("netweight")}>
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Gross weight (kg)</Label>
                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                    {eclAddRollEditingField === "grossweight" ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          value={eclAddRollForm.grossweight}
                          onChange={(e) => setEclAddRollForm((prev: any) => (prev ? { ...prev, grossweight: e.target.value } : null))}
                          autoFocus
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEclAddRollEditingField(null)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{eclAddRollForm.grossweight || "—"}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEclAddRollEditingField("grossweight")}>
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
          {!eclRollsLoading && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-2"
                disabled={
                  eclCreateChildLoading ||
                  !canProduce ||
                  !eclAddRollForm ||
                  eclFormCommittedForRollId === eclAddRollForm.roll.id
                }
                onClick={async () => {
                  const form = eclAddRollForm
                  const wo = eclSelectedWo
                  if (!form || wo?.itemId == null || !wipParent || !rmParent) return
                  if (wipParent.jobCardId !== rmParent.jobCardId) {
                    setEclCreateChildMessage("Both parents must be on the same ECL job card.")
                    return
                  }
                  try {
                    setEclCreateChildLoading(true)
                    setEclCreateChildMessage(null)
                    const parentIds = [wipParent.roll.id, rmParent.roll.id]
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
                        name: `ECL - ${form.jobCardNumber}`,
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
                    await addEclRoll(form.jobCardId, {
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
                    setEclFormCommittedForRollId(form.roll.id)
                    props.getRollsStockByParentIds(parentIds, "wip_ecl").then(setEclChildRollsFromDb)
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
              {eclAddRollForm && eclFormCommittedForRollId === eclAddRollForm.roll.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEclFormCommittedForRollId(null)
                    setEclAddRollForm((prev: any) =>
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
          {eclCreateChildMessage && (
            <p className="text-xs text-gray-600 dark:text-gray-400">{eclCreateChildMessage}</p>
          )}
        </div>
      </div>

      {floorEclWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select WIP parent roll</CardTitle>
                <CardDescription>
                  Pick a WIP Printing or WIP Inspection roll as parent 1 for ECL.
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
                <CardTitle>Select RM Film parent roll</CardTitle>
                <CardDescription>
                  Pick a virgin RM or RM Balance roll as parent 2 for ECL.
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
    </div>
  ) : (
    <>
      <div className="mb-4 space-y-1">
        <Label htmlFor="floor-ecl-barcode" className="text-xs text-gray-600 dark:text-gray-400">
          Barcode (WIP Printing / Inspection)
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Load the WIP parent first to open the work order, then load RM Film as the second parent.
        </p>
        <div className="flex flex-wrap items-center gap-2 max-w-2xl">
          <div className="relative min-w-[min(100%,18rem)] flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="floor-ecl-barcode"
              type="text"
              placeholder="Scan or enter WIP roll barcode"
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
      {floorEclWipPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Select WIP parent roll</CardTitle>
                <CardDescription>
                  Pick a WIP Printing or WIP Inspection roll to load into ECL.
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
                    key="floor-ecl-wip-picker-list"
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
