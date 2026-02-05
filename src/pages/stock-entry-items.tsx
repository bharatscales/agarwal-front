import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronRight, Trash2, Edit, X, Check } from "lucide-react"
import { getStockVoucher } from "@/lib/stock-voucher-api"
import { getRollsStockByVoucher, createRollsStock, updateRollsStock, deleteRollsStock, type RollsStockPayload } from "@/lib/rolls-stock-api"
import { getItems, createItem, type Item } from "@/lib/item-api"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type RollsStockRow = {
  id?: number
  itemId: number
  itemCode: string
  itemName: string
  rollno: string
  size: number
  micron: number
  netweight: number
  grossweight: number
  isEditing?: boolean
}

export default function StockEntryItems() {
  const { voucherId } = useParams<{ voucherId: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [rollsStock, setRollsStock] = useState<RollsStockRow[]>([{
    itemId: 0,
    itemCode: "",
    itemName: "",
    rollno: "",
    size: 0,
    micron: 0,
    netweight: 0,
    grossweight: 0,
    isEditing: true,
  }])
  const [items, setItems] = useState<Item[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const [uomMap, setUomMap] = useState<Map<string, number>>(new Map()) // Map UOM name to ID
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const rollnoInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const sizeInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const micronInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const netWeightInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const grossWeightInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const fetchRollsStock = async () => {
    if (!voucherId) return
    try {
      const data = await getRollsStockByVoucher(Number(voucherId))
      const existingRows = data.map(rs => ({
        id: rs.id,
        itemId: rs.itemId,
        itemCode: rs.itemCode,
        itemName: rs.itemName,
        rollno: rs.rollno,
        size: rs.size,
        micron: rs.micron,
        netweight: rs.netweight,
        grossweight: rs.grossweight,
        isEditing: false,
      }))
      // Always add an empty editing row at the end
      setRollsStock([...existingRows, {
        itemId: 0,
        itemCode: "",
        itemName: "",
        rollno: "",
        size: 0,
        micron: 0,
        netweight: 0,
        grossweight: 0,
        isEditing: true,
      }])
    } catch (err: any) {
      console.error("Error fetching rolls stock:", err)
      setError("Failed to load rolls stock")
      // On error, still show empty row
      setRollsStock([{
        itemId: 0,
        itemCode: "",
        itemName: "",
        rollno: "",
        size: 0,
        micron: 0,
        netweight: 0,
        grossweight: 0,
        isEditing: true,
      }])
    }
  }

  const fetchUomsWithIds = async () => {
    try {
      const response = await api.get<Array<{ id: number; uom: string }>>("/meta/uoms-with-ids")
      const uoms = response.data
      setUomMap(new Map(uoms.map(u => [u.uom, u.id])))
    } catch (error) {
      console.error("Failed to load UOMs:", error)
    }
  }

  const getUomId = (uomName: string): number | undefined => {
    if (!uomName.trim()) return undefined
    return uomMap.get(uomName.trim())
  }

  const fetchItems = async () => {
    try {
      const data = await getItems()
      // Filter items to only show those with item group "rm film"
      const filteredItems = data.filter(item => item.itemGroup === "rm film")
      setItems(filteredItems)
      // Convert filtered items to CreatableOption format for CreatableCombobox
      // Item code as label, item name as description
      const options: CreatableOption[] = filteredItems.map(item => ({
        value: item.id.toString(),
        label: item.itemCode,
        description: item.itemName,
      }))
      setItemOptions(options)
    } catch (err: any) {
      console.error("Error fetching items:", err)
    }
  }

  useEffect(() => {
    if (voucherId) {
      Promise.all([
        getStockVoucher(Number(voucherId)),
        fetchUomsWithIds(),
        fetchItems(),
        fetchRollsStock(),
      ])
        .catch((err) => {
          console.error("Error fetching data:", err)
          navigate("/manufacturing/stock-entry")
        })
        .finally(() => setIsLoading(false))
    }
  }, [voucherId, navigate])

  // Auto-focus on first field when page loads or when a new row is added
  useEffect(() => {
    if (!isLoading && rollsStock.length > 0) {
      const lastIndex = rollsStock.length - 1
      const lastRow = rollsStock[lastIndex]
      if (lastRow.isEditing && lastRow.itemId === 0) {
        // Focus on the last row's item field (first field) if it's a new empty row
        setTimeout(() => {
          itemInputRefs.current[lastIndex]?.focus()
        }, 200)
      }
    }
  }, [isLoading, rollsStock.length])

  const handleEditRow = (index: number) => {
    setRollsStock(prev => prev.map((row, i) => 
      i === index ? { ...row, isEditing: true } : row
    ))
  }

  const handleCancelEdit = (index: number) => {
    const row = rollsStock[index]
    if (row.id) {
      // Cancel editing existing row - revert to original
      setRollsStock(prev => prev.map((r, i) => 
        i === index ? { ...r, isEditing: false } : r
      ))
    } else {
      // Remove new row that wasn't saved, but ensure at least one empty row exists
      setRollsStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        // If no empty row exists, add one
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            rollno: "",
            size: 0,
            micron: 0,
            netweight: 0,
            grossweight: 0,
            isEditing: true,
          }]
        }
        return filtered
      })
    }
  }

  const handleSaveRow = async (index: number, overrideRow?: RollsStockRow) => {
    if (!voucherId) return
    
    const row = overrideRow || rollsStock[index]
    if (!row.itemId) {
      setError("Please select an item")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: RollsStockPayload = {
        itemId: row.itemId,
        rollno: row.rollno || undefined,
        size: row.size !== 0 ? row.size : 0,
        micron: row.micron || undefined,
        netweight: row.netweight || undefined,
        grossweight: row.grossweight || undefined,
        stockVoucherId: Number(voucherId),
      }

      if (row.id) {
        // Update existing
        const updated = await updateRollsStock(row.id, payload)
        setRollsStock(prev => {
          const updatedRows = prev.map((r, i) => 
            i === index ? {
              id: updated.id,
              itemId: updated.itemId,
              itemCode: updated.itemCode,
              itemName: updated.itemName,
              rollno: updated.rollno,
              size: updated.size,
              micron: updated.micron,
              netweight: updated.netweight,
              grossweight: updated.grossweight,
              isEditing: false,
            } : r
          )
          // Add a new empty row at the end if there isn't one already
          const hasEmptyRow = updatedRows.some(r => !r.id && r.isEditing)
          if (!hasEmptyRow) {
            return [...updatedRows, {
              itemId: 0,
              itemCode: "",
              itemName: "",
              rollno: "",
              size: 0,
              micron: 0,
              netweight: 0,
              grossweight: 0,
              isEditing: true,
            }]
          }
          return updatedRows
        })
      } else {
        // Create new
        const created = await createRollsStock(payload)
        setRollsStock(prev => {
          const updatedRows = prev.map((r, i) => 
            i === index ? {
              id: created.id,
              itemId: created.itemId,
              itemCode: created.itemCode,
              itemName: created.itemName,
              rollno: created.rollno,
              size: created.size,
              micron: created.micron,
              netweight: created.netweight,
              grossweight: created.grossweight,
              isEditing: false,
            } : r
          )
          // Add a new empty row at the end
          return [...updatedRows, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            rollno: "",
            size: 0,
            micron: 0,
            netweight: 0,
            grossweight: 0,
            isEditing: true,
          }]
        })
      }
    } catch (err: any) {
      console.error("Error saving rolls stock:", err)
      setError("Failed to save rolls stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRow = async (index: number) => {
    const row = rollsStock[index]
    if (!row.id) {
      // Just remove from local state if not saved, but ensure at least one empty row exists
      setRollsStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            rollno: "",
            size: 0,
            micron: 0,
            netweight: 0,
            grossweight: 0,
            isEditing: true,
          }]
        }
        return filtered
      })
      return
    }

    if (!window.confirm("Delete this roll entry?")) return

    setIsSubmitting(true)
    try {
      await deleteRollsStock(row.id)
      setRollsStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        // Ensure at least one empty row exists after deletion
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            rollno: "",
            size: 0,
            micron: 0,
            netweight: 0,
            grossweight: 0,
            isEditing: true,
          }]
        }
        return filtered
      })
    } catch (err: any) {
      console.error("Error deleting rolls stock:", err)
      setError("Failed to delete rolls stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateItem = async (itemCode: string, index: number) => {
    if (!itemCode.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Get default UOM (prefer "Nos" or first available)
      const defaultUom = uomMap.has("Nos") ? "Nos" : Array.from(uomMap.keys())[0] || "Nos"
      const uomId = getUomId(defaultUom)

      // Create new item with "rm film" group
      const newItem = await createItem({
        itemCode: itemCode.trim(),
        itemName: itemCode.trim(), // Default to item code if no name provided
        itemGroup: "rm film",
        uomId: uomId,
      })

      // Add to items list
      setItems(prev => [...prev, newItem])
      
      // Update options
      setItemOptions(prev => [...prev, {
        value: newItem.id.toString(),
        label: newItem.itemCode,
        description: newItem.itemName,
      }])

      // Update the row with the new item ID (this will override the label string set by CreatableCombobox)
      handleFieldChange(index, "itemId", newItem.id.toString())
      
      // Move focus to next field after item is created
      setTimeout(() => {
        rollnoInputRefs.current[index]?.focus()
      }, 100)
    } catch (err: any) {
      console.error("Error creating item:", err)
      const errorMsg = err.response?.data?.detail || "Failed to create item. Please try again."
      setError(errorMsg)
      // Reset the value if creation failed
      setRollsStock(prev => prev.map((r, i) => 
        i === index ? { 
          ...r, 
          itemId: 0, 
          itemCode: "",
          itemName: "",
        } : r
      ))
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyValueFromAbove = (index: number, field: keyof RollsStockRow) => {
    if (index === 0) return // Can't copy from above if it's the first row
    
    const aboveRow = rollsStock[index - 1]
    if (!aboveRow) return
    
    const aboveValue = aboveRow[field]
    // For numeric fields, allow 0 as a valid value to copy
    // For string fields, only copy if not empty
    if (field === "size" || field === "micron" || field === "netweight" || field === "grossweight") {
      // For numeric fields, copy if value is defined and not null (0 is valid)
      if (aboveValue !== undefined && aboveValue !== null) {
        handleFieldChange(index, field, aboveValue)
      }
    } else {
      // For string fields, only copy if not empty
      if (aboveValue !== undefined && aboveValue !== null && aboveValue !== "") {
        handleFieldChange(index, field, aboveValue)
      }
    }
  }

  const handleItemKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter") return
    
    e.preventDefault()
    
    const input = e.currentTarget as HTMLInputElement
    const searchValue = input.value.trim()
    
    if (!searchValue) {
      // If empty and not first row, copy from above
      const currentRow = rollsStock[index]
      if (index > 0 && !currentRow?.itemId) {
        const aboveRow = rollsStock[index - 1]
        if (aboveRow?.itemId) {
          handleFieldChange(index, "itemId", aboveRow.itemId.toString())
          setTimeout(() => {
            rollnoInputRefs.current[index]?.focus()
          }, 100)
          return
        }
      }
      // If empty, select first option if available
      if (itemOptions.length > 0) {
        handleFieldChange(index, "itemId", itemOptions[0].value)
        // Move to next field
        setTimeout(() => {
          rollnoInputRefs.current[index]?.focus()
        }, 100)
      }
      return
    }

    // Filter options to find matches (check both label and description)
    const filtered = itemOptions.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchValue.toLowerCase())
    )

    if (filtered.length > 0) {
      // Select first matching option
      handleFieldChange(index, "itemId", filtered[0].value)
      // Move to next field
      setTimeout(() => {
        rollnoInputRefs.current[index]?.focus()
      }, 100)
    } else {
      // No match found, create new item
      await handleCreateItem(searchValue, index)
      // Move to next field after item is created
      setTimeout(() => {
        rollnoInputRefs.current[index]?.focus()
      }, 200)
    }
  }

  const handleFieldChange = (index: number, field: keyof RollsStockRow, value: any) => {
    if (field === "itemId") {
      // CreatableCombobox returns string value, convert to number
      const itemId = typeof value === "string" ? Number(value) : value
      const item = items.find(i => i.id === itemId)
      setRollsStock(prev => prev.map((r, i) => 
        i === index ? { 
          ...r, 
          itemId: itemId, 
          itemCode: item?.itemCode || "",
          itemName: item?.itemName || "",
        } : r
      ))
    } else {
      setRollsStock(prev => prev.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      ))
    }
  }

  // Calculate totals (only for saved rows, not the empty editing row)
  const savedRows = rollsStock.filter(row => row.id)
  const totalRolls = savedRows.length
  const totalGrossWeight = savedRows.reduce((sum, row) => sum + (row.grossweight || 0), 0)
  const totalNetWeight = savedRows.reduce((sum, row) => sum + (row.netweight || 0), 0)

  if (isLoading) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link to="/manufacturing/stock-entry" className="hover:text-gray-900 dark:hover:text-gray-100">
            Stock Entry
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-100">
            Voucher #{voucherId}
          </span>
        </nav>
          <div>
          <h1 className="text-lg sm:text-xl font-bold">Rolls Stock Entry</h1>
          </div>
        </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
      </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
        <div className="overflow-y-auto flex-1 relative">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
              <TableRow className="h-auto">
                <TableHead className="w-16 bg-background py-1 px-2">S.No</TableHead>
                <TableHead className="bg-background py-1 px-2">Item</TableHead>
                <TableHead className="bg-background py-1 px-2">Roll No</TableHead>
                <TableHead className="bg-background py-1 px-2">Size</TableHead>
                <TableHead className="bg-background py-1 px-2">Micron</TableHead>
                <TableHead className="bg-background py-1 px-2">Net Weight</TableHead>
                <TableHead className="bg-background py-1 px-2">Gross Weight</TableHead>
                <TableHead className="w-24 bg-background py-1 px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {rollsStock.map((row, index) => (
                <TableRow key={row.id || `new-${index}`} className="h-auto">
                  {row.isEditing ? (
                    <>
                      <TableCell className="text-center py-1 px-2">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="[&_input]:h-8">
                        <CreatableCombobox
                          options={itemOptions}
                          value={row.itemId ? row.itemId.toString() : null}
                          onValueChange={(value) => handleFieldChange(index, "itemId", value)}
                          onCreateOption={(label) => handleCreateItem(label, index)}
                          placeholder="Select item"
                          searchPlaceholder="Search item..."
                          createLabel="Create new item"
                          triggerRef={(el) => {
                            itemInputRefs.current[index] = el
                          }}
                          onInputKeyDown={(e) => handleItemKeyDown(e, index)}
                        />
                        </div>
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            rollnoInputRefs.current[index] = el
                          }}
                          value={row.rollno}
                          onChange={(e) => handleFieldChange(index, "rollno", e.target.value)}
                          placeholder="Roll No"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // If empty and not first row, copy from above
                              if (!row.rollno && index > 0) {
                                copyValueFromAbove(index, "rollno")
                              }
                              // Move to next field (Size)
                              const sizeInput = e.currentTarget.closest("tr")?.querySelector("input[placeholder='Size']") as HTMLInputElement
                              sizeInput?.focus()
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            sizeInputRefs.current[index] = el
                          }}
                          type="number"
                          step="0.01"
                          value={row.size || ""}
                          onChange={(e) => handleFieldChange(index, "size", parseFloat(e.target.value) || 0)}
                          placeholder="Size"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // If empty and not first row, copy from above
                              if ((!row.size || row.size === 0) && index > 0) {
                                copyValueFromAbove(index, "size")
                              }
                              // Move to next field (Micron)
                              setTimeout(() => {
                                micronInputRefs.current[index]?.focus()
                              }, 100)
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            micronInputRefs.current[index] = el
                          }}
                          type="number"
                          step="0.01"
                          value={row.micron || ""}
                          onChange={(e) => handleFieldChange(index, "micron", parseFloat(e.target.value) || 0)}
                          placeholder="Micron"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // If empty and not first row, copy from above
                              if ((!row.micron || row.micron === 0) && index > 0) {
                                copyValueFromAbove(index, "micron")
                              }
                              // Move to next field (Net Weight)
                              const netWeightInput = e.currentTarget.closest("tr")?.querySelector("input[placeholder='Net Weight']") as HTMLInputElement
                              netWeightInput?.focus()
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            netWeightInputRefs.current[index] = el
                          }}
                          type="number"
                          step="0.01"
                          value={row.netweight || ""}
                          onChange={(e) => handleFieldChange(index, "netweight", parseFloat(e.target.value) || 0)}
                          placeholder="Net Weight"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // If empty and not first row, copy from above
                              if ((!row.netweight || row.netweight === 0) && index > 0) {
                                copyValueFromAbove(index, "netweight")
                              }
                              // Move to next field (Gross Weight)
                              setTimeout(() => {
                                grossWeightInputRefs.current[index]?.focus()
                              }, 100)
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            grossWeightInputRefs.current[index] = el
                          }}
                          type="number"
                          step="0.01"
                          value={row.grossweight || ""}
                          onChange={(e) => handleFieldChange(index, "grossweight", parseFloat(e.target.value) || 0)}
                          placeholder="Gross Weight"
                          className="w-full h-8"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // If empty and not first row, copy from above
                              if ((!row.grossweight || row.grossweight === 0) && index > 0) {
                                const aboveRow = rollsStock[index - 1]
                                if (aboveRow?.grossweight !== undefined && aboveRow.grossweight !== null) {
                                  // Create updated row with copied grossweight
                                  const updatedRow = { ...row, grossweight: aboveRow.grossweight }
                                  // Update the state
                                  setRollsStock(prev => prev.map((r, i) => 
                                    i === index ? updatedRow : r
                                  ))
                                  // Save immediately with the updated row (pass it directly to avoid state timing issues)
                                  handleSaveRow(index, updatedRow)
                                  return
                                }
                              }
                              // Move to Save button or trigger save
                              handleSaveRow(index)
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveRow(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelEdit(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-center py-1 px-2">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-1 px-2">{row.itemCode} - {row.itemName}</TableCell>
                      <TableCell className="py-1 px-2">{row.rollno || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.size || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.micron || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.netweight || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.grossweight || "-"}</TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRow(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mt-4 flex items-center justify-end gap-6 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total Rolls:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100 font-semibold">{totalRolls}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total Net Weight:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100 font-semibold">
            {totalNetWeight.toFixed(2)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total Gross Weight:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100 font-semibold">
            {totalGrossWeight.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

