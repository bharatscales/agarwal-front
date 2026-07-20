import { Plus } from "lucide-react"
import { useMemo } from "react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFloorWorkOrderColumns } from "../floor-work-order-columns"

type LaminationPanelProps = any

export function LaminationPanel(props: LaminationPanelProps) {
  const {
    laminationSelectedWo,
    laminationRollsLoading,
    laminationLoadedRolls,
    laminationAddRollForm,
    setLaminationAddRollForm,
    laminationCreateChildLoading,
    laminationFormCommittedForRollId,
    setLaminationCreateChildLoading,
    setLaminationCreateChildMessage,
    addLaminationRoll,
    setLaminationFormCommittedForRollId,
    laminationCreateChildMessage,
    laminationLoading,
    laminationError,
    laminationWorkOrders,
    setLaminationSelectedWo,
  } = props

  const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(), [])

  return laminationSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll(s)</h4>
        {laminationRollsLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : laminationLoadedRolls.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p> : (
          <div className="space-y-4">
            {laminationLoadedRolls.map(({ jobCardNumber, roll }: any) => (
              <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Job card: {jobCardNumber}</div>
                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                  <div><dt className="text-xs uppercase text-gray-500">Barcode</dt><dd className="font-mono">{roll.barcode}</dd></div>
                  {(roll.item_name ?? roll.itemName) != null && <div><dt className="text-xs uppercase text-gray-500">Structure</dt><dd>{roll.item_name ?? roll.itemName}</dd></div>}
                  {roll.size != null && <div><dt className="text-xs uppercase text-gray-500">Size</dt><dd>{roll.size}</dd></div>}
                  {roll.micron != null && <div><dt className="text-xs uppercase text-gray-500">Micron</dt><dd>{roll.micron}</dd></div>}
                  {roll.netweight != null && <div><dt className="text-xs uppercase text-gray-500">Net weight</dt><dd>{Number(roll.netweight).toFixed(2)} kg</dd></div>}
                </dl>
                {laminationAddRollForm?.roll.id === roll.id && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><Label className="text-xs">Net weight</Label><Input type="text" value={laminationAddRollForm.netweight} onChange={(e) => setLaminationAddRollForm((p: any) => p ? { ...p, netweight: e.target.value } : null)} placeholder="Net weight" /></div>
                      <div><Label className="text-xs">Gross weight</Label><Input type="text" value={laminationAddRollForm.grossweight} onChange={(e) => setLaminationAddRollForm((p: any) => p ? { ...p, grossweight: e.target.value } : null)} placeholder="Gross weight" /></div>
                    </div>
                    <Button type="button" size="sm" disabled={laminationCreateChildLoading || (laminationAddRollForm != null && laminationFormCommittedForRollId === laminationAddRollForm.roll.id)} onClick={async () => {
                      const form = laminationAddRollForm
                      const wo = laminationSelectedWo
                      if (!form || wo?.itemId == null) return
                      try {
                        setLaminationCreateChildLoading(true)
                        setLaminationCreateChildMessage(null)
                        const parentIds = laminationLoadedRolls.map((r: any) => r.roll.id)
                        await addLaminationRoll(form.jobCardId, { itemId: wo.itemId, rollno: "", size: form.size ? parseFloat(form.size) : undefined, micron: form.micron ? parseFloat(form.micron) : undefined, netweight: form.netweight ? parseFloat(form.netweight) : undefined, grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined, gradeId: form.parent.gradeId, parentRollIds: parentIds.length > 0 ? parentIds : undefined, weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined })
                        setLaminationFormCommittedForRollId(form.roll.id)
                        setLaminationCreateChildMessage("Roll added.")
                      } catch { setLaminationCreateChildMessage("Failed to add roll.") }
                      finally { setLaminationCreateChildLoading(false) }
                    }}>{laminationCreateChildLoading ? "Adding…" : "Add roll"}</Button>
                    {laminationAddRollForm && laminationFormCommittedForRollId === laminationAddRollForm.roll.id && (
                      <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setLaminationFormCommittedForRollId(null); setLaminationAddRollForm((p: any) => p ? { ...p, size: p.roll.size != null ? String(p.roll.size) : "", micron: p.roll.micron != null ? String(p.roll.micron) : "", netweight: p.roll.netweight != null ? String(p.roll.netweight) : "", grossweight: "" } : null) }}><Plus className="h-4 w-4" /> Add new roll</Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {laminationCreateChildMessage && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{laminationCreateChildMessage}</p>}
      </div>
    </div>
  ) : (
    <>
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
