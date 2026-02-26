import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { RefreshCw, ChevronDown, FileSpreadsheet, Send } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getInkStockColumns } from "@/components/columns/ink-stock-columns"
import {
  getAllChemStock,
  exportChemStockItemWiseXlsx,
  exportChemStockSummaryXlsx,
  bulkIssueChemStock,
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
    async (selectedRows: ChemStockRow[]) => {
      if (selectedRows.length === 0) return
      try {
        setIsIssuing(true)
        setError(null)
        await bulkIssueChemStock(selectedRows.map((r) => r.id))
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
          columns={getInkStockColumns()}
          data={filteredData}
          getRowId={(row) => String(row.id)}
          bulkActions={(selectedRows) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBulkIssue(selectedRows)}
              disabled={isIssuing}
            >
              <Send className="h-4 w-4 mr-2" />
              {isIssuing ? "Issuing..." : "Issue selected (" + selectedRows.length + ")"}
            </Button>
          )}
        />
      )}
    </div>
  )
}
