import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type EclPanelProps = any

export function EclPanel(props: EclPanelProps) {
  const {
    eclSelectedWo,
    eclRollsLoading,
    eclLoadedRolls,
    eclAddRollForm,
    setEclAddRollForm,
    eclCreateChildLoading,
    eclFormCommittedForRollId,
    setEclCreateChildLoading,
    setEclCreateChildMessage,
    addEclRoll,
    setEclFormCommittedForRollId,
    eclCreateChildMessage,
    eclLoading,
    eclError,
    eclWorkOrders,
    setEclSelectedWo,
  } = props

  return eclSelectedWo ? (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll(s)</h4>
        {eclRollsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : eclLoadedRolls.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p>
        ) : (
          <div className="space-y-4">
            {eclLoadedRolls.map(({ jobCardNumber, roll }: any) => (
              <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Job card: {jobCardNumber}</div>
                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                  <div><dt className="text-xs uppercase text-gray-500">Barcode</dt><dd className="font-mono">{roll.barcode}</dd></div>
                  {(roll.item_name ?? roll.itemName) != null && <div><dt className="text-xs uppercase text-gray-500">Structure</dt><dd>{roll.item_name ?? roll.itemName}</dd></div>}
                  {roll.size != null && <div><dt className="text-xs uppercase text-gray-500">Size</dt><dd>{roll.size}</dd></div>}
                  {roll.micron != null && <div><dt className="text-xs uppercase text-gray-500">Micron</dt><dd>{roll.micron}</dd></div>}
                  {roll.netweight != null && <div><dt className="text-xs uppercase text-gray-500">Net weight</dt><dd>{Number(roll.netweight).toFixed(2)} kg</dd></div>}
                </dl>
                {eclAddRollForm?.roll.id === roll.id && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><Label className="text-xs">Net weight</Label><Input type="text" value={eclAddRollForm.netweight} onChange={(e) => setEclAddRollForm((p: any) => p ? { ...p, netweight: e.target.value } : null)} placeholder="Net weight" /></div>
                      <div><Label className="text-xs">Gross weight</Label><Input type="text" value={eclAddRollForm.grossweight} onChange={(e) => setEclAddRollForm((p: any) => p ? { ...p, grossweight: e.target.value } : null)} placeholder="Gross weight" /></div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={eclCreateChildLoading || (eclAddRollForm != null && eclFormCommittedForRollId === eclAddRollForm.roll.id)}
                      onClick={async () => {
                        const form = eclAddRollForm
                        const wo = eclSelectedWo
                        if (!form || wo?.itemId == null) return
                        try {
                          setEclCreateChildLoading(true)
                          setEclCreateChildMessage(null)
                          const parentIds = eclLoadedRolls.map((r: any) => r.roll.id)
                          await addEclRoll(form.jobCardId, {
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
                          setEclFormCommittedForRollId(form.roll.id)
                          setEclCreateChildMessage("Roll added.")
                        } catch {
                          setEclCreateChildMessage("Failed to add roll.")
                        } finally {
                          setEclCreateChildLoading(false)
                        }
                      }}
                    >
                      {eclCreateChildLoading ? "Adding…" : "Add roll"}
                    </Button>
                    {eclAddRollForm && eclFormCommittedForRollId === eclAddRollForm.roll.id && (
                      <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setEclFormCommittedForRollId(null); setEclAddRollForm((p: any) => p ? { ...p, size: p.roll.size != null ? String(p.roll.size) : "", micron: p.roll.micron != null ? String(p.roll.micron) : "", netweight: p.roll.netweight != null ? String(p.roll.netweight) : "", grossweight: "" } : null) }}>
                        <Plus className="h-4 w-4" /> Add new roll
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {eclCreateChildMessage && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{eclCreateChildMessage}</p>}
      </div>
    </div>
  ) : (
    <>
      {eclLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : eclError ? <p className="text-sm text-red-600 dark:text-red-400">{eclError}</p> : eclWorkOrders.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-600"><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th></tr></thead>
            <tbody>
              {eclWorkOrders.map((wo: any) => (
                <tr key={wo.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setEclSelectedWo(wo)}>
                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                  <td className="py-2"><span className={wo.status === "in_progress" ? "text-blue-600 dark:text-blue-400" : (wo.status === "completed" || wo.status === "printed") ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>{wo.status?.replace("_", " ") ?? "-"}</span></td>
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
