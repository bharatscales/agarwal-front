import { useEffect, useRef, useState } from "react"
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getMachineMasterColumns, type MachineMaster } from "@/components/columns/machine-master-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"
import { createMachine, deleteMachine, getAllMachines, updateMachine } from "@/lib/machine-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type MachineForm = {
  machineCode: string
  machineName: string
  operation: string
  status: string
}

export default function Machine() {
  const fallbackOperations = ["Printing", "Inspection", "Sliter", "ECL", "Lamination"]
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false)
  const [isEditMachineOpen, setIsEditMachineOpen] = useState(false)
  const [editMachineId, setEditMachineId] = useState<number | null>(null)
  const [operations, setOperations] = useState<string[]>(fallbackOperations)
  const [formData, setFormData] = useState<MachineForm>({
    machineCode: "",
    machineName: "",
    operation: "",
    status: "active",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MachineForm, string>>>({})
  const [machines, setMachines] = useState<MachineMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<MachineForm>({
    machineCode: "",
    machineName: "",
    operation: "",
    status: "active",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof MachineForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchMachines()
  }

  const handleAddMachine = () => {
    setIsAddMachineOpen(true)
  }

  const handleEditMachineOpen = (machine: MachineMaster) => {
    setEditMachineId(machine.id)
    setEditFormData({
      machineCode: machine.machineCode,
      machineName: machine.machineName,
      operation: machine.operation,
      status: machine.status,
    })
    setEditErrors({})
    setIsEditMachineOpen(true)
  }

  const handleInputChange = (field: keyof MachineForm, value: string) => {
    setFormData(prev => {
      if (field === "machineCode") {
        const shouldSyncName =
          !prev.machineName.trim() || prev.machineName === prev.machineCode
        return {
          ...prev,
          machineCode: value,
          machineName: shouldSyncName ? value : prev.machineName,
        }
      }
      return { ...prev, [field]: value }
    })
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof MachineForm, value: string) => {
    setEditFormData(prev => {
      if (field === "machineCode") {
        const shouldSyncName =
          !prev.machineName.trim() || prev.machineName === prev.machineCode
        return {
          ...prev,
          machineCode: value,
          machineName: shouldSyncName ? value : prev.machineName,
        }
      }
      return { ...prev, [field]: value }
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
    const errors: Partial<Record<keyof MachineForm, string>> = {}

    if (!formData.machineCode.trim()) {
      errors.machineCode = "Machine code is required"
    }
    if (!formData.machineName.trim()) {
      errors.machineName = "Machine name is required"
    }
    if (!formData.operation.trim()) {
      errors.operation = "Operation is required"
    }
    if (machines.some(machine => machine.machineCode === formData.machineCode.trim())) {
      errors.machineCode = "Machine code already exists"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof MachineForm, string>> = {}

    if (!editFormData.machineCode.trim()) {
      errors.machineCode = "Machine code is required"
    }
    if (!editFormData.machineName.trim()) {
      errors.machineName = "Machine name is required"
    }
    if (!editFormData.operation.trim()) {
      errors.operation = "Operation is required"
    }
    if (
      machines.some(
        machine =>
          machine.machineCode === editFormData.machineCode.trim() &&
          machine.id !== editMachineId
      )
    ) {
      errors.machineCode = "Machine code already exists"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createMachine({
      machineCode: formData.machineCode.trim(),
      machineName: formData.machineName.trim(),
      operation: formData.operation.trim(),
      status: formData.status,
    })
      .then((newMachine) => {
        setMachines(prev => [newMachine, ...prev])
        setFormData({
          machineCode: "",
          machineName: "",
          operation: "",
          status: "active",
        })
        setFormErrors({})
        setIsAddMachineOpen(false)
      })
      .catch((err) => {
        console.error("Error creating machine:", err)
        setFormErrors({ machineCode: "Failed to create machine. Please try again." })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMachineId || !validateEditForm()) return

    updateMachine(editMachineId, {
      machineCode: editFormData.machineCode.trim(),
      machineName: editFormData.machineName.trim(),
      operation: editFormData.operation.trim(),
      status: editFormData.status,
    })
      .then((updatedMachine) => {
        setMachines(prev =>
          prev.map(machine => (machine.id === updatedMachine.id ? updatedMachine : machine))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating machine:", err)
        setEditErrors({ machineCode: "Failed to update machine. Please try again." })
      })
  }

  const handleDeleteMachine = (machine: MachineMaster) => {
    if (!window.confirm(`Delete machine "${machine.machineName}"? This cannot be undone.`)) {
      return
    }
    deleteMachine(machine.id)
      .then(() => {
        setMachines(prev => prev.filter(row => row.id !== machine.id))
      })
      .catch((err) => {
        console.error("Error deleting machine:", err)
        setError("Failed to delete machine. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddMachineOpen(false)
    setFormData({
      machineCode: "",
      machineName: "",
      operation: "",
      status: "active",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditMachineOpen(false)
    setEditMachineId(null)
    setEditFormData({
      machineCode: "",
      machineName: "",
      operation: "",
      status: "active",
    })
    setEditErrors({})
  }

  useEffect(() => {
    if (isAddMachineOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddMachineOpen])

  useEffect(() => {
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

    fetchOperations()
  }, [])

  const fetchMachines = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllMachines()
      setMachines(data)
    } catch (err: any) {
      console.error("Error fetching machines:", err)
      setError("Failed to fetch machines. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Machine</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage machine master data.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddMachine} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Machine</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading machines...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Machines
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
            columns={getMachineMasterColumns({
              onEdit: handleEditMachineOpen,
              onDelete: handleDeleteMachine,
            })}
            data={machines}
          />
        </div>
      )}

      {machines.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No machines found. Create your first machine to get started.
          </p>
        </div>
      )}

      {isAddMachineOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Machine</CardTitle>
                <CardDescription>
                  Create a new machine with basic details.
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
                    <Label htmlFor="machineCode">Machine Code *</Label>
                    <Input
                      id="machineCode"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.machineCode}
                      onChange={(e) => handleInputChange("machineCode", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter machine code"
                      className={formErrors.machineCode ? "border-red-500" : ""}
                    />
                    {formErrors.machineCode && (
                      <p className="text-sm text-red-500">{formErrors.machineCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="machineName">Machine Name *</Label>
                    <Input
                      id="machineName"
                      ref={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      value={formData.machineName}
                      onChange={(e) => handleInputChange("machineName", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 1)}
                      placeholder="Enter machine name"
                      className={formErrors.machineName ? "border-red-500" : ""}
                    />
                    {formErrors.machineName && (
                      <p className="text-sm text-red-500">{formErrors.machineName}</p>
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
                        {operations.map((operation) => (
                          <SelectItem key={operation} value={operation}>
                            {operation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.operation && (
                      <p className="text-sm text-red-500">{formErrors.operation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger
                        id="status"
                        ref={(el) => {
                          addFieldRefs.current[3] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 3)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
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
                  Save Machine
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditMachineOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Machine</CardTitle>
                <CardDescription>
                  Update the machine details.
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
                    <Label htmlFor="edit-machineCode">Machine Code *</Label>
                    <Input
                      id="edit-machineCode"
                      value={editFormData.machineCode}
                      onChange={(e) => handleEditInputChange("machineCode", e.target.value)}
                      placeholder="Enter machine code"
                      className={editErrors.machineCode ? "border-red-500" : ""}
                    />
                    {editErrors.machineCode && (
                      <p className="text-sm text-red-500">{editErrors.machineCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-machineName">Machine Name *</Label>
                    <Input
                      id="edit-machineName"
                      value={editFormData.machineName}
                      onChange={(e) => handleEditInputChange("machineName", e.target.value)}
                      placeholder="Enter machine name"
                      className={editErrors.machineName ? "border-red-500" : ""}
                    />
                    {editErrors.machineName && (
                      <p className="text-sm text-red-500">{editErrors.machineName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        {operations.map((operation) => (
                          <SelectItem key={operation} value={operation}>
                            {operation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editErrors.operation && (
                      <p className="text-sm text-red-500">{editErrors.operation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) =>
                        handleEditInputChange("status", value)
                      }
                    >
                      <SelectTrigger id="edit-status" className="w-full" icon={ArrowRight}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
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

