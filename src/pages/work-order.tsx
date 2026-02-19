import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getWorkOrderColumns, type WorkOrderMaster } from "@/components/columns/work-order-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllParties } from "@/lib/party-api"
import { getItems } from "@/lib/item-api"
import { getAllMachines } from "@/lib/machine-api"
import { getAllOperators } from "@/lib/operator-api"
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
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof WorkOrderForm, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
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
      const data = await getAllParties()
      // Filter parties to only show customer or both types
      const filteredParties = data.filter(p => p.partyType === "customer" || p.partyType === "both")
      setPartyOptions(filteredParties.map(p => ({
        value: p.id.toString(),
        label: `${p.partyCode} - ${p.partyName}`,
      })))
    } catch (error) {
      console.error("Failed to load parties:", error)
    }
  }

  const fetchItems = async () => {
    try {
      const data = await getItems()
      // Filter items to only show those with item group "fg variety"
      const filteredItems = data.filter(item => item.itemGroup === "fg variety")
      setItemOptions(filteredItems.map(i => ({
        value: i.id.toString(),
        label: `${i.itemCode} - ${i.itemName}`,
      })))
    } catch (error) {
      console.error("Failed to load items:", error)
    }
  }

  const fetchMachines = async () => {
    try {
      const data = await getAllMachines()
      setMachines(data.map(m => ({
        value: m.id.toString(),
        label: `${m.machineCode} - ${m.machineName}`,
      })))
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
    fetchItems()
    fetchMachines()
    fetchOperators()
    fetchWorkOrders()
  }, [])

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
            <Button onClick={handleAddWorkOrder} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Work Order</span>
            </Button>
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
          <DataTable
            columns={getWorkOrderColumns({
              onEdit: handleEditWorkOrderOpen,
              onDelete: handleDeleteWorkOrder,
            })}
            data={workOrders}
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
