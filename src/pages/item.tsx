import { useEffect, useRef, useState } from "react"
import { Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getItemColumns, type Item } from "@/components/columns/item-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import api from "@/lib/axios"
import { getItems, createItem, updateItem, deleteItem, type ItemPayload } from "@/lib/item-api"

type ItemForm = {
  itemCode: string
  itemName: string
  itemGroup: string
  uom: string
}

export default function Item() {
  const fallbackItemGroups: CreatableOption[] = [
    { value: "rm film", label: "RM Film" },
    { value: "rm ink/adhesive/chemicals", label: "RM Ink/Adhesive/Chemicals" },
    { value: "fg variety", label: "FG Variety" },
  ]
  const fallbackUoms: CreatableOption[] = [{ value: "Nos", label: "Nos" }]
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ItemForm>({
    itemCode: "",
    itemName: "",
    itemGroup: "",
    uom: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [items, setItems] = useState<Item[]>([])
  const [editFormData, setEditFormData] = useState<ItemForm>({
    itemCode: "",
    itemName: "",
    itemGroup: "",
    uom: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [itemGroupOptions, setItemGroupOptions] = useState<CreatableOption[]>(fallbackItemGroups)
  const [uomOptions, setUomOptions] = useState<CreatableOption[]>(fallbackUoms)
  const [uomMap, setUomMap] = useState<Map<string, number>>(new Map()) // Map UOM name to ID
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getItems()
      setItems(data)
    } catch (err: any) {
      console.error("Error fetching items:", err)
      setError("Failed to load items. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUomsWithIds = async () => {
    try {
      const response = await api.get<Array<{ id: number; uom: string }>>("/meta/uoms-with-ids")
      const uoms = response.data
      setUomMap(new Map(uoms.map(u => [u.uom, u.id])))
      setUomOptions(uoms.map(u => ({ value: u.uom, label: u.uom })))
    } catch (error) {
      console.error("Failed to load UOMs:", error)
      // Fallback to string-only endpoint
      const uomsResponse = await api.get<string[]>("/meta/uoms")
      setUomOptions(uomsResponse.data.map(u => ({ value: u, label: u })))
    }
  }

  const getUomId = (uomName: string): number | undefined => {
    if (!uomName.trim()) return undefined
    return uomMap.get(uomName.trim())
  }

  const handleRefresh = () => {
    fetchItems()
  }

  const handleAddItem = () => {
    setIsAddItemOpen(true)
  }

  const handleEditItemOpen = (item: Item) => {
    setEditItemId(item.id)
    setEditFormData({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemGroup: item.itemGroup,
      uom: item.uom,
    })
    setEditErrors({})
    setIsEditItemOpen(true)
  }

  const handleInputChange = (field: keyof ItemForm, value: string) => {
    setFormData(prev => {
      if (field === "itemCode") {
        const shouldSyncName =
          !prev.itemName.trim() || prev.itemName === prev.itemCode
        return {
          ...prev,
          itemCode: value,
          itemName: shouldSyncName ? value : prev.itemName,
        }
      }
      return { ...prev, [field]: value }
    })
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
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

  const handleEditInputChange = (field: keyof ItemForm, value: string) => {
    setEditFormData(prev => {
      if (field === "itemCode") {
        const shouldSyncName =
          !prev.itemName.trim() || prev.itemName === prev.itemCode
        return {
          ...prev,
          itemCode: value,
          itemName: shouldSyncName ? value : prev.itemName,
        }
      }
      return { ...prev, [field]: value }
    })
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCreateUom = async (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    try {
      const response = await api.post<{ id: number; uom: string }>("/meta/uoms", { uom: trimmed })
      const value = response.data.uom
      const id = response.data.id
      if (id) {
        setUomMap(prev => new Map(prev).set(value, id))
      }
      setUomOptions(prev => {
        if (prev.some(option => option.value.toLowerCase() === value.toLowerCase())) {
          return prev
        }
        return [...prev, { value, label: value }]
      })
      handleInputChange("uom", value)
      handleEditInputChange("uom", value)
    } catch (error) {
      console.error("Failed to create UOM:", error)
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ItemForm, string>> = {}

    if (!formData.itemCode.trim()) {
      errors.itemCode = "Item code is required"
    }
    if (!formData.itemGroup.trim()) {
      errors.itemGroup = "Item group is required"
    }
    if (!formData.uom.trim()) {
      errors.uom = "Default unit of measure is required"
    }
    // Item code uniqueness will be checked by API

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof ItemForm, string>> = {}

    if (!editFormData.itemCode.trim()) {
      errors.itemCode = "Item code is required"
    }
    if (!editFormData.itemGroup.trim()) {
      errors.itemGroup = "Item group is required"
    }
    if (!editFormData.uom.trim()) {
      errors.uom = "Default unit of measure is required"
    }
    // Item code uniqueness will be checked by API

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const uomId = getUomId(formData.uom)
      const payload: ItemPayload = {
        itemCode: formData.itemCode.trim(),
        itemName: formData.itemName.trim() || formData.itemCode.trim(),
        itemGroup: formData.itemGroup.trim(),
        uomId: uomId,
      }

      const newItem = await createItem(payload)
      setItems(prev => [newItem, ...prev])
      setFormData({
        itemCode: "",
        itemName: "",
        itemGroup: "",
        uom: "",
      })
      setFormErrors({})
      setIsAddItemOpen(false)
    } catch (err: any) {
      console.error("Error creating item:", err)
      const errorMsg = err.response?.data?.detail || "Failed to create item. Please try again."
      setError(errorMsg)
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("already exists")) {
        setFormErrors({ itemCode: "Item code already exists" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItemId || !validateEditForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const uomId = getUomId(editFormData.uom)
      const payload: Partial<ItemPayload> = {
        itemCode: editFormData.itemCode.trim(),
        itemName: editFormData.itemName.trim() || editFormData.itemCode.trim(),
        itemGroup: editFormData.itemGroup.trim(),
        uomId: uomId,
      }

      const updatedItem = await updateItem(editItemId, payload)
      setItems(prev =>
        prev.map(item =>
          item.id === editItemId ? updatedItem : item
        )
      )
      handleCloseEditModal()
    } catch (err: any) {
      console.error("Error updating item:", err)
      const errorMsg = err.response?.data?.detail || "Failed to update item. Please try again."
      setError(errorMsg)
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("already exists")) {
        setEditErrors({ itemCode: "Item code already exists" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (item: Item) => {
    if (!window.confirm(`Delete item "${item.itemCode}"? This cannot be undone.`)) {
      return
    }

    setIsSubmitting(true)
    try {
      await deleteItem(item.id)
      setItems(prev => prev.filter(row => row.id !== item.id))
      setError(null)
    } catch (err: any) {
      console.error("Error deleting item:", err)
      setError("Failed to delete item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setIsAddItemOpen(false)
    setFormData({
      itemCode: "",
      itemName: "",
      itemGroup: "",
      uom: "",
    })
    setFormErrors({})
  }

  useEffect(() => {
    if (isAddItemOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddItemOpen])

  useEffect(() => {
    const fetchItemGroups = async () => {
      try {
        const response = await api.get<string[]>("/meta/item-groups")
        // Map backend values to display labels (matching backend enum values exactly)
        const labelMap: Record<string, string> = {
          "rm film": "RM Film",
          "rm ink/adhesive/chemicals": "RM Ink/Adhesive/Chemicals",
          "fg variety": "FG Variety",
        }
        const options = response.data.map((value) => ({
          value, // Use exact backend value (e.g., "rm film")
          label: labelMap[value] || value.replace(/^rm\b/i, "RM").replace(/^fg\b/i, "FG"),
        }))
        if (options.length > 0) {
          setItemGroupOptions(options)
        }
      } catch (error) {
        console.error("Failed to load item groups:", error)
        setItemGroupOptions(fallbackItemGroups)
      }
    }

    fetchItemGroups()
  }, [])

  useEffect(() => {
    fetchItems()
    fetchUomsWithIds()
  }, [])

  useEffect(() => {
    const fetchUoms = async () => {
      try {
        await fetchUomsWithIds()
      } catch (error) {
        console.error("Failed to load UOMs:", error)
        // Fallback to string-only endpoint
        try {
          const response = await api.get<string[]>("/meta/uoms")
          const options = response.data.map((value) => ({
            value,
            label: value,
          }))
          if (options.length > 0) {
            setUomOptions(options)
          }
        } catch (err) {
          setUomOptions(fallbackUoms)
        }
      }
    }

    fetchUoms()
  }, [])

  const handleCloseEditModal = () => {
    setIsEditItemOpen(false)
    setEditItemId(null)
    setEditFormData({
      itemCode: "",
      itemName: "",
      itemGroup: "",
      uom: "",
    })
    setEditErrors({})
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Item</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage item master data.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddItem} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading items...</p>
          </div>
        </div>
      ) : (
        <div>
          <DataTable
            columns={getItemColumns({
              onEdit: handleEditItemOpen,
              onDelete: handleDeleteItem,
            })}
            data={items}
          />
        </div>
      )}

      {items.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No items found. Create your first item to get started.
          </p>
        </div>
      )}

      {isAddItemOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New Item</CardTitle>
                <CardDescription>
                  Create a new item with basic details.
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
                    <Label htmlFor="itemCode">Item Code *</Label>
                    <Input
                      id="itemCode"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.itemCode}
                      onChange={(e) => handleInputChange("itemCode", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter item code"
                      className={formErrors.itemCode ? "border-red-500" : ""}
                    />
                    {formErrors.itemCode && (
                      <p className="text-sm text-red-500">{formErrors.itemCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      ref={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      value={formData.itemName}
                      onChange={(e) => handleInputChange("itemName", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 1)}
                      placeholder="Enter item name"
                      className={formErrors.itemName ? "border-red-500" : ""}
                    />
                    {formErrors.itemName && (
                      <p className="text-sm text-red-500">{formErrors.itemName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemGroup">Item Group *</Label>
                    <CreatableCombobox
                      options={itemGroupOptions}
                      value={formData.itemGroup || null}
                      onValueChange={(value) =>
                        handleInputChange("itemGroup", value ?? "")
                      }
                      placeholder="Select item group"
                      searchPlaceholder="Search item group..."
                      onInputKeyDown={(e) => handleEnterKey(e, 2)}
                      triggerRef={(el) => {
                        addFieldRefs.current[2] = el
                      }}
                    />
                    {formErrors.itemGroup && (
                      <p className="text-sm text-red-500">{formErrors.itemGroup}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uom">Default Unit of Measure *</Label>
                    <CreatableCombobox
                      options={uomOptions}
                      value={formData.uom || null}
                      onValueChange={(value) =>
                        handleInputChange("uom", value ?? "")
                      }
                      onCreateOption={handleCreateUom}
                      placeholder="Select unit of measure"
                      searchPlaceholder="Search unit of measure..."
                      createLabel="Create a new UOM"
                      onInputKeyDown={(e) => handleEnterKey(e, 3)}
                      triggerRef={(el) => {
                        addFieldRefs.current[3] = el
                      }}
                    />
                    {formErrors.uom && (
                      <p className="text-sm text-red-500">{formErrors.uom}</p>
                    )}
                  </div>
                </div>

              </CardContent>

              <CardContent className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Item"}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {isEditItemOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Item</CardTitle>
                <CardDescription>
                  Update the item details.
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
                    <Label htmlFor="edit-itemCode">Item Code *</Label>
                    <Input
                      id="edit-itemCode"
                      value={editFormData.itemCode}
                      onChange={(e) => handleEditInputChange("itemCode", e.target.value)}
                      placeholder="Enter item code"
                      className={editErrors.itemCode ? "border-red-500" : ""}
                    />
                    {editErrors.itemCode && (
                      <p className="text-sm text-red-500">{editErrors.itemCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-itemName">Item Name</Label>
                    <Input
                      id="edit-itemName"
                      value={editFormData.itemName}
                      onChange={(e) => handleEditInputChange("itemName", e.target.value)}
                      placeholder="Enter item name"
                      className={editErrors.itemName ? "border-red-500" : ""}
                    />
                    {editErrors.itemName && (
                      <p className="text-sm text-red-500">{editErrors.itemName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-itemGroup">Item Group *</Label>
                    <CreatableCombobox
                      options={itemGroupOptions}
                      value={editFormData.itemGroup || null}
                      onValueChange={(value) =>
                        handleEditInputChange("itemGroup", value ?? "")
                      }
                      placeholder="Select item group"
                      searchPlaceholder="Search item group..."
                      footerText="Filtered by: Is Group is disabled."
                    />
                    {editErrors.itemGroup && (
                      <p className="text-sm text-red-500">{editErrors.itemGroup}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-uom">Default Unit of Measure *</Label>
                    <CreatableCombobox
                      options={uomOptions}
                      value={editFormData.uom || null}
                      onValueChange={(value) =>
                        handleEditInputChange("uom", value ?? "")
                      }
                      onCreateOption={handleCreateUom}
                      placeholder="Select unit of measure"
                      searchPlaceholder="Search unit of measure..."
                      createLabel="Create a new UOM"
                    />
                    {editErrors.uom && (
                      <p className="text-sm text-red-500">{editErrors.uom}</p>
                    )}
                  </div>
                </div>

              </CardContent>

              <CardContent className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditModal}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

