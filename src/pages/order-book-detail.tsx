import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FgStageBomReadonly } from "@/components/fg-stage-bom-readonly"
import type { OrderBookMaster } from "@/components/columns/order-book-columns"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import { materialRowsFromBom, type FilmStockRow } from "@/lib/bom-material"
import { getAllChemStock, type ChemStockRow } from "@/lib/chem-stock-api"
import { getItem, getItemBom, type BomLine, type Item } from "@/lib/item-api"
import { getOrderBook, getOrderDispatches, type OrderDispatch } from "@/lib/order-book-api"
import { getAllRollsStock } from "@/lib/rolls-stock-api"
import { getAllWorkOrders } from "@/lib/work-order-api"

const dash = (value: unknown) => {
  if (value == null || value === "") return <span className="text-gray-400">-</span>
  return String(value)
}

const formatQty = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(Number(value))) return "-"
  return Number(value).toFixed(2)
}

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  return value.slice(0, 10)
}

const statusClass = (status: string) => {
  switch (status) {
    case "closed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  }
}

const woStatusClass = (status: string) => {
  switch (status) {
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold mt-1 break-words">{children}</p>
    </div>
  )
}

export default function OrderBookDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderBookMaster | null>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [bomLines, setBomLines] = useState<BomLine[]>([])
  const [filmStock, setFilmStock] = useState<FilmStockRow[]>([])
  const [chemStock, setChemStock] = useState<ChemStockRow[]>([])
  const [dispatches, setDispatches] = useState<OrderDispatch[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [bomLoading, setBomLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    const orderId = Number(id)
    if (!Number.isFinite(orderId)) {
      setError("Invalid order")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const row = await getOrderBook(orderId)
      setOrder(row)

      const extra: Promise<void>[] = [
        getOrderDispatches(orderId)
          .then(setDispatches)
          .catch(() => setDispatches([])),
      ]

      if (row.itemId) {
        setBomLoading(true)
        extra.push(
          getItem(row.itemId)
            .then(setItem)
            .catch(() => setItem(null))
        )
        extra.push(
          getItemBom(row.itemId)
            .then(setBomLines)
            .catch(() => setBomLines([]))
            .finally(() => setBomLoading(false))
        )
        extra.push(
          getAllWorkOrders(0, 500)
            .then((rows) => setWorkOrders(rows.filter((wo) => wo.itemId === row.itemId)))
            .catch(() => setWorkOrders([]))
        )
        extra.push(
          Promise.all([
            getAllRollsStock(0, 5000, false, "virgin_rm").catch(() => []),
            getAllRollsStock(0, 5000, false, "rm_balance").catch(() => []),
            getAllChemStock(0, 5000, "ink", false).catch(() => []),
            getAllChemStock(0, 5000, "adhesive", false).catch(() => []),
            getAllChemStock(0, 5000, "chemical", false).catch(() => []),
          ]).then(([virgin, balance, ink, adhesive, chemical]) => {
            setFilmStock([...virgin, ...balance])
            setChemStock([...ink, ...adhesive, ...chemical])
          })
        )
      } else {
        setItem(null)
        setBomLines([])
        setFilmStock([])
        setChemStock([])
        setWorkOrders([])
      }

      await Promise.all(extra)
    } catch {
      setOrder(null)
      setError("Failed to load order details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const pendingQty = useMemo(() => {
    if (!order) return 0
    return Math.max(0, Number(order.qty || 0) - Number(order.dispatchQty || 0))
  }, [order])

  const materialRows = useMemo(
    () =>
      materialRowsFromBom({
        bomLines,
        orderQtyKg: Number(order?.qty || 0),
        filmStock,
        chemStock,
      }),
    [bomLines, order?.qty, filmStock, chemStock]
  )

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="px-6 pt-2 pb-6">
        <Button variant="ghost" onClick={() => navigate("/manufacturing/order-book")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order Book
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || "Order not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = (order.status || "pending").toLowerCase()

  return (
    <div className="px-1 sm:px-3 pt-2 pb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/manufacturing/order-book")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold truncate">
                Order: {order.orderNumber || `#${order.id}`}
              </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(status)}`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {order.itemName || order.itemCode || "Item details"}
            </p>
          </div>
        </div>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      <Card className="mb-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Order details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Field label="Order No">{dash(order.orderNumber)}</Field>
            <Field label="PO No.">{dash(order.poNo)}</Field>
            <Field label="Order Date">{formatDate(order.orderDate)}</Field>
            <Field label="Party">
              {order.partyName || order.partyCode || <span className="text-gray-400">-</span>}
            </Field>
            <Field label="Qty (KG)">{formatQty(order.qty)}</Field>
            <Field label="Dispatch Qty (KG)">{formatQty(order.dispatchQty)}</Field>
            <Field label="Pending Qty (KG)">{formatQty(pendingQty)}</Field>
            <Field label="Total GSM">{order.totalGsm != null ? Number(order.totalGsm).toFixed(2) : dash(null)}</Field>
            <Field label="Size">{dash(order.size)}</Field>
            <Field label="Coil Width">{dash(order.coilWidth)}</Field>
            <Field label="Repeat Length">{dash(order.repeatLength)}</Field>
            <Field label="No of Panel">{dash(order.noOfPanel)}</Field>
            <div className="col-span-2 md:col-span-3 lg:col-span-4">
              <Field label="Structure">{dash(order.structure)}</Field>
            </div>
            {order.remarks ? (
              <div className="col-span-2 md:col-span-3 lg:col-span-4">
                <Field label="Remarks">{order.remarks}</Field>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Item details</CardTitle>
          <CardDescription className="text-xs">From Item Master for this FG variety.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {item ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Item Code">{item.itemCode}</Field>
              <Field label="Item Name">{item.itemName}</Field>
              <Field label="Item Group">{item.itemGroup}</Field>
              <Field label="UOM">{dash(item.uom)}</Field>
              <Field label="Abbreviation">{dash(item.abv)}</Field>
              <Field label="Party">{item.partyName || item.partyCode || dash(null)}</Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Item Code">{dash(order.itemCode)}</Field>
              <Field label="Item Name">{dash(order.itemName)}</Field>
            </div>
          )}
          {item && item.routing.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Routing</p>
              <div className="flex flex-wrap gap-2">
                {item.routing
                  .slice()
                  .sort((a, b) => a.sno - b.sno)
                  .map((step) => (
                    <span
                      key={`${step.sno}-${step.operation}`}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {step.sno}. {step.operation}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {order.itemId != null && (
        <Card className="mb-3">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">BOM & structure</CardTitle>
            <CardDescription className="text-xs">
              Loaded from the FG variety in Item Master (read-only).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {bomLoading ? (
              <p className="text-sm text-muted-foreground">Loading BOM…</p>
            ) : (
              <FgStageBomReadonly lines={bomLines} />
            )}
          </CardContent>
        </Card>
      )}

      {order.itemId != null && (
        <Card className="mb-3">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Required vs available material</CardTitle>
            <CardDescription className="text-xs">
              Required is this order qty split by BOM GSM share. Available is current RM stock
              (virgin RM + RM balance for film; ink / adhesive / chemical stock for others).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {bomLoading ? (
              <p className="text-sm text-muted-foreground">Loading material…</p>
            ) : materialRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No BOM RM lines with GSM to calculate material for this order.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b">
                      <th className="py-1.5 pr-4 font-medium">Item</th>
                      <th className="py-1.5 pr-4 font-medium">Stage</th>
                      <th className="py-1.5 pr-4 font-medium">Spec</th>
                      <th className="py-1.5 pr-4 font-medium text-right">Required (KG)</th>
                      <th className="py-1.5 pr-4 font-medium text-right">Available (KG)</th>
                      <th className="py-1.5 font-medium text-right">Shortage (KG)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((row) => {
                      const shortage = Math.max(0, Math.round((row.requiredKg - row.availableKg) * 100) / 100)
                      const short = shortage > 0.009
                      const spec = row.isFilm
                        ? [
                            row.size != null ? `${row.size} mm` : null,
                            row.micron != null ? `${row.micron} µ` : null,
                            row.gsm > 0 ? `${row.gsm} gsm` : null,
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : row.gsm > 0
                          ? `${row.gsm} gsm`
                          : "—"
                      return (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="py-1.5 pr-4">
                            <div className="font-medium">
                              {row.itemCode || row.itemName || `Item #${row.rmItemId}`}
                            </div>
                            {row.itemCode && row.itemName ? (
                              <div className="text-xs text-muted-foreground">{row.itemName}</div>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-4">{row.stages.join(", ") || "—"}</td>
                          <td className="py-1.5 pr-4 tabular-nums">{spec || "—"}</td>
                          <td className="py-1.5 pr-4 text-right tabular-nums font-medium">
                            {formatQty(row.requiredKg)}
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">
                            {formatQty(row.availableKg)}
                          </td>
                          <td
                            className={`py-1.5 text-right tabular-nums font-medium ${
                              short ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"
                            }`}
                          >
                            {short ? formatQty(shortage) : "0.00"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dispatches</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {dispatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatches recorded for this order.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b">
                    <th className="py-1.5 pr-4 font-medium">Date</th>
                    <th className="py-1.5 font-medium">Qty (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-4">{formatDate(row.dispatchDate)}</td>
                      <td className="py-1.5 font-medium">{formatQty(row.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Related work orders</CardTitle>
          <CardDescription className="text-xs">Work orders for the same item.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work orders found for this item.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b">
                    <th className="py-1.5 pr-4 font-medium">WO Number</th>
                    <th className="py-1.5 pr-4 font-medium">Status</th>
                    <th className="py-1.5 pr-4 font-medium">Planned (KG)</th>
                    <th className="py-1.5 font-medium">Produced (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => navigate(`/manufacturing/work-order/${wo.id}`)}
                    >
                      <td className="py-1.5 pr-4 font-medium text-blue-700 dark:text-blue-400">
                        {wo.woNumber || `#${wo.id}`}
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${woStatusClass(wo.status)}`}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4">{formatQty(wo.plannedQty)}</td>
                      <td className="py-1.5">{formatQty(wo.producedQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
