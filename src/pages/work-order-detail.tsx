import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw, ScanBarcode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllWorkOrders } from "@/lib/work-order-api"
import { getAllJobCards, scanRoll, mapJobCard, getCurrentRoll, type CurrentRoll } from "@/lib/job-card-api"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"

type JobCard = {
  id: number
  jobCardNumber: string
  workOrderId: number
  woNumber?: string | null
  partyName?: string | null
  itemName?: string | null
  operation: string
  machineId: number
  machineCode?: string | null
  machineName?: string | null
  operatorName: string
  shift: string
  inputQty?: number | null
  outputQty?: number | null
  wastageQty?: number | null
  inputRollCount?: number | null
  outputRollCount?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  createdBy?: number
  createdAt?: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "planned":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
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

const getPriorityColor = (priority?: string | null) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "normal":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workOrder, setWorkOrder] = useState<WorkOrderMaster | null>(null)
  const [jobCards, setJobCards] = useState<JobCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanValue, setScanValue] = useState<Record<number, string>>({})
  const [scanMessage, setScanMessage] = useState<Record<number, { type: "success" | "error"; text: string }>>({})
  const [scanningCardId, setScanningCardId] = useState<number | null>(null)
  const [currentRollByCard, setCurrentRollByCard] = useState<Record<number, CurrentRoll | null>>({})

  const fetchData = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch work order
      const workOrders = await getAllWorkOrders()
      const wo = workOrders.find((w) => w.id === parseInt(id))
      if (!wo) {
        setError("Work order not found")
        return
      }
      setWorkOrder(wo)

      // Fetch job cards for this work order
      const cards = await getAllJobCards(0, 1000, parseInt(id))
      setJobCards(cards)

      // Fetch current loaded roll for each Printing and Inspection job card
      const cardsWithRoll = cards.filter(
        (c) => c.operation === "Printing" || c.operation === "Inspection"
      )
      if (cardsWithRoll.length > 0) {
        const results = await Promise.all(
          cardsWithRoll.map(async (c) => {
            try {
              const roll = await getCurrentRoll(c.id)
              return { id: c.id, roll }
            } catch {
              return { id: c.id, roll: null }
            }
          })
        )
        setCurrentRollByCard((prev) => {
          const next: Record<number, CurrentRoll | null> = { ...prev }
          for (const r of results) {
            next[r.id] = r.roll
          }
          return next
        })
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError("Failed to load work order details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleScanRoll = async (card: JobCard, barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed || card.operation !== "Printing") return
    setScanningCardId(card.id)
    setScanMessage((prev) => ({ ...prev, [card.id]: { type: "success", text: "" } }))
    try {
      const data = await scanRoll(card.id, trimmed)
      setWorkOrder((prev) =>
        prev
          ? {
              ...prev,
              status: data.work_order.status,
              startedAt: data.work_order.started_at ?? prev.startedAt,
            }
          : null
      )
      setJobCards((prev) =>
        prev.map((c) => (c.id === card.id ? mapJobCard(data.job_card) : c))
      )
      setCurrentRollByCard((prev) => ({ ...prev, [card.id]: data.roll }))
      setScanValue((prev) => ({ ...prev, [card.id]: "" }))
      const parts: string[] = [`Roll ${data.roll.barcode}`]
      if (data.roll.size != null) parts.push(`Size ${data.roll.size}`)
      if (data.roll.micron != null) parts.push(`Micron ${data.roll.micron}`)
      if (data.roll.netweight != null) parts.push(`Weight ${data.roll.netweight.toFixed(2)} KG`)
      const detailText = parts.join(" • ")
      setScanMessage((prev) => ({
        ...prev,
        [card.id]: {
          type: "success",
          text: `${detailText} loaded`,
        },
      }))
      setTimeout(() => {
        setScanMessage((prev) => {
          const next = { ...prev }
          delete next[card.id]
          return next
        })
      }, 4000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (err as { message?: string })?.message ||
        "Failed to load roll"
      setScanMessage((prev) => ({
        ...prev,
        [card.id]: { type: "error", text: msg },
      }))
    } finally {
      setScanningCardId(null)
    }
  }

  // Group job cards by operation
  const jobCardsByOperation = jobCards.reduce((acc, card) => {
    const operation = card.operation || "Unknown"
    if (!acc[operation]) {
      acc[operation] = []
    }
    acc[operation].push(card)
    return acc
  }, {} as Record<string, JobCard[]>)

  const operations = Object.keys(jobCardsByOperation).sort()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading work order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="px-6 pt-2 pb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/manufacturing/work-order")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Orders
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || "Work order not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-1 sm:px-3 pt-2 pb-1">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/manufacturing/work-order")}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold">
                  Work Order: {workOrder.woNumber || `#${workOrder.id}`}
                </h1>
                <Badge className={getStatusColor(workOrder.status)}>
                  {workOrder.status.replace("_", " ").toUpperCase()}
                </Badge>
                <Badge className={getPriorityColor(workOrder.priority)}>
                  {(workOrder.priority || "normal").toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Created at {formatDate(workOrder.createdAt)}
              </p>
            </div>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Work Order Details */}
      <Card className="mb-1 py-1">
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-1">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Party</p>
              <p className="text-sm font-semibold mt-1">
                {workOrder.partyName || workOrder.partyCode || <span className="text-gray-400">-</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Item</p>
              <p className="text-sm font-semibold mt-1">
                {workOrder.itemName || workOrder.itemCode || <span className="text-gray-400">-</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Quantity</p>
              <p className="text-sm font-semibold mt-1">
                {workOrder.plannedQty !== null && workOrder.plannedQty !== undefined
                  ? `${workOrder.plannedQty.toFixed(2)} KG`
                  : <span className="text-gray-400">-</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Produced Quantity</p>
              <p className="text-sm font-semibold mt-1">
                {workOrder.producedQty.toFixed(2)} KG
              </p>
            </div>
            {workOrder.startedAt && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</p>
                <p className="text-sm mt-1">{formatDate(workOrder.startedAt)}</p>
              </div>
            )}
            {workOrder.completedAt && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed At</p>
                <p className="text-sm mt-1">{formatDate(workOrder.completedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Cards by Operation */}
      {operations.length > 0 ? (
        <div className="space-y-1">
          {operations.map((operation) => (
            <Card key={operation} className="py-1">
              <CardContent className="pt-1">
                <div className="space-y-2">
                  {jobCardsByOperation[operation].map((card) => (
                    <Card key={card.id} className="bg-gray-50 dark:bg-gray-900/50 py-1">
                      <CardContent className="pt-1 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Card Number</p>
                            <p className="text-sm font-semibold mt-1">{card.jobCardNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Machine</p>
                            <p className="text-sm font-semibold mt-1">
                              {card.machineCode || card.machineName || <span className="text-gray-400">-</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Operator</p>
                            <p className="text-sm font-semibold mt-1">{card.operatorName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shift</p>
                            <p className="text-sm font-semibold mt-1">{card.shift}</p>
                          </div>
                          {card.operation !== "Printing" && card.inputQty !== null && card.inputQty !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Input Qty (KG)</p>
                              <p className="text-sm font-semibold mt-1">{card.inputQty.toFixed(2)}</p>
                            </div>
                          )}
                          {card.outputQty !== null && card.outputQty !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Output Qty (KG)</p>
                              <p className="text-sm font-semibold mt-1">{card.outputQty.toFixed(2)}</p>
                            </div>
                          )}
                          {card.wastageQty !== null && card.wastageQty !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Wastage Qty (KG)</p>
                              <p className="text-sm font-semibold mt-1">{card.wastageQty.toFixed(2)}</p>
                            </div>
                          )}
                          {card.operation !== "Printing" && card.inputRollCount !== null && card.inputRollCount !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Input Roll Count</p>
                              <p className="text-sm font-semibold mt-1">{card.inputRollCount}</p>
                            </div>
                          )}
                          {card.outputRollCount !== null && card.outputRollCount !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Output Roll Count</p>
                              <p className="text-sm font-semibold mt-1">{card.outputRollCount}</p>
                            </div>
                          )}
                          {card.startedAt && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</p>
                              <p className="text-sm mt-1">{formatDate(card.startedAt)}</p>
                            </div>
                          )}
                          {card.finishedAt && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Finished At</p>
                              <p className="text-sm mt-1">{formatDate(card.finishedAt)}</p>
                            </div>
                          )}
                        </div>
                        {(card.operation === "Printing" || card.operation === "Inspection") && (
                          <div className="mt-1 max-w-xs">
                            {card.operation === "Printing" && (
                              <>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Scan roll barcode (then Enter)
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      type="text"
                                      placeholder="Scan roll barcode..."
                                      className="pr-8"
                                      value={scanValue[card.id] ?? ""}
                                      onChange={(e) =>
                                        setScanValue((prev) => ({
                                          ...prev,
                                          [card.id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault()
                                          handleScanRoll(
                                            card,
                                            scanValue[card.id] ?? ""
                                          )
                                        }
                                      }}
                                      disabled={scanningCardId === card.id}
                                    />
                                    <button
                                      type="button"
                                      className="sm:hidden absolute inset-y-0 right-2 my-auto inline-flex items-center justify-center text-gray-500 hover:text-gray-700"
                                      onClick={() => fileInputRef.current?.click()}
                                    >
                                      <ScanBarcode className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                  />
                                </div>
                                {scanMessage[card.id] && (
                                  <p
                                    className={
                                      scanMessage[card.id].type === "success"
                                        ? "text-sm text-green-600 dark:text-green-400 mt-1"
                                        : "text-sm text-red-600 dark:text-red-400 mt-1"
                                    }
                                  >
                                    {scanMessage[card.id].text}
                                  </p>
                                )}
                              </>
                            )}
                            {currentRollByCard[card.id] && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Loaded roll
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border border-gray-200 dark:border-gray-700 text-[11px]">
                                    <thead className="bg-gray-100 dark:bg-gray-800/60">
                                      <tr>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                          Roll Barcode
                                        </th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                          Item Name
                                        </th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                          Size
                                        </th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                          Micron
                                        </th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                          Net Weight (KG)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                          {currentRollByCard[card.id]?.barcode}
                                        </td>
                                        <td className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                          {currentRollByCard[card.id]?.itemName ||
                                            currentRollByCard[card.id]?.item_name ||
                                            "-"}
                                        </td>
                                        <td className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                          {currentRollByCard[card.id]?.size != null
                                            ? currentRollByCard[card.id]?.size
                                            : "-"}
                                        </td>
                                        <td className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                          {currentRollByCard[card.id]?.micron != null
                                            ? currentRollByCard[card.id]?.micron
                                            : "-"}
                                        </td>
                                        <td className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                          {currentRollByCard[card.id]?.netweight != null
                                            ? currentRollByCard[card.id]?.netweight?.toFixed(2)
                                            : "-"}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500 dark:text-gray-400">
              No job cards found for this work order.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


