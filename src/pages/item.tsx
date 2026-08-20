import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getItemColumns, type Item } from "@/components/columns/item-columns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import api from "@/lib/axios"
import { getItems, updateItem, deleteItem, getItemBom, type ItemPayload } from "@/lib/item-api"
import { getAllParties } from "@/lib/party-api"
import { useAuth } from "@/contexts/AuthContext"
import {
  FgStageBomEditor,
  bomLinesToStageEditors,
  stageEditorsToPayload,
  validateBomStages,
  type BomStageEditor,
} from "@/components/fg-stage-bom-editor"

type ItemForm = {
  itemCode: string
  itemName: string
  itemGroup: string
  partyId: string
  uom: string
  density: string
}

const emptyItemForm = (): ItemForm => ({
  itemCode: "",
  itemName: "",
  itemGroup: "",
  partyId: "",
  uom: "",
  density: "",
})

const parseDensity = (itemGroup: string, density: string): number | null => {
  if (itemGroup !== "rm film") return null
  const trimmed = density.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export default function Item() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canEdit = user?.role === "admin" || user?.role === "superuser"

  const fallbackItemGroups: CreatableOption[] = [
    { value: "rm film", label: "RM Film" },
    { value: "rm ink/adhesive/chemicals", label: "RM Ink/Adhesive/Chemicals" },
    { value: "fg variety", label: "FG Variety" },
    { value: "ink", label: "Ink" },
    { value: "adhesive", label: "Adhesive" },
    { value: "chemical", label: "Chemical" },
  ]
  const fallbackUoms: CreatableOption[] = [{ value: "Nos", label: "Nos" }]
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [editFormData, setEditFormData] = useState<ItemForm>(emptyItemForm())
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [editBomStages, setEditBomStages] = useState<BomStageEditor[]>([])
  const [itemGroupOptions, setItemGroupOptions] = useState<CreatableOption[]>(fallbackItemGroups)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [uomOptions, setUomOptions] = useState<CreatableOption[]>(fallbackUoms)
  const [uomMap, setUomMap] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemGroupFilter, setItemGroupFilter] = useState("all")

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
    navigate("/masters/item/new")
  }

  const handleEditItemOpen = (item: Item) => {
    setEditItemId(item.id)
    setEditFormData({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemGroup: item.itemGroup,
      partyId: item.partyId != null ? String(item.partyId) : "",
      uom: item.uom,
      density: item.itemGroup === "rm film" && item.density != null ? String(item.density) : "",
    })
    setEditErrors({})
    setEditBomStages([])
    setIsEditItemOpen(true)
    if (item.itemGroup === "fg variety") {
      getItemBom(item.id)
        .then((lines) => {
          setEditBomStages(lines.length > 0 ? bomLinesToStageEditors(lines) : [])
        })
        .catch(() => setEditBomStages([]))
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
      if (field === "itemGroup") {
        return {
          ...prev,
          itemGroup: value,
          partyId: value === "fg variety" ? prev.partyId : "",
          density: value === "rm film" ? prev.density : "",
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
      handleEditInputChange("uom", value)
    } catch (error) {
      console.error("Failed to create UOM:", error)
    }
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
    if (editFormData.itemGroup === "rm film" && editFormData.density.trim()) {
      const densityValue = Number(editFormData.density)
      if (!Number.isFinite(densityValue) || densityValue <= 0) {
        errors.density = "Enter a valid density"
      }
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItemId || !validateEditForm()) return

    if (editFormData.itemGroup.trim() === "fg variety") {
      const bomError = validateBomStages(editBomStages)
      if (bomError) {
        setError(bomError)
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const uomId = getUomId(editFormData.uom)
      const payload: Partial<ItemPayload> = {
        itemCode: editFormData.itemCode.trim(),
        itemName: editFormData.itemName.trim() || editFormData.itemCode.trim(),
        itemGroup: editFormData.itemGroup.trim(),
        partyId: editFormData.partyId.trim() ? parseInt(editFormData.partyId, 10) : null,
        density: parseDensity(editFormData.itemGroup, editFormData.density),
        uomId: uomId,
      }
      if (editFormData.itemGroup.trim() === "fg variety") {
        payload.bomLines = stageEditorsToPayload(editBomStages)
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
      setError(typeof errorMsg === "string" ? errorMsg : "Failed to update item. Please try again.")
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("already exists")) {
        setEditErrors({ itemCode: "Item code already exists" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (item: Item) => {
    if (!window.confirm(`Remove item "${item.itemCode}"? It will no longer appear in new entries. Existing records keep their link.`)) {
      return
    }

    setIsSubmitting(true)
    try {
      await deleteItem(item.id)
      setItems(prev => prev.filter(row => row.id !== item.id))
      setError(null)
    } catch (err: any) {
      console.error("Error deleting item:", err)
      const msg = err.response?.data?.detail ?? "Failed to delete item. Please try again."
      setError(typeof msg === "string" ? msg : "Failed to delete item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchItemGroups = async () => {
      try {
        const response = await api.get<string[]>("/meta/item-groups")
        const labelMap: Record<string, string> = {
          "rm film": "RM Film",
          "rm ink/adhesive/chemicals": "RM Ink/Adhesive/Chemicals",
          "fg variety": "FG Variety",
        }
        const options = response.data.map((value) => ({
          value,
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

  const fetchParties = async () => {
    try {
      const data = await getAllParties()
      setPartyOptions(
        data.map(p => ({ value: p.id.toString(), label: p.partyCode }))
      )
    } catch (err) {
      console.error("Failed to load parties:", err)
    }
  }

  useEffect(() => {
    fetchItems()
    fetchUomsWithIds()
    fetchParties()
  }, [])

  const handleCloseEditModal = () => {
    setIsEditItemOpen(false)
    setEditItemId(null)
    setEditFormData(emptyItemForm())
    setEditErrors({})
    setEditBomStages([])
  }

  const itemGroupFilterBadges = useMemo(() => {
    const seen = new Set(itemGroupOptions.map(option => option.value.toLowerCase()))
    const extraGroups = items
      .map(item => item.itemGroup)
      .filter(group => group && !seen.has(group.toLowerCase()))
      .filter((group, index, all) => all.findIndex(g => g.toLowerCase() === group.toLowerCase()) === index)
      .map(value => ({
        value,
        label: value.replace(/^rm\b/i, "RM").replace(/^fg\b/i, "FG"),
      }))
    return [...itemGroupOptions, ...extraGroups]
  }, [itemGroupOptions, items])

  const filteredItems = useMemo(() => {
    if (itemGroupFilter === "all") return items
    return items.filter(item => item.itemGroup === itemGroupFilter)
  }, [items, itemGroupFilter])

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
            {canEdit && (
              <Button onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge
          asChild
          variant={itemGroupFilter === "all" ? "default" : "outline"}
          className="cursor-pointer"
        >
          <button type="button" onClick={() => setItemGroupFilter("all")}>
            All
          </button>
        </Badge>
        {itemGroupFilterBadges.map((group) => (
          <Badge
            key={group.value}
            asChild
            variant={itemGroupFilter === group.value ? "default" : "outline"}
            className="cursor-pointer"
          >
            <button type="button" onClick={() => setItemGroupFilter(group.value)}>
              {group.label}
            </button>
          </Badge>
        ))}
      </div>

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
            key={`item-list-${itemGroupFilter}`}
            columns={getItemColumns({
              onEdit: handleEditItemOpen,
              onDelete: handleDeleteItem,
              canEdit,
            })}
            data={filteredItems}
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

      {isEditItemOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    />
                    {editErrors.itemGroup && (
                      <p className="text-sm text-red-500">{editErrors.itemGroup}</p>
                    )}
                  </div>

                  {editFormData.itemGroup === "fg variety" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-partyId">Party</Label>
                      <CreatableCombobox
                        options={partyOptions}
                        value={editFormData.partyId || null}
                        onValueChange={(value) =>
                          handleEditInputChange("partyId", value ?? "")
                        }
                        placeholder="Select party"
                        searchPlaceholder="Search party..."
                      />
                    </div>
                  )}

                  {editFormData.itemGroup === "rm film" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-density">Density (g/cm³)</Label>
                      <Input
                        id="edit-density"
                        type="number"
                        step="any"
                        min="0"
                        value={editFormData.density}
                        onChange={(e) => handleEditInputChange("density", e.target.value)}
                        placeholder="e.g. 1.4"
                        className={editErrors.density ? "border-red-500" : ""}
                      />
                      {editErrors.density && (
                        <p className="text-sm text-red-500">{editErrors.density}</p>
                      )}
                    </div>
                  )}

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

                {editFormData.itemGroup === "fg variety" && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">BOM, structure & routing</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add a manufacturing stage (routing), then define RM items per layer (structure) for that stage.
                      </p>
                    </div>
                    <FgStageBomEditor value={editBomStages} onChange={setEditBomStages} />
                  </div>
                )}

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
