import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw, ScanBarcode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllWorkOrders } from "@/lib/work-order-api"
import { getAllJobCards } from "@/lib/job-card-api"
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
                          {card.inputQty !== null && card.inputQty !== undefined && (
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
                          {card.inputRollCount !== null && card.inputRollCount !== undefined && (
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
                        <div className="mt-1 max-w-xs">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Scan roll / ink QR code
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="text"
                                placeholder="Scan roll or ink QR..."
                                className="pr-8"
                              />
                              {/* Mobile-only camera trigger inside field */}
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
                        </div>
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


