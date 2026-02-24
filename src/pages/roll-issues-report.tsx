import { useEffect, useState, useCallback } from "react"
import { RefreshCw, FileSpreadsheet, RotateCcw } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { getAllRollsStock, exportRollsStockSummaryXlsx, bulkRestoreRollsStock } from "@/lib/rolls-stock-api"
import { Button } from "@/components/ui/button"
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

const RESTORE_CONFIRM_TEXT = "restore"

export default function RollIssuesReport() {
  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("")
  const [pendingRestoreRows, setPendingRestoreRows] = useState<RollsStockRow[]>([])

  const fetchRollsStock = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllRollsStock(0, 5000, true)
      setRollsStock(data)
    } catch (err: unknown) {
      console.error("Error fetching issued rolls:", err)
      setError("Failed to load issued rolls")
      setRollsStock([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRollsStock()
  }, [])

  const handleRefresh = () => {
    fetchRollsStock()
  }

  const openRestoreDialog = useCallback((selectedRows: RollsStockRow[]) => {
    setPendingRestoreRows(selectedRows)
    setRestoreConfirmInput("")
    setRestoreDialogOpen(true)
  }, [])

  const closeRestoreDialog = useCallback(() => {
    setRestoreDialogOpen(false)
    setPendingRestoreRows([])
    setRestoreConfirmInput("")
  }, [])

  const handleConfirmRestore = useCallback(async () => {
    if (pendingRestoreRows.length === 0 || restoreConfirmInput.trim().toLowerCase() !== RESTORE_CONFIRM_TEXT) return
    try {
      setIsRestoring(true)
      setError(null)
      await bulkRestoreRollsStock(pendingRestoreRows.map((r) => r.id))
      closeRestoreDialog()
      await fetchRollsStock()
      setTableKey((k) => k + 1)
    } catch (err) {
      console.error("Bulk restore failed:", err)
      setError("Failed to restore selected rolls. Please try again.")
      closeRestoreDialog()
    } finally {
      setIsRestoring(false)
    }
  }, [pendingRestoreRows, restoreConfirmInput, closeRestoreDialog])

  const handleSummaryExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportRollsStockSummaryXlsx(undefined, true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Rm-Rolls-Issued-Summary-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
      setError("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold">RM Rolls Issued</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            View issued rolls only.
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading rolls issued...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">RM Rolls Issued</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            View issued rolls only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSummaryExportXlsx}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Summary .xlsx"}
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {!error && (
        <DataTable
          key={tableKey}
          columns={getRollsStockColumns({ showIssuedAt: true })}
          data={rollsStock}
          getRowId={(row) => String(row.id)}
          bulkActions={(selectedRows) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openRestoreDialog(selectedRows)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore selected ({selectedRows.length})
            </Button>
          )}
        />
      )}

      <Dialog open={restoreDialogOpen} onOpenChange={(open) => !open && closeRestoreDialog()}>
        <DialogContent className="dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Restore selected rolls</DialogTitle>
            <DialogDescription className="dark:text-zinc-300">
              This will mark the selected {pendingRestoreRows.length} roll(s) as not issued so they
              appear again in RM Rolls Stock. Type <strong className="dark:text-zinc-200">restore</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="restore-confirm" className="dark:text-zinc-300">
              Type &quot;restore&quot; to confirm
            </Label>
            <Input
              id="restore-confirm"
              value={restoreConfirmInput}
              onChange={(e) => setRestoreConfirmInput(e.target.value)}
              placeholder="restore"
              className="font-mono dark:text-zinc-100 dark:placeholder:text-zinc-500"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRestoreDialog} disabled={isRestoring}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={
                isRestoring ||
                restoreConfirmInput.trim().toLowerCase() !== RESTORE_CONFIRM_TEXT
              }
            >
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
