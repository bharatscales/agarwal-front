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

type ItemForm = {
  itemCode: string
  itemName: string
  itemGroup: string
  uom: string
}

export default function Item() {
  const fallbackItemGroups: CreatableOption[] = [
    { value: "rm film", label: "RM film" },
    { value: "rm ink/adhesive/chemicals", label: "RM ink/adhesive/chemicals" },
    { value: "fg variety", label: "FG variety" },
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
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    setItems(prev => [...prev])
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
      const response = await api.post<{ uom: string }>("/meta/uoms", { uom: trimmed })
      const value = response.data.uom
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
    if (items.some(item => item.itemCode === formData.itemCode.trim())) {
      errors.itemCode = "Item code already exists"
    }

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
    if (
      items.some(
        item =>
          item.itemCode === editFormData.itemCode.trim() &&
          item.id !== editItemId
      )
    ) {
      errors.itemCode = "Item code already exists"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const newItem: Item = {
      id: Date.now(),
      itemCode: formData.itemCode.trim(),
      itemName: formData.itemName.trim(),
      itemGroup: formData.itemGroup.trim(),
      uom: formData.uom.trim(),
    }
    setItems(prev => [newItem, ...prev])
    setFormData({
      itemCode: "",
      itemName: "",
      itemGroup: "",
      uom: "",
    })
    setFormErrors({})
    setIsAddItemOpen(false)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItemId || !validateEditForm()) return

    setItems(prev =>
      prev.map(item =>
        item.id === editItemId
          ? {
              ...item,
              itemCode: editFormData.itemCode.trim(),
              itemName: editFormData.itemName.trim(),
              itemGroup: editFormData.itemGroup.trim(),
              uom: editFormData.uom.trim(),
            }
          : item
      )
    )
    handleCloseEditModal()
  }

  const handleDeleteItem = (item: Item) => {
    setItems(prev => prev.filter(row => row.id !== item.id))
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
        const options = response.data.map((value) => ({
          value,
          label: value
            .replace(/^rm\b/i, "RM")
            .replace(/^fg\b/i, "FG"),
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
    const fetchUoms = async () => {
      try {
        const response = await api.get<string[]>("/meta/uoms")
        const options = response.data.map((value) => ({
          value,
          label: value,
        }))
        if (options.length > 0) {
          setUomOptions(options)
        }
      } catch (error) {
        console.error("Failed to load UOMs:", error)
        setUomOptions(fallbackUoms)
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

      <div>
        <DataTable
          columns={getItemColumns({
            onEdit: handleEditItemOpen,
            onDelete: handleDeleteItem,
          })}
          data={items}
        />
      </div>

      {items.length === 0 && (
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
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Item
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
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Changes
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

