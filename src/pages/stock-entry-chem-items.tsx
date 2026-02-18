import { useEffect, useState, useRef } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { ChevronRight, Trash2, Edit, X, Check, ChevronDown, Printer } from "lucide-react"
import { getStockVoucher } from "@/lib/stock-voucher-api"
import { getChemStockByVoucher, createChemStock, updateChemStock, deleteChemStock, type ChemStockPayload } from "@/lib/chem-stock-api"
import { getItems, createItem, type Item } from "@/lib/item-api"
import { getAllTemplates, type TemplateMaster } from "@/lib/template-api"
import { createPrintJob, getPrintJob } from "@/lib/print-job-api"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSidebar } from "@/components/ui/sidebar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ChemStockRow = {
  id?: number
  itemId: number
  itemCode: string
  itemName: string
  color: string
  qty: number
  uomId: number
  uom: string
  isEditing?: boolean
}

export default function StockEntryChemItems() {
  const location = useLocation()
  // Extract voucher ID from URL path like /manufacturing/stock-entry/123/chem
  const pathParts = location.pathname.split('/').filter(Boolean)
  const stockEntryIndex = pathParts.indexOf('stock-entry')
  const voucherId = stockEntryIndex >= 0 && pathParts[stockEntryIndex + 1] ? pathParts[stockEntryIndex + 1] : null
  const navigate = useNavigate()
  const { state: sidebarState, isMobile } = useSidebar()
  const [isLoading, setIsLoading] = useState(true)
  const [chemStock, setChemStock] = useState<ChemStockRow[]>([{
    itemId: 0,
    itemCode: "",
    itemName: "",
    color: "",
    qty: 0,
    uomId: 0,
    uom: "",
    isEditing: true,
  }])
  const [items, setItems] = useState<Item[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const [uomMap, setUomMap] = useState<Map<string, number>>(new Map())
  const [uomOptions, setUomOptions] = useState<Array<{ value: string; label: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateMaster | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [stockVoucher, setStockVoucher] = useState<any>(null)
  const [printerName, setPrinterName] = useState<string>("")
  const [printerAvailable, setPrinterAvailable] = useState<boolean>(false)
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false)
  const [printStatus, setPrintStatus] = useState<"idle" | "printing" | "done">("idle")
  const [_currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const fetchChemStock = async () => {
    if (!voucherId) return
    try {
      const data = await getChemStockByVoucher(Number(voucherId))
      const existingRows = data.map(cs => ({
        id: cs.id,
        itemId: cs.itemId,
        itemCode: cs.itemCode,
        itemName: cs.itemName,
        color: cs.color || "",
        qty: cs.qty || 0,
        uomId: cs.uomId || 0,
        uom: cs.uom || "",
        isEditing: false,
      }))
      setChemStock([...existingRows, {
        itemId: 0,
        itemCode: "",
        itemName: "",
        color: "",
        qty: 0,
        uomId: 0,
        uom: "",
        isEditing: true,
      }])
      setSelectedRows(new Set())
    } catch (err: any) {
      console.error("Error fetching chem stock:", err)
      const errorMsg = err.response?.data?.detail || err.message || "Failed to load chem stock"
      setError(errorMsg)
      setChemStock([{
        itemId: 0,
        itemCode: "",
        itemName: "",
        color: "",
        qty: 0,
        uomId: 0,
        uom: "",
        isEditing: true,
      }])
      setSelectedRows(new Set())
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
    }
  }

  const getUomId = (uomName: string): number | undefined => {
    if (!uomName.trim()) return undefined
    return uomMap.get(uomName.trim())
  }

  const fetchItems = async () => {
    try {
      const data = await getItems()
      const filteredItems = data.filter(item => item.itemGroup === "rm ink/adhesive/chemicals")
      setItems(filteredItems)
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

  const fetchTemplates = async () => {
    try {
      const data = await getAllTemplates()
      // Find template with default_form = "stock_ink_stk"
      const inkStockTemplate = data.find(template => template.defaultForm === "stock_ink_stk")
      if (inkStockTemplate) {
        setDefaultTemplate(inkStockTemplate)
      }
    } catch (err: any) {
      console.error("Error fetching templates:", err)
    }
  }

  const fetchDefaultPrinter = async () => {
    try {
      const response = await api.get<{ 
        available: boolean
        name: string | null
        device_id: string | null
        websocket_connected: boolean
      }>("/printer/default/zpl/status")
      
      if (response.data.available && response.data.name) {
        setPrinterName(response.data.name)
        setPrinterAvailable(true)
        setWebsocketConnected(response.data.websocket_connected)
      } else {
        setPrinterName("Not available")
        setPrinterAvailable(false)
        setWebsocketConnected(false)
      }
    } catch (err: any) {
      console.error("Error fetching default printer status:", err)
      setPrinterName("Not available")
      setPrinterAvailable(false)
      setWebsocketConnected(false)
    }
  }

  useEffect(() => {
    if (voucherId) {
      Promise.all([
        getStockVoucher(Number(voucherId)).then(voucher => {
          setStockVoucher(voucher)
          if (voucher.stockType && voucher.stockType !== "ink/adhesive/chemical") {
            setError(`This page only handles "Ink/Adhesive/Chemical" stock type. This voucher is for "${voucher.stockType}".`)
            setIsLoading(false)
            return voucher
          }
          return voucher
        }),
        fetchUomsWithIds(),
        fetchItems(),
        fetchChemStock(),
        fetchTemplates(),
        fetchDefaultPrinter(),
      ])
        .catch((err) => {
          console.error("Error fetching data:", err)
          navigate("/manufacturing/stock-entry")
        })
        .finally(() => setIsLoading(false))
    }
  }, [voucherId, navigate])

  // Poll for printer and websocket status periodically
  useEffect(() => {
    if (!voucherId) return

    // Initial fetch
    fetchDefaultPrinter()

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchDefaultPrinter()
    }, 5000)

    return () => clearInterval(interval)
  }, [voucherId])

  useEffect(() => {
    if (!isLoading && chemStock.length > 0) {
      const lastIndex = chemStock.length - 1
      const lastRow = chemStock[lastIndex]
      if (lastRow.isEditing && lastRow.itemId === 0) {
        setTimeout(() => {
          itemInputRefs.current[lastIndex]?.focus()
        }, 200)
      }
    }
  }, [isLoading, chemStock.length])

  const handleEditRow = (index: number) => {
    setChemStock(prev => prev.map((row, i) => 
      i === index ? { ...row, isEditing: true } : row
    ))
  }

  const handleCancelEdit = (index: number) => {
    const row = chemStock[index]
    if (row.id) {
      setChemStock(prev => prev.map((r, i) => 
        i === index ? { ...r, isEditing: false } : r
      ))
    } else {
      setChemStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            isEditing: true,
          }]
        }
        return filtered
      })
    }
  }

  const handleSaveRow = async (index: number, overrideRow?: ChemStockRow) => {
    if (!voucherId) return
    
    const row = overrideRow || chemStock[index]
    if (!row.itemId) {
      setError("Please select an item")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: ChemStockPayload = {
        itemId: row.itemId,
        color: row.color || undefined,
        qty: row.qty !== 0 ? row.qty : undefined,
        uomId: row.uomId || undefined,
        stockVoucherId: Number(voucherId),
      }

      if (row.id) {
        const updated = await updateChemStock(row.id, payload)
        setChemStock(prev => {
          const updatedRows = prev.map((r, i) => 
            i === index ? {
              id: updated.id,
              itemId: updated.itemId,
              itemCode: updated.itemCode,
              itemName: updated.itemName,
              color: updated.color,
              qty: updated.qty,
              uomId: updated.uomId,
              uom: updated.uom,
              isEditing: false,
            } : r
          )
          const hasEmptyRow = updatedRows.some(r => !r.id && r.isEditing)
          if (!hasEmptyRow) {
            return [...updatedRows, {
              itemId: 0,
              itemCode: "",
              itemName: "",
              color: "",
              qty: 0,
              uomId: 0,
              uom: "",
              isEditing: true,
            }]
          }
          return updatedRows
        })
      } else {
        const created = await createChemStock(payload)
        setChemStock(prev => {
          const updatedRows = prev.map((r, i) => 
            i === index ? {
              id: created.id,
              itemId: created.itemId,
              itemCode: created.itemCode,
              itemName: created.itemName,
              color: created.color,
              qty: created.qty,
              uomId: created.uomId,
              uom: created.uom,
              isEditing: false,
            } : r
          )
          return [...updatedRows, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            isEditing: true,
          }]
        })
      }
    } catch (err: any) {
      console.error("Error saving chem stock:", err)
      setError("Failed to save chem stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRow = async (index: number) => {
    const row = chemStock[index]
    if (!row.id) {
      setChemStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            isEditing: true,
          }]
        }
        return filtered
      })
      return
    }

    if (!window.confirm("Delete this entry?")) return

    setIsSubmitting(true)
    try {
      await deleteChemStock(row.id)
      setChemStock(prev => {
        const filtered = prev.filter((_, i) => i !== index)
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            isEditing: true,
          }]
        }
        return filtered
      })
      setSelectedRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(row.id!)
        return newSet
      })
    } catch (err: any) {
      console.error("Error deleting chem stock:", err)
      setError("Failed to delete chem stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) {
      alert("Please select at least one row to delete")
      return
    }

    if (!window.confirm(`Delete ${selectedRows.size} selected entr${selectedRows.size === 1 ? 'y' : 'ies'}?`)) return

    setIsSubmitting(true)
    try {
      const deletePromises = Array.from(selectedRows).map(id => deleteChemStock(id))
      await Promise.all(deletePromises)
      
      setChemStock(prev => {
        const filtered = prev.filter(row => !row.id || !selectedRows.has(row.id))
        const hasEmptyRow = filtered.some(r => !r.id && r.isEditing)
        if (!hasEmptyRow) {
          return [...filtered, {
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            isEditing: true,
          }]
        }
        return filtered
      })
      
      setSelectedRows(new Set())
    } catch (err: any) {
      console.error("Error deleting chem stock:", err)
      setError("Failed to delete selected chem stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintClick = async (row: ChemStockRow) => {
    if (!row.id) {
      alert("Please save the row before printing")
      return
    }

    if (!defaultTemplate) {
      alert("No default template found. Please create a template with default form 'Stock Ink STK'.")
      return
    }

    setIsPrinting(true)
    try {
      const printData = {
        // Chem stock details
        itemCode: row.itemCode,
        itemName: row.itemName,
        color: row.color || "",
        qty: row.qty,
        uom: row.uom || "",
        // Stock voucher details
        stockVoucher: stockVoucher ? {
          id: stockVoucher.id,
          vendor: stockVoucher.vendor,
          vendorId: stockVoucher.vendorId,
          invoiceNo: stockVoucher.invoiceNo,
          invoiceDate: stockVoucher.invoiceDate,
          stockType: stockVoucher.stockType,
        } : null,
      }

      const job = await createPrintJob({
        name: `Chem Stock - ${row.itemCode || row.itemName}`,
        template_id: defaultTemplate.id,
        data: printData,
        copies: 1,
      })

      // Set status to printing and start polling
      setCurrentJobId(job.id)
      setPrintStatus("printing")
      
      // Poll for job status
      let pollCount = 0
      const maxPolls = 30 // 30 seconds max
      const pollInterval = setInterval(async () => {
        pollCount++
        try {
          const updatedJob = await getPrintJob(job.id)
          if (updatedJob.status === "done") {
            clearInterval(pollInterval)
            setPrintStatus("done")
            // Show "done" for 3 seconds, then set to "idle"
            setTimeout(() => {
              setPrintStatus("idle")
              setCurrentJobId(null)
            }, 3000)
          } else if (updatedJob.status === "failed") {
            clearInterval(pollInterval)
            setPrintStatus("idle")
            setCurrentJobId(null)
          } else if (pollCount >= maxPolls) {
            // Timeout after 30 seconds
            clearInterval(pollInterval)
            setPrintStatus("idle")
            setCurrentJobId(null)
          }
        } catch (err) {
          console.error("Error polling print job status:", err)
          clearInterval(pollInterval)
          setPrintStatus("idle")
          setCurrentJobId(null)
        }
      }, 1000) // Poll every second
    } catch (err: any) {
      console.error("Error creating print job:", err)
      setPrintStatus("idle")
      setCurrentJobId(null)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleBulkPrint = async () => {
    if (selectedRows.size === 0) {
      alert("Please select at least one row to print")
      return
    }

    if (!defaultTemplate) {
      alert("No default template found. Please create a template with default form 'Stock Ink STK'.")
      return
    }

    if (!window.confirm(`Print ${selectedRows.size} selected entr${selectedRows.size === 1 ? 'y' : 'ies'}?`)) return

    setIsPrinting(true)
    try {
      // Get selected rows
      const selectedRowsData = chemStock.filter(row => row.id && selectedRows.has(row.id))
      
      // Create print jobs for all selected rows
      const printPromises = selectedRowsData.map(row => {
        const printData = {
          itemCode: row.itemCode,
          itemName: row.itemName,
          color: row.color || "",
          qty: row.qty,
          uom: row.uom || "",
          stockVoucher: stockVoucher ? {
            id: stockVoucher.id,
            vendor: stockVoucher.vendor,
            vendorId: stockVoucher.vendorId,
            invoiceNo: stockVoucher.invoiceNo,
            invoiceDate: stockVoucher.invoiceDate,
            stockType: stockVoucher.stockType,
          } : null,
        }

        return createPrintJob({
          name: `Chem Stock - ${row.itemCode || row.itemName}`,
          template_id: defaultTemplate.id,
          data: printData,
          copies: 1,
        })
      })

      await Promise.all(printPromises)
      
      setPrintStatus("printing")
      
      // Poll for job status (simplified - just show printing status)
      setTimeout(() => {
        setPrintStatus("done")
        setTimeout(() => {
          setPrintStatus("idle")
        }, 3000)
      }, 2000)
    } catch (err: any) {
      console.error("Error creating print jobs:", err)
      setError("Failed to print selected chem stock")
      setPrintStatus("idle")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleToggleRowSelection = (rowId: number | undefined) => {
    if (!rowId) return
    
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const savedRows = chemStock.filter(row => row.id && !row.isEditing)
    const allSelected = savedRows.every(row => row.id && selectedRows.has(row.id))
    
    if (allSelected) {
      setSelectedRows(new Set())
    } else {
      const allIds = new Set(savedRows.map(row => row.id!).filter(id => id !== undefined))
      setSelectedRows(allIds)
    }
  }

  const handleCreateItem = async (itemCode: string, index: number) => {
    if (!itemCode.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const defaultUom = uomMap.has("Nos") ? "Nos" : Array.from(uomMap.keys())[0] || "Nos"
      const uomId = getUomId(defaultUom)

      const newItem = await createItem({
        itemCode: itemCode.trim(),
        itemName: itemCode.trim(),
        itemGroup: "rm ink/adhesive/chemicals",
        uomId: uomId,
      })

      setItems(prev => [...prev, newItem])
      
      setItemOptions(prev => [...prev, {
        value: newItem.id.toString(),
        label: newItem.itemCode,
        description: newItem.itemName,
      }])

      handleFieldChange(index, "itemId", newItem.id.toString())
      
      setTimeout(() => {
        colorInputRefs.current[index]?.focus()
      }, 100)
    } catch (err: any) {
      console.error("Error creating item:", err)
      const errorMsg = err.response?.data?.detail || "Failed to create item. Please try again."
      setError(errorMsg)
      setChemStock(prev => prev.map((r, i) => 
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

  const handleFieldChange = (index: number, field: keyof ChemStockRow, value: any) => {
    if (field === "itemId") {
      const itemId = typeof value === "string" ? Number(value) : value
      const item = items.find(i => i.id === itemId)
      setChemStock(prev => prev.map((r, i) => 
        i === index ? { 
          ...r, 
          itemId: itemId, 
          itemCode: item?.itemCode || "",
          itemName: item?.itemName || "",
        } : r
      ))
    } else if (field === "uom") {
      const uomId = getUomId(value) || 0
      setChemStock(prev => prev.map((r, i) => 
        i === index ? { ...r, uom: value, uomId: uomId } : r
      ))
    } else {
      setChemStock(prev => prev.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      ))
    }
  }

  const handleItemKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter") return
    
    e.preventDefault()
    
    const input = e.currentTarget as HTMLInputElement
    const searchValue = input.value.trim()
    
    if (!searchValue) {
      const currentRow = chemStock[index]
      if (index > 0 && !currentRow?.itemId) {
        const aboveRow = chemStock[index - 1]
        if (aboveRow?.itemId) {
          handleFieldChange(index, "itemId", aboveRow.itemId.toString())
          setTimeout(() => {
            colorInputRefs.current[index]?.focus()
          }, 100)
          return
        }
      }
      if (itemOptions.length > 0) {
        handleFieldChange(index, "itemId", itemOptions[0].value)
        setTimeout(() => {
          colorInputRefs.current[index]?.focus()
        }, 100)
      }
      return
    }

    const filtered = itemOptions.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchValue.toLowerCase())
    )

    if (filtered.length > 0) {
      handleFieldChange(index, "itemId", filtered[0].value)
      setTimeout(() => {
        colorInputRefs.current[index]?.focus()
      }, 100)
    } else {
      await handleCreateItem(searchValue, index)
      setTimeout(() => {
        colorInputRefs.current[index]?.focus()
      }, 200)
    }
  }

  const savedRows = chemStock.filter(row => row.id)
  const totalItems = savedRows.length
  const totalQty = savedRows.reduce((sum, row) => sum + (row.qty || 0), 0)

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
    <div className="px-6 pt-2 pb-10">
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
          <h1 className="text-lg sm:text-xl font-bold">Ink/Adhesive/Chemical Stock Entry</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={selectedRows.size === 0 || isSubmitting}
              >
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={handleBulkPrint}
                disabled={selectedRows.size === 0 || isSubmitting || isPrinting || !defaultTemplate}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Selected ({selectedRows.size})
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleBulkDelete}
                disabled={selectedRows.size === 0 || isSubmitting}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.size})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRows.size} row{selectedRows.size === 1 ? '' : 's'} selected
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
        <div className="overflow-y-auto flex-1 relative">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
              <TableRow className="h-auto">
                <TableHead className="w-12 bg-background py-1 px-2">
                  <Checkbox
                    checked={(() => {
                      const savedRows = chemStock.filter(row => row.id && !row.isEditing)
                      return savedRows.length > 0 && savedRows.every(row => row.id && selectedRows.has(row.id))
                    })()}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16 bg-background py-1 px-2">S.No</TableHead>
                <TableHead className="bg-background py-1 px-2">Item</TableHead>
                <TableHead className="bg-background py-1 px-2">Color</TableHead>
                <TableHead className="bg-background py-1 px-2">Quantity</TableHead>
                <TableHead className="bg-background py-1 px-2">UOM</TableHead>
                <TableHead className="w-24 bg-background py-1 px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chemStock.map((row, index) => (
                <TableRow key={row.id || `new-${index}`} className="h-auto">
                  {row.isEditing ? (
                    <>
                      <TableCell className="py-1 px-2"></TableCell>
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
                            colorInputRefs.current[index] = el
                          }}
                          value={row.color}
                          onChange={(e) => handleFieldChange(index, "color", e.target.value)}
                          placeholder="Color"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              qtyInputRefs.current[index]?.focus()
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input
                          ref={(el) => {
                            qtyInputRefs.current[index] = el
                          }}
                          type="number"
                          step="0.01"
                          value={row.qty || ""}
                          onChange={(e) => handleFieldChange(index, "qty", parseFloat(e.target.value) || 0)}
                          placeholder="Quantity"
                          className="w-full h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleSaveRow(index)
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Select
                          value={row.uom || undefined}
                          onValueChange={(value) => handleFieldChange(index, "uom", value)}
                        >
                          <SelectTrigger className="w-full h-8">
                            <SelectValue placeholder="Select UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uomOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <TableCell className="py-1 px-2">
                        <Checkbox
                          checked={row.id ? selectedRows.has(row.id) : false}
                          onCheckedChange={() => handleToggleRowSelection(row.id)}
                        />
                      </TableCell>
                      <TableCell className="text-center py-1 px-2">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-1 px-2">{row.itemCode} - {row.itemName}</TableCell>
                      <TableCell className="py-1 px-2">{row.color || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.qty || "-"}</TableCell>
                      <TableCell className="py-1 px-2">{row.uom || "-"}</TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRow(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintClick(row)}
                            disabled={isSubmitting || !row.id || isPrinting || !defaultTemplate}
                            className="h-7 w-7 p-0"
                            title="Print"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(index)}
                            disabled={isSubmitting}
                            className="h-7 w-7 p-0"
                            title="Delete"
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

      <div className="mt-4 flex items-center justify-end gap-6 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total Items:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100 font-semibold">{totalItems}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total Quantity:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100 font-semibold">
            {totalQty.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Print Status Bar */}
      <div 
        className="fixed bottom-0 h-7 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 z-50 transition-all duration-200"
        style={{
          left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
          right: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Printer:</span>
          <span className="text-xs text-gray-900 dark:text-gray-100 font-semibold">{printerName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Status:</span>
          <span className={`text-xs font-semibold ${
            !printerAvailable
              ? "text-red-600 dark:text-red-400"
              : printStatus === "printing" 
              ? "text-blue-600 dark:text-blue-400" 
              : printStatus === "done" 
              ? "text-green-600 dark:text-green-400" 
              : websocketConnected
              ? "text-gray-600 dark:text-gray-400"
              : "text-yellow-600 dark:text-yellow-400"
          }`}>
            {!printerAvailable
              ? "Not available"
              : printStatus === "printing" 
              ? "Printing..." 
              : printStatus === "done" 
              ? "Done" 
              : websocketConnected
              ? "Idle"
              : "Poll"}
          </span>
        </div>
      </div>
    </div>
  )
}

