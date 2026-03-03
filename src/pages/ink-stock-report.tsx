import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { RefreshCw, ChevronDown, FileSpreadsheet, Send } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getInkStockColumns, type InkStockRow } from "@/components/columns/ink-stock-columns"
import {
  getAllInkStock,
  exportInkStockItemWiseXlsx,
  exportInkStockSummaryXlsx,
  bulkIssueInkStockWithQty,
  availableQty,
  type BulkIssueInkStockItem,
} from "@/lib/ink-stock-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export default function InkStockReport() {
  const [searchParams] = useSearchParams()
  const itemCodeFilter = searchParams.get("itemCode") ?? undefined
  const [inkStock, setInkStock] = useState<InkStockRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueRows, setIssueRows] = useState<InkStockRow[]>([])
  const [issueQtyById, setIssueQtyById] = useState<Record<number, number>>({})
  const [issueErrorsById, setIssueErrorsById] = useState<Record<number, string | null>>({})
  const filteredInkStock = useMemo(() => {
    if (!itemCodeFilter) return inkStock
    return inkStock.filter((row) => row.itemCode === itemCodeFilter)
  }, [inkStock, itemCodeFilter])

  const fetchInkStock = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllInkStock(0, 5000, false)
      setInkStock(data)
    } catch (err: unknown) {
      console.error("Error fetching ink stock:", err)
      setError("Failed to load ink stock")
      setInkStock([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInkStock()
  }, [])

  const handleRefresh = () => {
    fetchInkStock()
  }

  const handleBulkIssue = useCallback(
    async (items: BulkIssueInkStockItem[]) => {
      if (items.length === 0) return
      try {
        setIsIssuing(true)
        setError(null)
        await bulkIssueInkStockWithQty(items)
        await fetchInkStock()
        setTableKey((k) => k + 1)
      } catch (err) {
        console.error("Bulk issue failed:", err)
        setError("Failed to issue selected ink. Please try again.")
      } finally {
        setIsIssuing(false)
      }
    },
    [fetchInkStock]
  )

  const openIssueDialog = (selectedRows: InkStockRow[]) => {
    if (selectedRows.length === 0) return
    const qtyMap: Record<number, number> = {}
    selectedRows.forEach((row) => {
      qtyMap[row.id] = availableQty(row)
    })
    setIssueRows(selectedRows)
    setIssueQtyById(qtyMap)
    setIssueErrorsById({})
    setIssueDialogOpen(true)
  }

  const handleIssueQtyChange = (id: number, value: string) => {
    const num = parseFloat(value)
    setIssueQtyById((prev) => ({
      ...prev,
      [id]: Number.isNaN(num) ? 0 : num,
    }))
  }

  const handleConfirmIssue = async () => {
    if (issueRows.length === 0) return

    const newErrors: Record<number, string | null> = {}
    const items: BulkIssueInkStockItem[] = []
    let hasError = false

    for (const row of issueRows) {
      const qty = issueQtyById[row.id] ?? 0
      if (qty <= 0) {
        newErrors[row.id] = "Quantity must be greater than zero"
        hasError = true
        continue
      }
      const available = availableQty(row)
      if (qty > available) {
        newErrors[row.id] = "Quantity cannot be greater than available"
        hasError = true
        continue
      }
      newErrors[row.id] = null
      items.push({ id: row.id, issueQty: qty })
    }

    setIssueErrorsById(newErrors)
    if (hasError) return

    try {
      await handleBulkIssue(items)
      setIssueDialogOpen(false)
      setIssueRows([])
      setIssueQtyById({})
      setIssueErrorsById({})
    } catch {
      // Errors are already handled in handleBulkIssue
    }
  }

  const handleItemWiseExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportInkStockItemWiseXlsx(false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Rm-Ink-Stock-ItemWise-${new Date().toISOString().slice(0, 10)}.xlsx`
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

  const handleSummaryExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportInkStockSummaryXlsx(itemCodeFilter, false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download =
        itemCodeFilter != null && itemCodeFilter.trim() !== ""
          ? `${itemCodeFilter.trim()}_summary_${dateStr}.xlsx`
          : `Rm-Ink-Stock-Summary-${dateStr}.xlsx`
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
          <h1 className="text-lg sm:text-xl font-bold">
            Rm Ink Stock{itemCodeFilter ? ` — ${itemCodeFilter}` : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? `Viewing ink stock for item: ${itemCodeFilter}`
              : "View and analyze RM ink stock."}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading ink stock...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">
            Rm Ink Stock{itemCodeFilter ? ` — ${itemCodeFilter}` : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? `Viewing ink stock for item: ${itemCodeFilter}`
              : "View and analyze RM ink stock."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!itemCodeFilter && (
                <DropdownMenuItem
                  onClick={handleItemWiseExportXlsx}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Item wise export .xlsx"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleSummaryExportXlsx}
                disabled={isExporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Summary .xlsx"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          columns={getInkStockColumns()}
          data={filteredInkStock}
          getRowId={(row) => String(row.id)}
          bulkActions={(selectedRows) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => openIssueDialog(selectedRows)}
              disabled={isIssuing}
            >
              <Send className="h-4 w-4 mr-2" />
              {isIssuing ? "Issuing..." : `Issue selected (${selectedRows.length})`}
            </Button>
          )}
        />
      )}

      <Dialog
        open={issueDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIssueDialogOpen(false)
            setIssueRows([])
            setIssueQtyById({})
            setIssueErrorsById({})
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Issue RM Ink Stock
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-200">
              Enter the quantity to issue for each selected stock entry. You can issue partial quantities; the
              remaining balance will stay in stock.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3 max-h-80 overflow-y-auto pr-1">
            {issueRows.map((row) => {
              const available = availableQty(row)
              const value = issueQtyById[row.id] ?? available
              const errorMsg = issueErrorsById[row.id] ?? null
              return (
                <div
                  key={row.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-md p-2 flex flex-col gap-1"
                >
                  <div className="text-xs text-gray-700 dark:text-gray-200 flex flex-wrap gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {row.itemCode} — {row.itemName}
                    </span>
                    {row.grade && <span className="text-gray-700 dark:text-gray-200">Grade: {row.grade}</span>}
                    {row.color && <span className="text-gray-700 dark:text-gray-200">Color: {row.color}</span>}
                    <span>
                      Available:{" "}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {available} {row.uom}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`issue-qty-${row.id}`}
                      className="text-xs w-24 text-gray-700 dark:text-gray-200"
                    >
                      Issue qty
                    </Label>
                    <Input
                      id={`issue-qty-${row.id}`}
                      type="number"
                      step="0.01"
                      className="h-8"
                      value={value}
                      onChange={(e) => handleIssueQtyChange(row.id, e.target.value)}
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMsg}</p>
                  )}
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIssueDialogOpen(false)
                setIssueRows([])
                setIssueQtyById({})
                setIssueErrorsById({})
              }}
              disabled={isIssuing}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmIssue} disabled={isIssuing || issueRows.length === 0}>
              {isIssuing ? "Issuing..." : "Confirm issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
