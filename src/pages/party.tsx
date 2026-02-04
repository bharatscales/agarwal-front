import { useEffect, useRef, useState } from "react"
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getPartyMasterColumns, type PartyMaster } from "@/components/columns/party-master-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"
import { createParty, deleteParty, getAllParties, updateParty } from "@/lib/party-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PartyForm = {
  partyCode: string
  partyName: string
  partyType: string
}

export default function Party() {
  const fallbackPartyTypes = ["customer", "supplier", "both"]
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false)
  const [isEditPartyOpen, setIsEditPartyOpen] = useState(false)
  const [editPartyId, setEditPartyId] = useState<number | null>(null)
  const [partyTypes, setPartyTypes] = useState<string[]>(fallbackPartyTypes)
  const [formData, setFormData] = useState<PartyForm>({
    partyCode: "",
    partyName: "",
    partyType: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PartyForm, string>>>({})
  const [parties, setParties] = useState<PartyMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<PartyForm>({
    partyCode: "",
    partyName: "",
    partyType: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof PartyForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchParties()
  }

  const handleAddParty = () => {
    setIsAddPartyOpen(true)
  }

  const handleEditPartyOpen = (party: PartyMaster) => {
    setEditPartyId(party.id)
    setEditFormData({
      partyCode: party.partyCode,
      partyName: party.partyName,
      partyType: party.partyType,
    })
    setEditErrors({})
    setIsEditPartyOpen(true)
  }

  const handleInputChange = (field: keyof PartyForm, value: string) => {
    setFormData(prev => {
      if (field === "partyCode") {
        const shouldSyncName =
          !prev.partyName.trim() || prev.partyName === prev.partyCode
        return {
          ...prev,
          partyCode: value,
          partyName: shouldSyncName ? value : prev.partyName,
        }
      }
      return { ...prev, [field]: value }
    })
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof PartyForm, value: string) => {
    setEditFormData(prev => {
      if (field === "partyCode") {
        const shouldSyncName =
          !prev.partyName.trim() || prev.partyName === prev.partyCode
        return {
          ...prev,
          partyCode: value,
          partyName: shouldSyncName ? value : prev.partyName,
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
    const errors: Partial<Record<keyof PartyForm, string>> = {}

    if (!formData.partyCode.trim()) {
      errors.partyCode = "Party code is required"
    }
    if (!formData.partyName.trim()) {
      errors.partyName = "Party name is required"
    }
    if (!formData.partyType.trim()) {
      errors.partyType = "Party type is required"
    }
    if (parties.some(party => party.partyCode === formData.partyCode.trim())) {
      errors.partyCode = "Party code already exists"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof PartyForm, string>> = {}

    if (!editFormData.partyCode.trim()) {
      errors.partyCode = "Party code is required"
    }
    if (!editFormData.partyName.trim()) {
      errors.partyName = "Party name is required"
    }
    if (!editFormData.partyType.trim()) {
      errors.partyType = "Party type is required"
    }
    if (
      parties.some(
        party =>
          party.partyCode === editFormData.partyCode.trim() &&
          party.id !== editPartyId
      )
    ) {
      errors.partyCode = "Party code already exists"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createParty({
      partyCode: formData.partyCode.trim(),
      partyName: formData.partyName.trim(),
      partyType: formData.partyType.trim(),
    })
      .then((newParty) => {
        setParties(prev => [newParty, ...prev])
        setFormData({
          partyCode: "",
          partyName: "",
          partyType: "",
        })
        setFormErrors({})
        setIsAddPartyOpen(false)
      })
      .catch((err) => {
        console.error("Error creating party:", err)
        setFormErrors({ partyCode: "Failed to create party. Please try again." })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPartyId || !validateEditForm()) return

    updateParty(editPartyId, {
      partyCode: editFormData.partyCode.trim(),
      partyName: editFormData.partyName.trim(),
      partyType: editFormData.partyType.trim(),
    })
      .then((updatedParty) => {
        setParties(prev =>
          prev.map(party => (party.id === updatedParty.id ? updatedParty : party))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating party:", err)
        setEditErrors({ partyCode: "Failed to update party. Please try again." })
      })
  }

  const handleDeleteParty = (party: PartyMaster) => {
    if (!window.confirm(`Delete party "${party.partyName}"? This cannot be undone.`)) {
      return
    }
    deleteParty(party.id)
      .then(() => {
        setParties(prev => prev.filter(row => row.id !== party.id))
      })
      .catch((err) => {
        console.error("Error deleting party:", err)
        setError("Failed to delete party. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddPartyOpen(false)
    setFormData({
      partyCode: "",
      partyName: "",
      partyType: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditPartyOpen(false)
    setEditPartyId(null)
    setEditFormData({
      partyCode: "",
      partyName: "",
      partyType: "",
    })
    setEditErrors({})
  }

  useEffect(() => {
    if (isAddPartyOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddPartyOpen])

  useEffect(() => {
    const fetchPartyTypes = async () => {
      try {
        const response = await api.get<string[]>("/meta/party-types")
        if (response.data.length > 0) {
          setPartyTypes(response.data)
        }
      } catch (error) {
        console.error("Failed to load party types:", error)
        setPartyTypes(fallbackPartyTypes)
      }
    }

    fetchPartyTypes()
  }, [])

  const fetchParties = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllParties()
      setParties(data)
    } catch (err: any) {
      console.error("Error fetching parties:", err)
      setError("Failed to fetch parties. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParties()
  }, [])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Party</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage party master data.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddParty} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Party</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading parties...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Parties
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
            columns={getPartyMasterColumns({
              onEdit: handleEditPartyOpen,
              onDelete: handleDeleteParty,
            })}
            data={parties}
          />
        </div>
      )}

      {parties.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No parties found. Create your first party to get started.
          </p>
        </div>
      )}

      {isAddPartyOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Party</CardTitle>
                <CardDescription>
                  Create a new party with basic details.
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
                    <Label htmlFor="partyCode">Party Code *</Label>
                    <Input
                      id="partyCode"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.partyCode}
                      onChange={(e) => handleInputChange("partyCode", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter party code"
                      className={formErrors.partyCode ? "border-red-500" : ""}
                    />
                    {formErrors.partyCode && (
                      <p className="text-sm text-red-500">{formErrors.partyCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partyName">Party Name *</Label>
                    <Input
                      id="partyName"
                      ref={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      value={formData.partyName}
                      onChange={(e) => handleInputChange("partyName", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 1)}
                      placeholder="Enter party name"
                      className={formErrors.partyName ? "border-red-500" : ""}
                    />
                    {formErrors.partyName && (
                      <p className="text-sm text-red-500">{formErrors.partyName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partyType">Party Type *</Label>
                    <Select
                      value={formData.partyType}
                      onValueChange={(value) =>
                        handleInputChange("partyType", value)
                      }
                    >
                      <SelectTrigger
                        id="partyType"
                        ref={(el) => {
                          addFieldRefs.current[2] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 2)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                      <SelectContent>
                        {partyTypes.map((partyType) => (
                          <SelectItem key={partyType} value={partyType}>
                            {partyType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.partyType && (
                      <p className="text-sm text-red-500">{formErrors.partyType}</p>
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
                  Save Party
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditPartyOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Party</CardTitle>
                <CardDescription>
                  Update the party details.
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
                    <Label htmlFor="edit-partyCode">Party Code *</Label>
                    <Input
                      id="edit-partyCode"
                      value={editFormData.partyCode}
                      onChange={(e) => handleEditInputChange("partyCode", e.target.value)}
                      placeholder="Enter party code"
                      className={editErrors.partyCode ? "border-red-500" : ""}
                    />
                    {editErrors.partyCode && (
                      <p className="text-sm text-red-500">{editErrors.partyCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-partyName">Party Name *</Label>
                    <Input
                      id="edit-partyName"
                      value={editFormData.partyName}
                      onChange={(e) => handleEditInputChange("partyName", e.target.value)}
                      placeholder="Enter party name"
                      className={editErrors.partyName ? "border-red-500" : ""}
                    />
                    {editErrors.partyName && (
                      <p className="text-sm text-red-500">{editErrors.partyName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-partyType">Party Type *</Label>
                    <Select
                      value={editFormData.partyType}
                      onValueChange={(value) =>
                        handleEditInputChange("partyType", value)
                      }
                    >
                      <SelectTrigger id="edit-partyType" className="w-full" icon={ArrowRight}>
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                      <SelectContent>
                        {partyTypes.map((partyType) => (
                          <SelectItem key={partyType} value={partyType}>
                            {partyType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editErrors.partyType && (
                      <p className="text-sm text-red-500">{editErrors.partyType}</p>
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

