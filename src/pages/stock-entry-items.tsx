import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStockVoucher } from "@/lib/stock-voucher-api"

export default function StockEntryItems() {
  const { voucherId } = useParams<{ voucherId: string }>()
  const navigate = useNavigate()
  const [voucher, setVoucher] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (voucherId) {
      getStockVoucher(Number(voucherId))
        .then(setVoucher)
        .catch((err) => {
          console.error("Error fetching voucher:", err)
          navigate("/manufacturing/stock-entry")
        })
        .finally(() => setIsLoading(false))
    }
  }, [voucherId, navigate])

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link to="/manufacturing/stock-entry" className="hover:text-gray-900 dark:hover:text-gray-100">
            Stock Entry
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-100">
            Voucher #{voucherId}
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-100">Stock Items</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Stock Items</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Add stock items to voucher #{voucherId}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
        Stock entry form will be implemented here.
      </div>
    </div>
  )
}

