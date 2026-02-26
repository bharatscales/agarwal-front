import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { RefreshCw, ChevronDown, FileSpreadsheet, Send } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { getAllRollsStock, exportRollsStockItemWiseXlsx, exportRollsStockSummaryXlsx, bulkIssueRollsStock } from "@/lib/rolls-stock-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PAGE_SIZE = 100

export default function StockReport() {
  const [searchParams] = useSearchParams()
  const itemCodeFilter = searchParams.get("itemCode") ?? undefined
  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const nextSkipRef = useRef(0)
  const filteredRollsStock = useMemo(() => {
    if (!itemCodeFilter) return rollsStock
    return rollsStock.filter((row) => row.itemCode === itemCodeFilter)
  }, [rollsStock, itemCodeFilter])

  const fetchRollsStock = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setIsLoading(true)
        setSkip(0)
        setHasMore(true)
        nextSkipRef.current = 0
      }
      setError(null)
      const start = reset ? 0 : nextSkipRef.current
      const limit = PAGE_SIZE
      const data = await getAllRollsStock(start, limit, false)
      if (reset) {
        setRollsStock(data)
        setSkip(data.length)
        nextSkipRef.current = data.length
      } else {
        setRollsStock((prev) => [...prev, ...data])
        const newSkip = start + data.length
        setSkip(newSkip)
        nextSkipRef.current = newSkip
      }
      setHasMore(data.length === limit)
    } catch (err: unknown) {
      console.error("Error fetching rolls stock:", err)
      setError("Failed to load film stock")
      if (reset) setRollsStock([])
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return
    setIsLoadingMore(true)
    fetchRollsStock(false)
  }, [hasMore, isLoadingMore, isLoading, fetchRollsStock])

  useEffect(() => {
    fetchRollsStock()
  }, [])

  const handleRefresh = () => {
    fetchRollsStock()
  }

  const handleBulkIssue = useCallback(
    async (selectedRows: RollsStockRow[]) => {
      if (selectedRows.length === 0) return
      try {
        setIsIssuing(true)
        setError(null)
        await bulkIssueRollsStock(selectedRows.map((r) => r.id))
        await fetchRollsStock()
        setTableKey((k) => k + 1)
      } catch (err) {
        console.error("Bulk issue failed:", err)
        setError("Failed to issue selected rolls. Please try again.")
      } finally {
        setIsIssuing(false)
      }
    },
    []
  )

  const handleItemWiseExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportRollsStockItemWiseXlsx(false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Rm-Film-Stock-ItemWise-${new Date().toISOString().slice(0, 10)}.xlsx`
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
      const blob = await exportRollsStockSummaryXlsx(itemCodeFilter, false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download =
        itemCodeFilter != null && itemCodeFilter.trim() !== ""
          ? `${itemCodeFilter.trim()}_summary_${dateStr}.xlsx`
          : `Rm-Film-Stock-Summary-${dateStr}.xlsx`
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
            Rm Film Stock{itemCodeFilter ? ` — ${itemCodeFilter}` : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? `Viewing film stock for item: ${itemCodeFilter}`
              : "View and analyze RM film stock."}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading film stock...</p>
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
            Rm Film Stock{itemCodeFilter ? ` — ${itemCodeFilter}` : ""}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {itemCodeFilter
              ? `Viewing film stock for item: ${itemCodeFilter}`
              : "View and analyze RM film stock."}
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
          columns={getRollsStockColumns()}
          data={filteredRollsStock}
          getRowId={(row) => String(row.id)}
          scrollable
          scrollHeight="80vh"
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          bulkActions={(selectedRows) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBulkIssue(selectedRows)}
              disabled={isIssuing}
            >
              <Send className="h-4 w-4 mr-2" />
              {isIssuing ? "Issuing..." : `Issue selected (${selectedRows.length})`}
            </Button>
          )}
        />
      )}
    </div>
  )
}
