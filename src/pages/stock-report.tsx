import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { getAllRollsStock } from "@/lib/rolls-stock-api"
import { Button } from "@/components/ui/button"

export default function StockReport() {
  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
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
