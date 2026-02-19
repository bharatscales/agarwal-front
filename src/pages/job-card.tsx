import { useEffect, useRef, useState } from "react"
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getJobCardColumns, type JobCardMaster } from "@/components/columns/job-card-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllWorkOrders } from "@/lib/work-order-api"
import { getAllMachines } from "@/lib/machine-api"
import { getAllOperators } from "@/lib/operator-api"
import { createJobCard, deleteJobCard, getAllJobCards, updateJobCard } from "@/lib/job-card-api"
import api from "@/lib/axios"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"

type JobCardForm = {
  jobCardNumber: string
  workOrderId: string
  operation: string
  machineId: string
  operatorName: string
  shift: string
  inputQty: string
  outputQty: string
  wastageQty: string
  inputRollCount: string
  outputRollCount: string
  startedAt: string
  finishedAt: string
}

export default function JobCard() {
  const fallbackOperations = ["Printing", "Inspection", "Sliter", "ECL", "Lamination"]
  const fallbackShifts = ["A", "B"]
  const [isAddJobCardOpen, setIsAddJobCardOpen] = useState(false)
  const [isEditJobCardOpen, setIsEditJobCardOpen] = useState(false)
  const [editJobCardId, setEditJobCardId] = useState<number | null>(null)
  const [workOrderOptions, setWorkOrderOptions] = useState<CreatableOption[]>([])
  const [machineOptions, setMachineOptions] = useState<CreatableOption[]>([])
  const [operators, setOperators] = useState<string[]>([])
  const [operations, setOperations] = useState<string[]>(fallbackOperations)
  const [formData, setFormData] = useState<JobCardForm>({
    jobCardNumber: "",
    workOrderId: "",
    operation: "",
    machineId: "",
    operatorName: "",
    shift: "A",
    inputQty: "",
    outputQty: "",
    wastageQty: "",
    inputRollCount: "",
    outputRollCount: "",
    startedAt: "",
    finishedAt: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobCardForm, string>>>({})
  const [jobCards, setJobCards] = useState<JobCardMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<JobCardForm>({
    jobCardNumber: "",
    workOrderId: "",
    operation: "",
    machineId: "",
    operatorName: "",
    shift: "A",
    inputQty: "",
    outputQty: "",
    wastageQty: "",
    inputRollCount: "",
    outputRollCount: "",
    startedAt: "",
    finishedAt: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof JobCardForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchJobCards()
  }

  const handleAddJobCard = () => {
    setIsAddJobCardOpen(true)
  }

  const handleEditJobCardOpen = (jobCard: JobCardMaster) => {
    setEditJobCardId(jobCard.id)
    setEditFormData({
      jobCardNumber: jobCard.jobCardNumber,
      workOrderId: jobCard.workOrderId.toString(),
      operation: jobCard.operation,
      machineId: jobCard.machineId.toString(),
      operatorName: jobCard.operatorName,
      shift: jobCard.shift,
      inputQty: jobCard.inputQty?.toString() || "",
      outputQty: jobCard.outputQty?.toString() || "",
      wastageQty: jobCard.wastageQty?.toString() || "",
      inputRollCount: jobCard.inputRollCount?.toString() || "",
      outputRollCount: jobCard.outputRollCount?.toString() || "",
      startedAt: jobCard.startedAt ? new Date(jobCard.startedAt).toISOString().slice(0, 16) : "",
      finishedAt: jobCard.finishedAt ? new Date(jobCard.finishedAt).toISOString().slice(0, 16) : "",
    })
    setEditErrors({})
    setIsEditJobCardOpen(true)
  }

  const handleInputChange = (field: keyof JobCardForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof JobCardForm, value: string) => {
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
    const errors: Partial<Record<keyof JobCardForm, string>> = {}

    if (!formData.jobCardNumber.trim()) {
      errors.jobCardNumber = "Job card number is required"
    }
    if (!formData.workOrderId.trim()) {
      errors.workOrderId = "Work order is required"
    }
    if (!formData.operation.trim()) {
      errors.operation = "Operation is required"
    }
    if (!formData.machineId.trim()) {
      errors.machineId = "Machine is required"
    }
    if (!formData.operatorName.trim()) {
      errors.operatorName = "Operator name is required"
    }
    if (!formData.shift.trim()) {
      errors.shift = "Shift is required"
    }
    if (formData.inputQty && parseFloat(formData.inputQty) < 0) {
      errors.inputQty = "Input quantity must be a positive number"
    }
    if (formData.outputQty && parseFloat(formData.outputQty) < 0) {
      errors.outputQty = "Output quantity must be a positive number"
    }
    if (formData.wastageQty && parseFloat(formData.wastageQty) < 0) {
      errors.wastageQty = "Wastage quantity must be a positive number"
    }
    if (formData.inputRollCount && parseInt(formData.inputRollCount) < 0) {
      errors.inputRollCount = "Input roll count must be a positive number"
    }
    if (formData.outputRollCount && parseInt(formData.outputRollCount) < 0) {
      errors.outputRollCount = "Output roll count must be a positive number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof JobCardForm, string>> = {}

    if (!editFormData.jobCardNumber.trim()) {
      errors.jobCardNumber = "Job card number is required"
    }
    if (!editFormData.workOrderId.trim()) {
      errors.workOrderId = "Work order is required"
    }
    if (!editFormData.operation.trim()) {
      errors.operation = "Operation is required"
    }
    if (!editFormData.machineId.trim()) {
      errors.machineId = "Machine is required"
    }
    if (!editFormData.operatorName.trim()) {
      errors.operatorName = "Operator name is required"
    }
    if (!editFormData.shift.trim()) {
      errors.shift = "Shift is required"
    }
    if (editFormData.inputQty && parseFloat(editFormData.inputQty) < 0) {
      errors.inputQty = "Input quantity must be a positive number"
    }
    if (editFormData.outputQty && parseFloat(editFormData.outputQty) < 0) {
      errors.outputQty = "Output quantity must be a positive number"
    }
    if (editFormData.wastageQty && parseFloat(editFormData.wastageQty) < 0) {
      errors.wastageQty = "Wastage quantity must be a positive number"
    }
    if (editFormData.inputRollCount && parseInt(editFormData.inputRollCount) < 0) {
      errors.inputRollCount = "Input roll count must be a positive number"
    }
    if (editFormData.outputRollCount && parseInt(editFormData.outputRollCount) < 0) {
      errors.outputRollCount = "Output roll count must be a positive number"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createJobCard({
      jobCardNumber: formData.jobCardNumber,
      workOrderId: parseInt(formData.workOrderId),
      operation: formData.operation,
      machineId: parseInt(formData.machineId),
      operatorName: formData.operatorName,
      shift: formData.shift,
      inputQty: formData.inputQty ? parseFloat(formData.inputQty) : null,
      outputQty: formData.outputQty ? parseFloat(formData.outputQty) : null,
      wastageQty: formData.wastageQty ? parseFloat(formData.wastageQty) : null,
      inputRollCount: formData.inputRollCount ? parseInt(formData.inputRollCount) : null,
      outputRollCount: formData.outputRollCount ? parseInt(formData.outputRollCount) : null,
      startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : null,
      finishedAt: formData.finishedAt ? new Date(formData.finishedAt).toISOString() : null,
    })
      .then((newJobCard) => {
        setJobCards(prev => [newJobCard, ...prev])
        handleCloseModal()
      })
      .catch((err) => {
        console.error("Error creating job card:", err)
        const errorMsg = err.response?.data?.detail || "Failed to create job card. Please try again."
        setFormErrors({ jobCardNumber: errorMsg })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editJobCardId || !validateEditForm()) return

    updateJobCard(editJobCardId, {
      jobCardNumber: editFormData.jobCardNumber,
      workOrderId: parseInt(editFormData.workOrderId),
      operation: editFormData.operation,
      machineId: parseInt(editFormData.machineId),
      operatorName: editFormData.operatorName,
      shift: editFormData.shift,
      inputQty: editFormData.inputQty ? parseFloat(editFormData.inputQty) : null,
      outputQty: editFormData.outputQty ? parseFloat(editFormData.outputQty) : null,
      wastageQty: editFormData.wastageQty ? parseFloat(editFormData.wastageQty) : null,
      inputRollCount: editFormData.inputRollCount ? parseInt(editFormData.inputRollCount) : null,
      outputRollCount: editFormData.outputRollCount ? parseInt(editFormData.outputRollCount) : null,
      startedAt: editFormData.startedAt ? new Date(editFormData.startedAt).toISOString() : null,
      finishedAt: editFormData.finishedAt ? new Date(editFormData.finishedAt).toISOString() : null,
    })
      .then((updatedJobCard) => {
        setJobCards(prev =>
          prev.map(jc => (jc.id === updatedJobCard.id ? updatedJobCard : jc))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating job card:", err)
        const errorMsg = err.response?.data?.detail || "Failed to update job card. Please try again."
        setEditErrors({ jobCardNumber: errorMsg })
      })
  }

  const handleDeleteJobCard = (jobCard: JobCardMaster) => {
    if (!window.confirm(`Delete job card "${jobCard.jobCardNumber}"? This cannot be undone.`)) {
      return
    }
    deleteJobCard(jobCard.id)
      .then(() => {
        setJobCards(prev => prev.filter(row => row.id !== jobCard.id))
      })
      .catch((err) => {
        console.error("Error deleting job card:", err)
        setError("Failed to delete job card. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddJobCardOpen(false)
    setFormData({
      jobCardNumber: "",
      workOrderId: "",
      operation: "",
      machineId: "",
      operatorName: "",
      shift: "A",
      inputQty: "",
      outputQty: "",
      wastageQty: "",
      inputRollCount: "",
      outputRollCount: "",
      startedAt: "",
      finishedAt: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditJobCardOpen(false)
    setEditJobCardId(null)
    setEditFormData({
      jobCardNumber: "",
      workOrderId: "",
      operation: "",
      machineId: "",
      operatorName: "",
      shift: "A",
      inputQty: "",
      outputQty: "",
      wastageQty: "",
      inputRollCount: "",
      outputRollCount: "",
      startedAt: "",
      finishedAt: "",
    })
    setEditErrors({})
  }

  useEffect(() => {
    if (isAddJobCardOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddJobCardOpen])

  const fetchWorkOrders = async () => {
    try {
      const data = await getAllWorkOrders()
      setWorkOrderOptions(data.map(wo => ({
        value: wo.id.toString(),
        label: `${wo.woNumber || `WO-${wo.id}`} - ${wo.partyName || ""} - ${wo.itemName || ""}`,
      })))
    } catch (error) {
      console.error("Failed to load work orders:", error)
    }
  }

  const fetchMachines = async () => {
    try {
      const data = await getAllMachines()
      setMachineOptions(data.map(m => ({
        value: m.id.toString(),
        label: `${m.machineCode} - ${m.machineName} (${m.operation})`,
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

  const fetchOperations = async () => {
    try {
      const response = await api.get<string[]>("/meta/machine-operations")
      if (response.data.length > 0) {
        setOperations(response.data)
      }
    } catch (error) {
      console.error("Failed to load machine operations:", error)
      setOperations(fallbackOperations)
    }
  }

  const fetchJobCards = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllJobCards()
      setJobCards(data)
    } catch (err: any) {
      console.error("Error fetching job cards:", err)
      setError("Failed to fetch job cards. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkOrders()
    fetchMachines()
    fetchOperators()
    fetchOperations()
    fetchJobCards()
  }, [])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Job Card</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage job cards for production operations.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddJobCard} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Job Card</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading job cards...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Job Cards
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
            columns={getJobCardColumns({
              onEdit: handleEditJobCardOpen,
              onDelete: handleDeleteJobCard,
            })}
            data={jobCards}
          />
        </div>
      )}

      {jobCards.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No job cards found. Create your first job card to get started.
          </p>
        </div>
      )}

      {isAddJobCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Job Card</CardTitle>
                <CardDescription>
                  Create a new job card with production details.
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
                    <Label htmlFor="jobCardNumber">Job Card Number *</Label>
                    <Input
                      id="jobCardNumber"
                      type="text"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.jobCardNumber}
                      onChange={(e) => handleInputChange("jobCardNumber", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter job card number"
                      className={formErrors.jobCardNumber ? "border-red-500" : ""}
                    />
                    {formErrors.jobCardNumber && (
                      <p className="text-sm text-red-500">{formErrors.jobCardNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workOrderId">Work Order *</Label>
                    <CreatableCombobox
                      options={workOrderOptions}
                      value={formData.workOrderId || null}
                      onValueChange={(value) =>
                        handleInputChange("workOrderId", value ?? "")
                      }
                      placeholder="Select work order"
                      searchPlaceholder="Search work order..."
                      triggerRef={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      onInputKeyDown={(e) => handleEnterKey(e, 1)}
                    />
                    {formErrors.workOrderId && (
                      <p className="text-sm text-red-500">{formErrors.workOrderId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operation">Operation *</Label>
                    <Select
                      value={formData.operation}
                      onValueChange={(value) =>
                        handleInputChange("operation", value)
                      }
                    >
                      <SelectTrigger
                        id="operation"
                        ref={(el) => {
                          addFieldRefs.current[2] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 2)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {operations.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.operation && (
                      <p className="text-sm text-red-500">{formErrors.operation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="machineId">Machine *</Label>
                    <CreatableCombobox
                      options={machineOptions}
                      value={formData.machineId || null}
                      onValueChange={(value) =>
                        handleInputChange("machineId", value ?? "")
                      }
                      placeholder="Select machine"
                      searchPlaceholder="Search machine..."
                      triggerRef={(el) => {
                        addFieldRefs.current[3] = el
                      }}
                      onInputKeyDown={(e) => handleEnterKey(e, 3)}
                    />
                    {formErrors.machineId && (
                      <p className="text-sm text-red-500">{formErrors.machineId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operatorName">Operator Name *</Label>
                    <CreatableCombobox
                      options={operators.map(op => ({ value: op, label: op }))}
                      value={formData.operatorName || null}
                      onValueChange={(value) =>
                        handleInputChange("operatorName", value ?? "")
                      }
                      placeholder="Enter or select operator name"
                      searchPlaceholder="Search operator..."
                      triggerRef={(el) => {
                        addFieldRefs.current[4] = el
                      }}
                      onInputKeyDown={(e) => handleEnterKey(e, 4)}
                    />
                    {formErrors.operatorName && (
                      <p className="text-sm text-red-500">{formErrors.operatorName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift *</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(value) =>
                        handleInputChange("shift", value)
                      }
                    >
                      <SelectTrigger
                        id="shift"
                        ref={(el) => {
                          addFieldRefs.current[5] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 5)}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputQty">Input Qty (KG)</Label>
                    <Input
                      id="inputQty"
                      type="number"
                      step="0.01"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[6] = el
                      }}
                      value={formData.inputQty}
                      onChange={(e) => handleInputChange("inputQty", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 6)}
                      placeholder="Enter input quantity"
                      className={formErrors.inputQty ? "border-red-500" : ""}
                    />
                    {formErrors.inputQty && (
                      <p className="text-sm text-red-500">{formErrors.inputQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outputQty">Output Qty (KG)</Label>
                    <Input
                      id="outputQty"
                      type="number"
                      step="0.01"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[7] = el
                      }}
                      value={formData.outputQty}
                      onChange={(e) => handleInputChange("outputQty", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 7)}
                      placeholder="Enter output quantity"
                      className={formErrors.outputQty ? "border-red-500" : ""}
                    />
                    {formErrors.outputQty && (
                      <p className="text-sm text-red-500">{formErrors.outputQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wastageQty">Wastage Qty (KG)</Label>
                    <Input
                      id="wastageQty"
                      type="number"
                      step="0.01"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[8] = el
                      }}
                      value={formData.wastageQty}
                      onChange={(e) => handleInputChange("wastageQty", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 8)}
                      placeholder="Enter wastage quantity"
                      className={formErrors.wastageQty ? "border-red-500" : ""}
                    />
                    {formErrors.wastageQty && (
                      <p className="text-sm text-red-500">{formErrors.wastageQty}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputRollCount">Input Roll Count</Label>
                    <Input
                      id="inputRollCount"
                      type="number"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[9] = el
                      }}
                      value={formData.inputRollCount}
                      onChange={(e) => handleInputChange("inputRollCount", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 9)}
                      placeholder="Enter input roll count"
                      className={formErrors.inputRollCount ? "border-red-500" : ""}
                    />
                    {formErrors.inputRollCount && (
                      <p className="text-sm text-red-500">{formErrors.inputRollCount}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outputRollCount">Output Roll Count</Label>
                    <Input
                      id="outputRollCount"
                      type="number"
                      min="0"
                      ref={(el) => {
                        addFieldRefs.current[10] = el
                      }}
                      value={formData.outputRollCount}
                      onChange={(e) => handleInputChange("outputRollCount", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 10)}
                      placeholder="Enter output roll count"
                      className={formErrors.outputRollCount ? "border-red-500" : ""}
                    />
                    {formErrors.outputRollCount && (
                      <p className="text-sm text-red-500">{formErrors.outputRollCount}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startedAt">Started At</Label>
                    <Input
                      id="startedAt"
                      type="datetime-local"
                      ref={(el) => {
                        addFieldRefs.current[11] = el
                      }}
                      value={formData.startedAt}
                      onChange={(e) => handleInputChange("startedAt", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 11)}
                      className={formErrors.startedAt ? "border-red-500" : ""}
                    />
                    {formErrors.startedAt && (
                      <p className="text-sm text-red-500">{formErrors.startedAt}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="finishedAt">Finished At</Label>
                    <Input
                      id="finishedAt"
                      type="datetime-local"
                      ref={(el) => {
                        addFieldRefs.current[12] = el
                      }}
                      value={formData.finishedAt}
                      onChange={(e) => handleInputChange("finishedAt", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 12)}
                      className={formErrors.finishedAt ? "border-red-500" : ""}
                    />
                    {formErrors.finishedAt && (
                      <p className="text-sm text-red-500">{formErrors.finishedAt}</p>
                    )}
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
                  Save Job Card
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditJobCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Job Card</CardTitle>
                <CardDescription>
                  Update the job card details.
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
                    <Label htmlFor="edit-jobCardNumber">Job Card Number *</Label>
                    <Input
                      id="edit-jobCardNumber"
                      type="text"
                      value={editFormData.jobCardNumber}
                      onChange={(e) => handleEditInputChange("jobCardNumber", e.target.value)}
                      placeholder="Enter job card number"
                      className={editErrors.jobCardNumber ? "border-red-500" : ""}
                    />
                    {editErrors.jobCardNumber && (
                      <p className="text-sm text-red-500">{editErrors.jobCardNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-workOrderId">Work Order *</Label>
                    <CreatableCombobox
                      options={workOrderOptions}
                      value={editFormData.workOrderId || null}
                      onValueChange={(value) =>
                        handleEditInputChange("workOrderId", value ?? "")
                      }
                      placeholder="Select work order"
                      searchPlaceholder="Search work order..."
                    />
                    {editErrors.workOrderId && (
                      <p className="text-sm text-red-500">{editErrors.workOrderId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-operation">Operation *</Label>
                    <Select
                      value={editFormData.operation}
                      onValueChange={(value) =>
                        handleEditInputChange("operation", value)
                      }
                    >
                      <SelectTrigger id="edit-operation" className="w-full" icon={ArrowRight}>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {operations.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editErrors.operation && (
                      <p className="text-sm text-red-500">{editErrors.operation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-machineId">Machine *</Label>
                    <CreatableCombobox
                      options={machineOptions}
                      value={editFormData.machineId || null}
                      onValueChange={(value) =>
                        handleEditInputChange("machineId", value ?? "")
                      }
                      placeholder="Select machine"
                      searchPlaceholder="Search machine..."
                    />
                    {editErrors.machineId && (
                      <p className="text-sm text-red-500">{editErrors.machineId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-operatorName">Operator Name *</Label>
                    <CreatableCombobox
                      options={operators.map(op => ({ value: op, label: op }))}
                      value={editFormData.operatorName || null}
                      onValueChange={(value) =>
                        handleEditInputChange("operatorName", value ?? "")
                      }
                      placeholder="Enter or select operator name"
                      searchPlaceholder="Search operator..."
                    />
                    {editErrors.operatorName && (
                      <p className="text-sm text-red-500">{editErrors.operatorName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-shift">Shift *</Label>
                    <Select
                      value={editFormData.shift}
                      onValueChange={(value) =>
                        handleEditInputChange("shift", value)
                      }
                    >
                      <SelectTrigger id="edit-shift" className="w-full" icon={ArrowRight}>
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
                    {editErrors.shift && (
                      <p className="text-sm text-red-500">{editErrors.shift}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-inputQty">Input Qty (KG)</Label>
                    <Input
                      id="edit-inputQty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.inputQty}
                      onChange={(e) => handleEditInputChange("inputQty", e.target.value)}
                      placeholder="Enter input quantity"
                      className={editErrors.inputQty ? "border-red-500" : ""}
                    />
                    {editErrors.inputQty && (
                      <p className="text-sm text-red-500">{editErrors.inputQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-outputQty">Output Qty (KG)</Label>
                    <Input
                      id="edit-outputQty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.outputQty}
                      onChange={(e) => handleEditInputChange("outputQty", e.target.value)}
                      placeholder="Enter output quantity"
                      className={editErrors.outputQty ? "border-red-500" : ""}
                    />
                    {editErrors.outputQty && (
                      <p className="text-sm text-red-500">{editErrors.outputQty}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-wastageQty">Wastage Qty (KG)</Label>
                    <Input
                      id="edit-wastageQty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.wastageQty}
                      onChange={(e) => handleEditInputChange("wastageQty", e.target.value)}
                      placeholder="Enter wastage quantity"
                      className={editErrors.wastageQty ? "border-red-500" : ""}
                    />
                    {editErrors.wastageQty && (
                      <p className="text-sm text-red-500">{editErrors.wastageQty}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-inputRollCount">Input Roll Count</Label>
                    <Input
                      id="edit-inputRollCount"
                      type="number"
                      min="0"
                      value={editFormData.inputRollCount}
                      onChange={(e) => handleEditInputChange("inputRollCount", e.target.value)}
                      placeholder="Enter input roll count"
                      className={editErrors.inputRollCount ? "border-red-500" : ""}
                    />
                    {editErrors.inputRollCount && (
                      <p className="text-sm text-red-500">{editErrors.inputRollCount}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-outputRollCount">Output Roll Count</Label>
                    <Input
                      id="edit-outputRollCount"
                      type="number"
                      min="0"
                      value={editFormData.outputRollCount}
                      onChange={(e) => handleEditInputChange("outputRollCount", e.target.value)}
                      placeholder="Enter output roll count"
                      className={editErrors.outputRollCount ? "border-red-500" : ""}
                    />
                    {editErrors.outputRollCount && (
                      <p className="text-sm text-red-500">{editErrors.outputRollCount}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startedAt">Started At</Label>
                    <Input
                      id="edit-startedAt"
                      type="datetime-local"
                      value={editFormData.startedAt}
                      onChange={(e) => handleEditInputChange("startedAt", e.target.value)}
                      className={editErrors.startedAt ? "border-red-500" : ""}
                    />
                    {editErrors.startedAt && (
                      <p className="text-sm text-red-500">{editErrors.startedAt}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-finishedAt">Finished At</Label>
                    <Input
                      id="edit-finishedAt"
                      type="datetime-local"
                      value={editFormData.finishedAt}
                      onChange={(e) => handleEditInputChange("finishedAt", e.target.value)}
                      className={editErrors.finishedAt ? "border-red-500" : ""}
                    />
                    {editErrors.finishedAt && (
                      <p className="text-sm text-red-500">{editErrors.finishedAt}</p>
                    )}
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
                  Update Job Card
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
