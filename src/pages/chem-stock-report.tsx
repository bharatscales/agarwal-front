import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { RefreshCw, ChevronDown, FileSpreadsheet, Send } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getChemStockColumns } from "@/components/columns/chem-stock-columns"
import {
  getAllChemStock,
  exportChemStockItemWiseXlsx,
  exportChemStockSummaryXlsx,
  bulkIssueChemStockWithQty,
  availableQtyChem,
  getChemGroupLabel,
  type ChemStockRow,
  type ChemItemGroup,
} from "@/lib/chem-stock-api"
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

type Props = { group: ChemItemGroup }

export function ChemStockReport({ group }: Props) {
  const [searchParams] = useSearchParams()
  const itemCodeFilter = searchParams.get("itemCode") ?? undefined
  const [data, setData] = useState<ChemStockRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const label = getChemGroupLabel(group)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueRows, setIssueRows] = useState<ChemStockRow[]>([])
  const [issueQtyById, setIssueQtyById] = useState<Record<number, number>>({})
  const [issueErrorsById, setIssueErrorsById] = useState<Record<number, string | null>>({})
  const filteredData = useMemo(() => {
    if (!itemCodeFilter) return data
    return data.filter((row) => row.itemCode === itemCodeFilter)
  }, [data, itemCodeFilter])

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const list = await getAllChemStock(0, 5000, group, false)
      setData(list)
    } catch (err: unknown) {
      console.error("Error fetching chem stock:", err)
      setError("Failed to load " + label.toLowerCase() + " stock")
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [group, label])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBulkIssue = useCallback(
    async (items: { id: number; issueQty: number }[]) => {
      if (items.length === 0) return
      try {
        setIsIssuing(true)
        setError(null)
        await bulkIssueChemStockWithQty(items)
        await fetchData()
        setTableKey((k) => k + 1)
      } catch (err) {
        console.error("Bulk issue failed:", err)
        setError("Failed to issue selected. Please try again.")
      } finally {
        setIsIssuing(false)
      }
    },
    [fetchData]
  )

  const openIssueDialog = (selectedRows: ChemStockRow[]) => {
    if (selectedRows.length === 0) return
    const qtyMap: Record<number, number> = {}
    selectedRows.forEach((row) => {
      qtyMap[row.id] = availableQtyChem(row)
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
    const items: { id: number; issueQty: number }[] = []
    let hasError = false

    for (const row of issueRows) {
      const qty = issueQtyById[row.id] ?? 0
      if (qty <= 0) {
        newErrors[row.id] = "Quantity must be greater than zero"
        hasError = true
        continue
      }
      const available = availableQtyChem(row)
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
      // Errors already handled in handleBulkIssue
    }
  }

  const handleItemWiseExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportChemStockItemWiseXlsx(group, false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Rm-" + label + "-Stock-ItemWise-" + new Date().toISOString().slice(0, 10) + ".xlsx"
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
      const blob = await exportChemStockSummaryXlsx(itemCodeFilter, group, false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download =
        itemCodeFilter != null && itemCodeFilter.trim() !== ""
          ? itemCodeFilter.trim() + "_summary_" + dateStr + ".xlsx"
          : "Rm-" + label + "-Stock-Summary-" + dateStr + ".xlsx"
      a.href = url
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
            Rm {label} Stock{itemCodeFilter ? " — " + itemCodeFilter : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? "Viewing " + label.toLowerCase() + " stock for item: " + itemCodeFilter
              : "View and analyze RM " + label.toLowerCase() + " stock."}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading {label.toLowerCase()} stock...</p>
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
            Rm {label} Stock{itemCodeFilter ? " — " + itemCodeFilter : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? "Viewing " + label.toLowerCase() + " stock for item: " + itemCodeFilter
              : "View and analyze RM " + label.toLowerCase() + " stock."}
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
                <DropdownMenuItem onClick={handleItemWiseExportXlsx} disabled={isExporting}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Item wise export .xlsx"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSummaryExportXlsx} disabled={isExporting}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Summary .xlsx"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {!error && (
        <DataTable
          key={tableKey}
          columns={getChemStockColumns()}
          data={filteredData}
          getRowId={(row) => String(row.id)}
          bulkActions={(selectedRows) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => openIssueDialog(selectedRows as ChemStockRow[])}
              disabled={isIssuing}
            >
              <Send className="h-4 w-4 mr-2" />
              {isIssuing ? "Issuing..." : "Issue selected (" + selectedRows.length + ")"}
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
              Issue Rm {label} Stock
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-200">
              Enter the quantity to issue for each selected {label.toLowerCase()} stock entry. You can issue partial
              quantities; the remaining balance will stay in stock.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3 max-h-80 overflow-y-auto pr-1">
            {issueRows.map((row) => {
              const available = availableQtyChem(row)
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
                      htmlFor={`chem-issue-qty-${row.id}`}
                      className="text-xs w-24 text-gray-700 dark:text-gray-200"
                    >
                      Issue qty
                    </Label>
                    <Input
                      id={`chem-issue-qty-${row.id}`}
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
