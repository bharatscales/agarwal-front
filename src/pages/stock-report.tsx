import { useEffect, useState } from "react"
import { RefreshCw, ChevronDown, FileSpreadsheet } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { getAllRollsStock, exportRollsStockItemWiseXlsx } from "@/lib/rolls-stock-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function StockReport() {
  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const fetchRollsStock = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllRollsStock(0, 5000)
      setRollsStock(data)
    } catch (err: unknown) {
      console.error("Error fetching rolls stock:", err)
      setError("Failed to load rolls stock")
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

  const handleItemWiseExportXlsx = async () => {
    try {
      setIsExporting(true)
      const blob = await exportRollsStockItemWiseXlsx()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Rm-Rolls-Stock-ItemWise-${new Date().toISOString().slice(0, 10)}.xlsx`
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
          <h1 className="text-lg sm:text-xl font-bold">Rm Rolls Stock</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            View and analyze RM rolls stock.
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading rolls stock...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Rm Rolls Stock</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            View and analyze RM rolls stock.
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
              <DropdownMenuItem
                onClick={handleItemWiseExportXlsx}
                disabled={isExporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Item wise export .xlsx"}
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
          columns={getRollsStockColumns()}
          data={rollsStock}
        />
      )}
    </div>
  )
}
