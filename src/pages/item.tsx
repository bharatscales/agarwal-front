import { useEffect, useRef, useState } from "react"
import { Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getItemColumns, type Item } from "@/components/columns/item-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"

type ItemForm = {
  itemCode: string
  itemName: string
  itemGroup: string
  uom: string
  openingStock: string
}

export default function Item() {
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ItemForm>({
    itemCode: "",
    itemName: "",
    itemGroup: "",
    uom: "Nos",
    openingStock: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [items, setItems] = useState<Item[]>([])
  const [editFormData, setEditFormData] = useState<ItemForm>({
    itemCode: "",
    itemName: "",
    itemGroup: "",
    uom: "Nos",
    openingStock: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [itemGroupOptions, setItemGroupOptions] = useState<CreatableOption[]>([
    { value: "Raw Material", label: "Raw Material", description: "All Item Groups" },
    { value: "Services", label: "Services", description: "All Item Groups" },
    { value: "Sub Assemblies", label: "Sub Assemblies", description: "All Item Groups" },
  ])
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
      openingStock: item.openingStock,
    })
    setEditErrors({})
    setIsEditItemOpen(true)
  }

  const handleInputChange = (field: keyof ItemForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
    setEditFormData(prev => ({ ...prev, [field]: value }))
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCreateItemGroup = (label: string) => {
    setItemGroupOptions(prev => {
      if (prev.some(option => option.label.toLowerCase() === label.toLowerCase())) {
        return prev
      }
      return [
        ...prev,
        { value: label, label, description: "Custom Item Groups" },
      ]
    })
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
    if (
      formData.openingStock &&
      Number.isNaN(Number(formData.openingStock))
    ) {
      errors.openingStock = "Opening stock must be a number"
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
      editFormData.openingStock &&
      Number.isNaN(Number(editFormData.openingStock))
    ) {
      errors.openingStock = "Opening stock must be a number"
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
      openingStock: formData.openingStock.trim(),
    }
    setItems(prev => [newItem, ...prev])
    setFormData({
      itemCode: "",
      itemName: "",
      itemGroup: "",
      uom: "Nos",
      openingStock: "",
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
              openingStock: editFormData.openingStock.trim(),
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
      uom: "Nos",
      openingStock: "",
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

  const handleCloseEditModal = () => {
    setIsEditItemOpen(false)
    setEditItemId(null)
    setEditFormData({
      itemCode: "",
      itemName: "",
      itemGroup: "",
      uom: "Nos",
      openingStock: "",
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
                      onCreateOption={handleCreateItemGroup}
                      placeholder="Select item group"
                      searchPlaceholder="Search item group..."
                      createLabel="Create a new Item Group"
                      footerText="Filtered by: Is Group is disabled."
                      tickable
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
                    <Input
                      id="uom"
                      ref={(el) => {
                        addFieldRefs.current[3] = el
                      }}
                      value={formData.uom}
                      onChange={(e) => handleInputChange("uom", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 3)}
                      placeholder="Enter unit of measure"
                      className={formErrors.uom ? "border-red-500" : ""}
                    />
                    {formErrors.uom && (
                      <p className="text-sm text-red-500">{formErrors.uom}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openingStock">Opening Stock</Label>
                    <Input
                      id="openingStock"
                      ref={(el) => {
                        addFieldRefs.current[4] = el
                      }}
                      value={formData.openingStock}
                      onChange={(e) => handleInputChange("openingStock", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 4)}
                      placeholder="Enter opening stock"
                      className={formErrors.openingStock ? "border-red-500" : ""}
                    />
                    {formErrors.openingStock && (
                      <p className="text-sm text-red-500">{formErrors.openingStock}</p>
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
                      onCreateOption={handleCreateItemGroup}
                      placeholder="Select item group"
                      searchPlaceholder="Search item group..."
                      createLabel="Create a new Item Group"
                      footerText="Filtered by: Is Group is disabled."
                      tickable
                    />
                    {editErrors.itemGroup && (
                      <p className="text-sm text-red-500">{editErrors.itemGroup}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-uom">Default Unit of Measure *</Label>
                    <Input
                      id="edit-uom"
                      value={editFormData.uom}
                      onChange={(e) => handleEditInputChange("uom", e.target.value)}
                      placeholder="Enter unit of measure"
                      className={editErrors.uom ? "border-red-500" : ""}
                    />
                    {editErrors.uom && (
                      <p className="text-sm text-red-500">{editErrors.uom}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-openingStock">Opening Stock</Label>
                    <Input
                      id="edit-openingStock"
                      value={editFormData.openingStock}
                      onChange={(e) => handleEditInputChange("openingStock", e.target.value)}
                      placeholder="Enter opening stock"
                      className={editErrors.openingStock ? "border-red-500" : ""}
                    />
                    {editErrors.openingStock && (
                      <p className="text-sm text-red-500">{editErrors.openingStock}</p>
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

