import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { RefreshCw } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { getAllRollsStock } from "@/lib/rolls-stock-api"
import { Button } from "@/components/ui/button"
import { getItems, type Item } from "@/lib/item-api"

const PAGE_SIZE = 100

type WipTabKey = "all" | "printing" | "inspection" | "ecl" | "lamination"

function getConfigForPath(pathname: string): {
  title: string
  description: string
  tab: WipTabKey
} {
  if (pathname.endsWith("/wip-printing")) {
    return {
      title: "WIP Printing",
      description: "View roll stock currently in WIP Printing stage.",
      tab: "printing",
    }
  }
  if (pathname.endsWith("/wip-inspection")) {
    return {
      title: "WIP Inspection",
      description: "View roll stock currently in WIP Inspection stage.",
      tab: "inspection",
    }
  }
  if (pathname.endsWith("/wip-ecl")) {
    return {
      title: "WIP ECL",
      description: "View roll stock currently in WIP ECL stage.",
      tab: "ecl",
    }
  }
  if (pathname.endsWith("/wip-lamination")) {
    return {
      title: "WIP Lamination",
      description: "View roll stock currently in WIP Lamination stage.",
      tab: "lamination",
    }
  }
  // Default: ALL WIP stages
  return {
    title: "WIP Rolls (All Stages)",
    description: "View roll stock currently in any WIP stage.",
    tab: "all",
  }
}

export default function WipReport() {
  const location = useLocation()
  const { title, description, tab } = getConfigForPath(location.pathname)

  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableKey, setTableKey] = useState(0)
  const nextSkipRef = useRef(0)

  const itemCustomerMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of items) {
      if (item.partyName) {
        map[item.itemCode] = item.partyName
      }
    }
    return map
  }, [items])

  const filteredRollsStock = useMemo(() => {
    const normalizeStage = (stage?: string | null) =>
      (stage || "").toLowerCase().replace(/[\s_]+/g, "-")

    const withCustomer: RollsStockRow[] = rollsStock.map((row) => ({
      ...row,
      customerName: itemCustomerMap[row.itemCode] ?? row.customerName ?? null,
    }))
    if (tab === "all") {
      // ALL: keep only rows whose stage starts with "wip"
      return withCustomer.filter((row) => normalizeStage(row.stage).startsWith("wip"))
    }

    return withCustomer.filter((row) => {
      const s = normalizeStage(row.stage)
      if (!s.startsWith("wip")) return false
      switch (tab) {
        case "printing":
          // Match wip-printing, wip_printed, etc.
          return s.startsWith("wip-print")
        case "inspection":
          return s.startsWith("wip-inspection")
        case "ecl":
          return s.startsWith("wip-ecl")
        case "lamination":
          return s.startsWith("wip-lamination")
        default:
          return true
      }
    })
  }, [rollsStock, tab, itemCustomerMap])

  const fetchRollsStock = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setIsLoading(true)
          setHasMore(true)
          nextSkipRef.current = 0
        }
        setError(null)
        const start = reset ? 0 : nextSkipRef.current
        const limit = PAGE_SIZE
        // Fetch all non-issued rolls; we'll filter WIP stages on the client
        const data = await getAllRollsStock(start, limit, false)
        if (reset) {
          setRollsStock(data)
          nextSkipRef.current = data.length
        } else {
          setRollsStock((prev) => [...prev, ...data])
          nextSkipRef.current = start + data.length
        }
        setHasMore(data.length === limit)
      } catch (err: unknown) {
        console.error("Error fetching WIP rolls stock:", err)
        setError("Failed to load WIP rolls")
        if (reset) setRollsStock([])
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    []
  )

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return
    setIsLoadingMore(true)
    fetchRollsStock(false)
  }, [hasMore, isLoadingMore, isLoading, fetchRollsStock])

  useEffect(() => {
    // When path changes (switching between WIP tabs), reload
    setTableKey((k) => k + 1)
    fetchRollsStock()
  }, [location.pathname, fetchRollsStock])

  useEffect(() => {
    getItems(0, 1000)
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const handleRefresh = () => {
    fetchRollsStock()
  }

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading WIP rolls...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
        </div>
        <div className="flex items-center gap-2">
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
          columns={getRollsStockColumns({ variant: "wip" })}
          data={filteredRollsStock}
          getRowId={(row) => String(row.id)}
          scrollable
          scrollHeight="80vh"
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
        />
      )}
    </div>
  )
}

