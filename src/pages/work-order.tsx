import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { ArrowRight, Plus, RefreshCw, ScanBarcode, Search, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getWorkOrderColumns, type WorkOrderMaster } from "@/components/columns/work-order-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getPartyCustomers } from "@/lib/party-api"
import { getItemsFgVarietyByParty } from "@/lib/item-api"
import { getAllMachines } from "@/lib/machine-api"
import { getAllOperators } from "@/lib/operator-api"
import { createJobCard, scanRoll } from "@/lib/job-card-api"
import { getRollByBarcode, getWorkOrderByRollBarcode } from "@/lib/rolls-stock-api"
import { createWorkOrder, deleteWorkOrder, getAllWorkOrders, updateWorkOrder } from "@/lib/work-order-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"

type WorkOrderForm = {
  partyId: string
  itemId: string
  plannedQty: string
  priority: string
  // Job card fields (mandatory)
  machineId: string
  operatorName: string
  shift: string
}

export default function WorkOrder() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isInspectionUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "inspection" || user?.department === "Inspection")
  const fallbackPriorities = ["low", "normal", "high"]
  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false)
  const [isEditWorkOrderOpen, setIsEditWorkOrderOpen] = useState(false)
  const [editWorkOrderId, setEditWorkOrderId] = useState<number | null>(null)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const [machines, setMachines] = useState<CreatableOption[]>([])
  const [operators, setOperators] = useState<string[]>([])
  const fallbackShifts = ["A", "B"]
  const [formData, setFormData] = useState<WorkOrderForm>({
    partyId: "",
    itemId: "",
    plannedQty: "",
    priority: "normal",
    machineId: "",
    operatorName: "",
    shift: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WorkOrderForm, string>>>({})
  const [workOrders, setWorkOrders] = useState<WorkOrderMaster[]>([])
  const [woNumberSearch, setWoNumberSearch] = useState("")
  const [inspectionBarcode, setInspectionBarcode] = useState("")
  const [barcodeScanError, setBarcodeScanError] = useState<string | null>(null)
  const [isBarcodeChecking, setIsBarcodeChecking] = useState(false)
  const [inspectionAddJobCardOpen, setInspectionAddJobCardOpen] = useState(false)
  const [inspectionJobCardPayload, setInspectionJobCardPayload] = useState<{
    barcode: string
    jobCardNumber: string
    workOrderId: number
    woNumber: string | null
    operation: string
    shift: string
    machineId: number
    operatorName: string
    inspectionOperators: { value: string; label: string }[]
  } | null>(null)
  const [inspectionJobCardError, setInspectionJobCardError] = useState<string | null>(null)
  const [inspectionJobCardSubmitting, setInspectionJobCardSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<WorkOrderForm>({
    partyId: "",
    itemId: "",
    plannedQty: "",
    priority: "normal",
    machineId: "",
    operatorName: "",
    shift: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof WorkOrderForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchWorkOrders()
  }

  const getCurrentShift = () => {
    const hour = new Date().getHours()
    return hour < 14 ? "A" : "B"
  }

  /** Inspection job cards get number from backend (JBI/1, JBI/2, …); we show a placeholder until created. */
  const INSPECTION_JOB_CARD_NUMBER_PLACEHOLDER = "Auto (from inspection series)"

  const handleBarcodeScan = async () => {
    const barcode = inspectionBarcode.trim()
    if (!barcode) return
    setBarcodeScanError(null)
    setIsBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setBarcodeScanError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setBarcodeScanError("This roll is already consumed.")
        return
      }
      if (roll.issued) {
        setBarcodeScanError("This roll is already issued.")
        return
      }
      const stage = (roll.stage ?? "").toLowerCase()
      const isWipPrinting = stage === "wip-printing" || stage === "wip_printed"
      if (!isWipPrinting) {
        setBarcodeScanError("Roll must be in WIP Printing stage. Current stage: " + (roll.stage || "—"))
        return
      }
      const woInfo = await getWorkOrderByRollBarcode(barcode)
      if (!woInfo) {
        setBarcodeScanError("No work order linked to this roll (roll must come from a printing job card).")
        return
      }
      const [operatorsList, machinesList] = await Promise.all([
        getAllOperators(0, 500),
        getAllMachines(0, 500),
      ])
      const inspectionOperators = operatorsList
        .filter((op) => (op.operation ?? "").toLowerCase() === "inspection")
        .map((op) => ({ value: op.operatorName, label: op.operatorName }))
      const inspectionMachine = machinesList.find(
        (m) => (m.operation ?? "").toLowerCase() === "inspection"
      )
      if (!inspectionMachine) {
        setBarcodeScanError("No machine configured for Inspection operation.")
        return
      }
      if (inspectionOperators.length === 0) {
        setBarcodeScanError("No operators configured for Inspection operation.")
        return
      }
      setInspectionBarcode("")
      setInspectionJobCardError(null)
      setInspectionJobCardPayload({
        barcode,
        jobCardNumber: "", // Backend assigns from job_card_inspection series (JBI/1, JBI/2, …)
        workOrderId: woInfo.workOrderId,
        woNumber: woInfo.woNumber,
        operation: "Inspection",
        shift: getCurrentShift(),
        machineId: inspectionMachine.id,
        operatorName: "",
        inspectionOperators,
      })
      setInspectionAddJobCardOpen(true)
    } catch {
      setBarcodeScanError("Could not look up roll. Try again.")
    } finally {
      setIsBarcodeChecking(false)
    }
  }

  const handleInspectionJobCardSubmit = async () => {
    if (!inspectionJobCardPayload) return
    if (!inspectionJobCardPayload.operatorName.trim()) {
      setInspectionJobCardError("Operator name is required.")
      return
    }
    setInspectionJobCardError(null)
    setInspectionJobCardSubmitting(true)
    const barcode = inspectionJobCardPayload.barcode
    const workOrderId = inspectionJobCardPayload.workOrderId
    try {
      const newJobCard = await createJobCard({
        jobCardNumber: inspectionJobCardPayload.jobCardNumber, // Empty for Inspection; backend assigns from job_card_inspection series (JBI/n)
        workOrderId: inspectionJobCardPayload.workOrderId,
        operation: inspectionJobCardPayload.operation,
        machineId: inspectionJobCardPayload.machineId,
        operatorName: inspectionJobCardPayload.operatorName.trim(),
        shift: inspectionJobCardPayload.shift,
      })
      await scanRoll(newJobCard.id, barcode)
      setInspectionAddJobCardOpen(false)
      setInspectionJobCardPayload(null)
      fetchWorkOrders()
      navigate(`/manufacturing/work-order/${workOrderId}`)
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to create job card or load roll."
      setInspectionJobCardError(msg)
    } finally {
      setInspectionJobCardSubmitting(false)
    }
  }

  const handleAddWorkOrder = () => {
    setIsAddWorkOrderOpen(true)
  }

  const handleEditWorkOrderOpen = (workOrder: WorkOrderMaster) => {
    setEditWorkOrderId(workOrder.id)
    setEditFormData({
      partyId: workOrder.partyId?.toString() || "",
      itemId: workOrder.itemId?.toString() || "",
      plannedQty: workOrder.plannedQty.toString(),
      priority: workOrder.priority || "normal",
      machineId: "",
      operatorName: "",
      shift: "",
    })
    setEditErrors({})
    setIsEditWorkOrderOpen(true)
  }

  const handleInputChange = (field: keyof WorkOrderForm, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      if (field === "partyId") {
        next.itemId = "" // Clear item when party changes
      }
      return next
    })
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof WorkOrderForm, value: string) => {
    setEditFormData(prev => {
      const next = { ...prev, [field]: value }
      if (field === "partyId") {
        next.itemId = "" // Clear item when party changes
      }
      return next
    })
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEnterKey = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "Enter") return
    const nextField = addFieldRefs.current[index + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof WorkOrderForm, string>> = {}

    if (!formData.partyId.trim()) {
      errors.partyId = "Party is required"
    }
    if (!formData.itemId.trim()) {
      errors.itemId = "Item is required"
    }
    // Planned quantity is optional, but if provided, must be valid
    if (formData.plannedQty.trim()) {
      const qty = parseFloat(formData.plannedQty)
      if (isNaN(qty) || qty <= 0) {
        errors.plannedQty = "Planned quantity must be a positive number"
      }
    }
    // Job card fields are now mandatory
    if (!formData.machineId.trim()) {
      errors.machineId = "Machine is required"
    }
    if (!formData.operatorName.trim()) {
      errors.operatorName = "Operator name is required"
    }
    if (!formData.shift.trim()) {
      errors.shift = "Shift is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof WorkOrderForm, string>> = {}

    if (!editFormData.partyId.trim()) {
      errors.partyId = "Party is required"
    }
    if (!editFormData.itemId.trim()) {
      errors.itemId = "Item is required"
    }
    if (!editFormData.plannedQty.trim()) {
      errors.plannedQty = "Planned quantity is required"
    } else {
      const qty = parseFloat(editFormData.plannedQty)
      if (isNaN(qty) || qty <= 0) {
        errors.plannedQty = "Planned quantity must be a positive number"
      }
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createWorkOrder({
      woNumber: null,
      partyId: parseInt(formData.partyId),
      itemId: parseInt(formData.itemId),
      plannedQty: formData.plannedQty.trim() ? parseFloat(formData.plannedQty) : undefined,
      priority: formData.priority,
      status: "planned",
      machineId: parseInt(formData.machineId),
      operatorName: formData.operatorName,
      shift: formData.shift,
    })
      .then((newWorkOrder) => {
        setWorkOrders(prev => [newWorkOrder, ...prev])
        setFormData({
          partyId: "",
          itemId: "",
          plannedQty: "",
          priority: "normal",
          machineId: "",
          operatorName: "",
          shift: "",
        })
        setFormErrors({})
        setIsAddWorkOrderOpen(false)
      })
      .catch((err) => {
        console.error("Error creating work order:", err)
        const errorMsg = err.response?.data?.detail || "Failed to create work order. Please try again."
        setFormErrors({ partyId: errorMsg })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWorkOrderId || !validateEditForm()) return

    updateWorkOrder(editWorkOrderId, {
      partyId: parseInt(editFormData.partyId),
      itemId: parseInt(editFormData.itemId),
      plannedQty: parseFloat(editFormData.plannedQty),
      priority: editFormData.priority,
    })
      .then((updatedWorkOrder) => {
        setWorkOrders(prev =>
          prev.map(wo => (wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating work order:", err)
        const errorMsg = err.response?.data?.detail || "Failed to update work order. Please try again."
        setEditErrors({ partyId: errorMsg })
      })
  }

  const handleDeleteWorkOrder = (workOrder: WorkOrderMaster) => {
    if (!window.confirm(`Delete work order "${workOrder.woNumber || workOrder.id}"? This cannot be undone.`)) {
      return
    }
    deleteWorkOrder(workOrder.id)
      .then(() => {
        setWorkOrders(prev => prev.filter(row => row.id !== workOrder.id))
      })
      .catch((err) => {
        console.error("Error deleting work order:", err)
        setError("Failed to delete work order. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddWorkOrderOpen(false)
    setFormData({
      partyId: "",
      itemId: "",
      plannedQty: "",
      priority: "normal",
      machineId: "",
      operatorName: "",
      shift: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditWorkOrderOpen(false)
    setEditWorkOrderId(null)
    setEditFormData({
      partyId: "",
      itemId: "",
      plannedQty: "",
      priority: "normal",
      machineId: "",
      operatorName: "",
      shift: "",
    })
    setEditErrors({})
  }

  useEffect(() => {
    if (isAddWorkOrderOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddWorkOrderOpen])

  const fetchParties = async () => {
    try {
      const data = await getPartyCustomers()
      setPartyOptions(
        data.map(p => ({
          value: p.id.toString(),
          label: p.partyCode,
        }))
      )
    } catch (error) {
      console.error("Failed to load parties:", error)
    }
  }

  const fetchItemsForParty = async (partyId: number) => {
    try {
      const data = await getItemsFgVarietyByParty(partyId)
      setItemOptions(
        data.map(i => ({
          value: i.id.toString(),
          label: i.itemCode,
        }))
      )
    } catch (error) {
      console.error("Failed to load items for party:", error)
      setItemOptions([])
    }
  }

  const fetchMachines = async () => {
    try {
      const data = await getAllMachines()
      setMachines(
        data.map(m => ({
          value: m.id.toString(),
          label: m.machineCode,
        }))
      )
    } catch (error) {
      console.error("Failed to load machines:", error)
    }
  }

  const fetchOperators = async () => {
    try {
      const data = await getAllOperators()
      const uniqueNames = Array.from(new Set(data.map(op => op.operatorName)))
      setOperators(uniqueNames)
    } catch (error) {
      console.error("Failed to load operators:", error)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllWorkOrders()
      setWorkOrders(data)
    } catch (err: any) {
      console.error("Error fetching work orders:", err)
      setError("Failed to fetch work orders. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParties()
    fetchMachines()
    fetchOperators()
    fetchWorkOrders()
  }, [])

  // When party changes in add form, load items for that party and clear item
  useEffect(() => {
    if (formData.partyId) {
      fetchItemsForParty(parseInt(formData.partyId, 10))
    } else {
      setItemOptions([])
    }
  }, [formData.partyId])

  // When party changes in edit form, load items for that party
  useEffect(() => {
    if (isEditWorkOrderOpen && editFormData.partyId) {
      fetchItemsForParty(parseInt(editFormData.partyId, 10))
    }
  }, [isEditWorkOrderOpen, editFormData.partyId])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-lg sm:text-xl font-bold">Work Order</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage work orders for production planning.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {!isInspectionUser && (
              <Button onClick={handleAddWorkOrder} size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Work Order</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading work orders...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Work Orders
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {isInspectionUser && (
              <div className="relative max-w-xs w-full sm:w-auto space-y-1">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Scan barcode"
                  value={inspectionBarcode}
                  onChange={(e) => {
                    setInspectionBarcode(e.target.value)
                    setBarcodeScanError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleBarcodeScan()
                    }
                  }}
                  disabled={isBarcodeChecking}
                  className="pl-9"
                />
                {barcodeScanError && (
                  <p className="text-sm text-red-500">{barcodeScanError}</p>
                )}
              </div>
            )}
            <div className={`relative flex-1 max-w-xs ${isInspectionUser ? "sm:ml-auto" : ""}`}>
              <Search
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isInspectionUser ? "right-3" : "left-3"}`}
              />
              <Input
                type="text"
                placeholder="Work order number"
                value={woNumberSearch}
                onChange={(e) => setWoNumberSearch(e.target.value)}
                className={isInspectionUser ? "pr-9 text-right" : "pl-9"}
              />
            </div>
          </div>
          <DataTable
            columns={getWorkOrderColumns({
              ...(isInspectionUser ? {} : { onEdit: handleEditWorkOrderOpen, onDelete: handleDeleteWorkOrder }),
            })}
            data={workOrders.filter((wo) => {
              if (!woNumberSearch.trim()) return true
              const woNum = (wo.woNumber ?? "").toString()
              return woNum.toLowerCase().includes(woNumberSearch.trim().toLowerCase())
            })}
            onRowClick={(workOrder) => {
              navigate(`/manufacturing/work-order/${workOrder.id}`)
            }}
          />
        </div>
      )}

      {workOrders.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No work orders found. Create your first work order to get started.
        </p>
      </div>
      )}

      {inspectionAddJobCardOpen && inspectionJobCardPayload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add Inspection Job Card</CardTitle>
                <CardDescription>
                  Scanned barcode: {inspectionJobCardPayload.barcode}. Select operator to create job card and load this roll.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInspectionAddJobCardOpen(false)
                  setInspectionJobCardPayload(null)
                  setInspectionJobCardError(null)
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Job card number</span>
                  <p className="font-medium">
                    {inspectionJobCardPayload.jobCardNumber || INSPECTION_JOB_CARD_NUMBER_PLACEHOLDER}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Work order</span>
                  <p className="font-medium">{inspectionJobCardPayload.woNumber ?? `WO ${inspectionJobCardPayload.workOrderId}`}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Operation</span>
                  <p className="font-medium">{inspectionJobCardPayload.operation}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Shift</span>
                  <p className="font-medium">{inspectionJobCardPayload.shift}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection-operator">Operator name *</Label>
                <Select
                  value={inspectionJobCardPayload.operatorName || undefined}
                  onValueChange={(value) =>
                    setInspectionJobCardPayload((prev) =>
                      prev ? { ...prev, operatorName: value } : null
                    )
                  }
                >
                  <SelectTrigger id="inspection-operator" className="w-full">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionJobCardPayload.inspectionOperators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inspectionJobCardError && (
                <p className="text-sm text-red-500">{inspectionJobCardError}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleInspectionJobCardSubmit}
                disabled={inspectionJobCardSubmitting}
              >
                {inspectionJobCardSubmitting ? "Creating…" : "Create Job Card and Load Roll"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {isAddWorkOrderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Work Order</CardTitle>
                <CardDescription>
                  Create a new work order with production details.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partyId">Party (Customer/Both) *</Label>
                    <CreatableCombobox
                      options={partyOptions}
                      value={formData.partyId || null}
                      onValueChange={(value) =>
                        handleInputChange("partyId", value ?? "")
                      }
                      placeholder="Select party"
                      searchPlaceholder="Search party..."
                      triggerRef={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      onInputKeyDown={(e) => handleEnterKey(e, 0)}
                    />
                    {formErrors.partyId && (
                      <p className="text-sm text-red-500">{formErrors.partyId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemId">Item (FG Variety) *</Label>
                    <CreatableCombobox
                      options={itemOptions}
                      value={formData.itemId || null}
                      onValueChange={(value) =>
                        handleInputChange("itemId", value ?? "")
                      }
                      placeholder="Select item"
                      searchPlaceholder="Search item..."
                      triggerRef={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      onInputKeyDown={(e) => handleEnterKey(e, 1)}
                    />
                    {formErrors.itemId && (
                      <p className="text-sm text-red-500">{formErrors.itemId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plannedQty">Planned Quantity (KG)</Label>
                    <Input
                      id="plannedQty"
                      type="number"
                      step="0.01"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[2] = el
                      }}
                      value={formData.plannedQty}
                      onChange={(e) => handleInputChange("plannedQty", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 2)}
                      placeholder="Enter planned quantity"
                      className={formErrors.plannedQty ? "border-red-500" : ""}
                    />
                    {formErrors.plannedQty && (
                      <p className="text-sm text-red-500">{formErrors.plannedQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        handleInputChange("priority", value)
                      }
                    >
                      <SelectTrigger
                        id="priority"
                        ref={(el) => {
                          addFieldRefs.current[3] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 3)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {fallbackPriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Job Card Section */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-sm font-semibold mb-4">Job Card Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="machineId">Machine <span className="text-red-500">*</span></Label>
                      <CreatableCombobox
                        options={machines}
                        value={formData.machineId || null}
                        onValueChange={(value) =>
                          handleInputChange("machineId", value ?? "")
                        }
                        placeholder="Select machine"
                        searchPlaceholder="Search machine..."
                        triggerRef={(el) => {
                          addFieldRefs.current[4] = el
                        }}
                        onInputKeyDown={(e) => handleEnterKey(e, 4)}
                      />
                      {formErrors.machineId && (
                        <p className="text-sm text-red-500">{formErrors.machineId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="operatorName">Operator Name <span className="text-red-500">*</span></Label>
                      <CreatableCombobox
                        options={operators.map(op => ({ value: op, label: op }))}
                        value={formData.operatorName || null}
                        onValueChange={(value) =>
                          handleInputChange("operatorName", value ?? "")
                        }
                        placeholder="Enter or select operator"
                        searchPlaceholder="Search operator..."
                        triggerRef={(el) => {
                          addFieldRefs.current[5] = el
                        }}
                        onInputKeyDown={(e) => handleEnterKey(e, 5)}
                      />
                      {formErrors.operatorName && (
                        <p className="text-sm text-red-500">{formErrors.operatorName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shift">Shift <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.shift}
                        onValueChange={(value) =>
                          handleInputChange("shift", value)
                        }
                      >
                        <SelectTrigger
                          id="shift"
                          ref={(el) => {
                            addFieldRefs.current[6] = el
                          }}
                          onKeyDown={(e) => handleEnterKey(e, 6)}
                          className="w-full"
                          icon={ArrowRight}
                        >
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {fallbackShifts.map((shift) => (
                            <SelectItem key={shift} value={shift}>
                              {shift}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.shift && (
                        <p className="text-sm text-red-500">{formErrors.shift}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Work Order
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditWorkOrderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Work Order</CardTitle>
                <CardDescription>
                  Update the work order details.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseEditModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleEditSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-partyId">Party (Customer/Both) *</Label>
                    <CreatableCombobox
                      options={partyOptions}
                      value={editFormData.partyId || null}
                      onValueChange={(value) =>
                        handleEditInputChange("partyId", value ?? "")
                      }
                      placeholder="Select party"
                      searchPlaceholder="Search party..."
                    />
                    {editErrors.partyId && (
                      <p className="text-sm text-red-500">{editErrors.partyId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-itemId">Item (FG Variety) *</Label>
                    <CreatableCombobox
                      options={itemOptions}
                      value={editFormData.itemId || null}
                      onValueChange={(value) =>
                        handleEditInputChange("itemId", value ?? "")
                      }
                      placeholder="Select item"
                      searchPlaceholder="Search item..."
                    />
                    {editErrors.itemId && (
                      <p className="text-sm text-red-500">{editErrors.itemId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plannedQty">Planned Quantity (KG)</Label>
                    <Input
                      id="edit-plannedQty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.plannedQty}
                      onChange={(e) => handleEditInputChange("plannedQty", e.target.value)}
                      placeholder="Enter planned quantity"
                      className={editErrors.plannedQty ? "border-red-500" : ""}
                    />
                    {editErrors.plannedQty && (
                      <p className="text-sm text-red-500">{editErrors.plannedQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editFormData.priority}
                      onValueChange={(value) =>
                        handleEditInputChange("priority", value)
                      }
                    >
                      <SelectTrigger id="edit-priority" className="w-full" icon={ArrowRight}>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {fallbackPriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
      </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
