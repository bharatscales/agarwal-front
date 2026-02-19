import { useEffect, useRef, useState } from "react"
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getOperatorMasterColumns, type OperatorMaster } from "@/components/columns/operator-master-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllMachines } from "@/lib/machine-api"
import { createOperator, deleteOperator, getAllOperators, updateOperator } from "@/lib/operator-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OperatorForm = {
  operatorName: string
  machineId: string
}

type MachineOption = {
  id: number
  machineCode: string
  machineName: string
}

export default function Operator() {
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false)
  const [isEditOperatorOpen, setIsEditOperatorOpen] = useState(false)
  const [editOperatorId, setEditOperatorId] = useState<number | null>(null)
  const [machines, setMachines] = useState<MachineOption[]>([])
  const [formData, setFormData] = useState<OperatorForm>({
    operatorName: "",
    machineId: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OperatorForm, string>>>({})
  const [operators, setOperators] = useState<OperatorMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<OperatorForm>({
    operatorName: "",
    machineId: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof OperatorForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchOperators()
  }

  const handleAddOperator = () => {
    setIsAddOperatorOpen(true)
  }

  const handleEditOperatorOpen = (operator: OperatorMaster) => {
    setEditOperatorId(operator.id)
    setEditFormData({
      operatorName: operator.operatorName,
      machineId: operator.machineId?.toString() || "",
    })
    setEditErrors({})
    setIsEditOperatorOpen(true)
  }

  const handleInputChange = (field: keyof OperatorForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof OperatorForm, value: string) => {
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
    const errors: Partial<Record<keyof OperatorForm, string>> = {}

    if (!formData.operatorName.trim()) {
      errors.operatorName = "Operator name is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof OperatorForm, string>> = {}

    if (!editFormData.operatorName.trim()) {
      errors.operatorName = "Operator name is required"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createOperator({
      operatorName: formData.operatorName.trim(),
      machineId: formData.machineId ? parseInt(formData.machineId) : null,
    })
      .then((newOperator) => {
        setOperators(prev => [newOperator, ...prev])
        setFormData({
          operatorName: "",
          machineId: "",
        })
        setFormErrors({})
        setIsAddOperatorOpen(false)
      })
      .catch((err) => {
        console.error("Error creating operator:", err)
        setFormErrors({ operatorName: "Failed to create operator. Please try again." })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editOperatorId || !validateEditForm()) return

    updateOperator(editOperatorId, {
      operatorName: editFormData.operatorName.trim(),
      machineId: editFormData.machineId ? parseInt(editFormData.machineId) : null,
    })
      .then((updatedOperator) => {
        setOperators(prev =>
          prev.map(operator => (operator.id === updatedOperator.id ? updatedOperator : operator))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating operator:", err)
        setEditErrors({ operatorName: "Failed to update operator. Please try again." })
      })
  }

  const handleDeleteOperator = (operator: OperatorMaster) => {
    if (!window.confirm(`Delete operator "${operator.operatorName}"? This cannot be undone.`)) {
      return
    }
    deleteOperator(operator.id)
      .then(() => {
        setOperators(prev => prev.filter(row => row.id !== operator.id))
      })
      .catch((err) => {
        console.error("Error deleting operator:", err)
        setError("Failed to delete operator. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddOperatorOpen(false)
    setFormData({
      operatorName: "",
      machineId: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditOperatorOpen(false)
    setEditOperatorId(null)
    setEditFormData({
      operatorName: "",
      machineId: "",
    })
    setEditErrors({})
  }

  useEffect(() => {
    if (isAddOperatorOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddOperatorOpen])

  const fetchMachines = async () => {
    try {
      const data = await getAllMachines()
      setMachines(data.map(m => ({
        id: m.id,
        machineCode: m.machineCode,
        machineName: m.machineName,
      })))
    } catch (error) {
      console.error("Failed to load machines:", error)
    }
  }

  const fetchOperators = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllOperators()
      setOperators(data)
    } catch (err: any) {
      console.error("Error fetching operators:", err)
      setError("Failed to fetch operators. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
    fetchOperators()
  }, [])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Operator</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage operator master data.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddOperator} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Operator</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading operators...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Operators
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
            columns={getOperatorMasterColumns({
              onEdit: handleEditOperatorOpen,
              onDelete: handleDeleteOperator,
            })}
            data={operators}
          />
        </div>
      )}

      {operators.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No operators found. Create your first operator to get started.
          </p>
        </div>
      )}

      {isAddOperatorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Operator</CardTitle>
                <CardDescription>
                  Create a new operator with basic details.
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
                    <Label htmlFor="operatorName">Operator Name *</Label>
                    <Input
                      id="operatorName"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.operatorName}
                      onChange={(e) => handleInputChange("operatorName", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter operator name"
                      className={formErrors.operatorName ? "border-red-500" : ""}
                    />
                    {formErrors.operatorName && (
                      <p className="text-sm text-red-500">{formErrors.operatorName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="machineId">Machine</Label>
                    <Select
                      value={formData.machineId || undefined}
                      onValueChange={(value) => {
                        if (value === "__clear__") {
                          handleInputChange("machineId", "")
                        } else {
                          handleInputChange("machineId", value)
                        }
                      }}
                    >
                      <SelectTrigger
                        id="machineId"
                        ref={(el) => {
                          addFieldRefs.current[1] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 1)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select machine (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.machineId && (
                          <SelectItem value="__clear__">Clear selection</SelectItem>
                        )}
                        {machines.filter(m => m && m.id).map((machine) => (
                          <SelectItem key={machine.id} value={String(machine.id)}>
                            {machine.machineCode || ""} - {machine.machineName || ""}
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
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Operator
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditOperatorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Operator</CardTitle>
                <CardDescription>
                  Update the operator details.
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-operatorName">Operator Name *</Label>
                    <Input
                      id="edit-operatorName"
                      value={editFormData.operatorName}
                      onChange={(e) => handleEditInputChange("operatorName", e.target.value)}
                      placeholder="Enter operator name"
                      className={editErrors.operatorName ? "border-red-500" : ""}
                    />
                    {editErrors.operatorName && (
                      <p className="text-sm text-red-500">{editErrors.operatorName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-machineId">Machine</Label>
                    <Select
                      value={editFormData.machineId || undefined}
                      onValueChange={(value) => {
                        if (value === "__clear__") {
                          handleEditInputChange("machineId", "")
                        } else {
                          handleEditInputChange("machineId", value)
                        }
                      }}
                    >
                      <SelectTrigger id="edit-machineId" className="w-full" icon={ArrowRight}>
                        <SelectValue placeholder="Select machine (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {editFormData.machineId && (
                          <SelectItem value="__clear__">Clear selection</SelectItem>
                        )}
                        {machines.filter(m => m && m.id).map((machine) => (
                          <SelectItem key={machine.id} value={String(machine.id)}>
                            {machine.machineCode || ""} - {machine.machineName || ""}
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

