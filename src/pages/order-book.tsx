import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, RefreshCw, Search, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getOrderBookColumns, type OrderBookMaster } from "@/components/columns/order-book-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getPartyCustomers } from "@/lib/party-api"
import { getItemBom, getItemsFgVarietyByParty, specsFromFgBom } from "@/lib/item-api"
import { deleteOrderBook, getAllOrderBooks, updateOrderBook } from "@/lib/order-book-api"
import { OrderBookCreateDialog } from "@/components/order-book-create-dialog"
import { OrderBookDispatchDialog } from "@/components/order-book-dispatch-dialog"
import {
  OrderBookSpecFields,
  parseOptionalInt,
  parseOptionalNumber,
  type OrderBookSpecFieldsValue,
} from "@/components/order-book-spec-fields"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"

type OrderBookForm = {
  partyId: string
  itemId: string
  qty: string
  orderDate: string
  poNo: string
} & OrderBookSpecFieldsValue

const todayIso = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const emptyForm = (): OrderBookForm => ({
  partyId: "",
  itemId: "",
  qty: "",
  orderDate: todayIso(),
  poNo: "",
  totalGsm: "",
  size: "",
  structure: "",
  coilWidth: "",
  repeatLength: "",
  noOfPanel: "",
})

export default function OrderBook() {
  const navigate = useNavigate()
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<number | null>(null)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const [orders, setOrders] = useState<OrderBookMaster[]>([])
  const [orderNumberSearch, setOrderNumberSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<OrderBookForm>(emptyForm())
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof OrderBookForm, string>>>({})
  const [dispatchOrder, setDispatchOrder] = useState<OrderBookMaster | null>(null)

  const handleRefresh = () => {
    fetchOrders()
  }

  const handleAddOrder = () => {
    setIsAddOrderOpen(true)
  }

  const handleEditOrderOpen = (order: OrderBookMaster) => {
    setEditOrderId(order.id)
    setEditFormData({
      partyId: order.partyId?.toString() || "",
      itemId: order.itemId?.toString() || "",
      qty: order.qty?.toString() || "",
      orderDate: order.orderDate ? order.orderDate.slice(0, 10) : "",
      poNo: order.poNo || "",
      totalGsm: order.totalGsm != null ? String(order.totalGsm) : "",
      size: order.size != null ? String(order.size) : "",
      structure: order.structure || "",
      coilWidth: order.coilWidth != null ? String(order.coilWidth) : "",
      repeatLength: order.repeatLength != null ? String(order.repeatLength) : "",
      noOfPanel: order.noOfPanel != null ? String(order.noOfPanel) : "",
    })
    setEditErrors({})
    setIsEditOrderOpen(true)
  }

  const handleEditInputChange = (field: keyof OrderBookForm, value: string) => {
    setEditFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "partyId") {
        next.itemId = ""
        next.totalGsm = ""
        next.size = ""
        next.structure = ""
      }
      if (field === "itemId" && value !== prev.itemId) {
        next.totalGsm = ""
        next.size = ""
        next.structure = ""
      }
      return next
    })
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof OrderBookForm, string>> = {}
    if (!editFormData.partyId.trim()) errors.partyId = "Party is required"
    if (!editFormData.itemId.trim()) errors.itemId = "Item is required"
    if (!editFormData.qty.trim()) {
      errors.qty = "Quantity is required"
    } else {
      const qty = parseFloat(editFormData.qty)
      if (isNaN(qty) || qty <= 0) {
        errors.qty = "Quantity must be a positive number"
      }
    }
    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editOrderId || !validateEditForm()) return

    updateOrderBook(editOrderId, {
      partyId: parseInt(editFormData.partyId),
      itemId: parseInt(editFormData.itemId),
      qty: parseFloat(editFormData.qty),
      orderDate: editFormData.orderDate.trim() || null,
      poNo: editFormData.poNo.trim() || null,
      totalGsm: parseOptionalNumber(editFormData.totalGsm),
      size: parseOptionalNumber(editFormData.size),
      structure: editFormData.structure.trim() || null,
      coilWidth: parseOptionalNumber(editFormData.coilWidth),
      repeatLength: parseOptionalNumber(editFormData.repeatLength),
      noOfPanel: parseOptionalInt(editFormData.noOfPanel),
    })
      .then((updated) => {
        setOrders((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating order:", err)
        const errorMsg = err.response?.data?.detail || "Failed to update order. Please try again."
        setEditErrors({ partyId: errorMsg })
      })
  }

  const handleDeleteOrder = (order: OrderBookMaster) => {
    if (!window.confirm(`Delete order "${order.orderNumber || order.id}"? This cannot be undone.`)) {
      return
    }
    deleteOrderBook(order.id)
      .then(() => {
        setOrders((prev) => prev.filter((row) => row.id !== order.id))
      })
      .catch((err) => {
        console.error("Error deleting order:", err)
        setError("Failed to delete order. Please try again.")
      })
  }

  const handleCloseEditModal = () => {
    setIsEditOrderOpen(false)
    setEditOrderId(null)
    setEditFormData(emptyForm())
    setEditErrors({})
  }

  const fetchParties = async () => {
    try {
      const data = await getPartyCustomers()
      setPartyOptions(
        data.map((p) => ({
          value: p.id.toString(),
          label: p.partyCode,
        }))
      )
    } catch (err) {
      console.error("Failed to load parties:", err)
    }
  }

  const fetchItemsForParty = async (partyId: number) => {
    try {
      const data = await getItemsFgVarietyByParty(partyId)
      setItemOptions(
        data.map((i) => ({
          value: i.id.toString(),
          label: i.itemCode,
        }))
      )
    } catch (err) {
      console.error("Failed to load items for party:", err)
      setItemOptions([])
    }
  }

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllOrderBooks()
      setOrders(data)
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError("Failed to fetch orders. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParties()
    fetchOrders()
  }, [])

  useEffect(() => {
    if (isEditOrderOpen && editFormData.partyId) {
      fetchItemsForParty(parseInt(editFormData.partyId, 10))
    }
  }, [isEditOrderOpen, editFormData.partyId])

  useEffect(() => {
    if (!isEditOrderOpen || !editFormData.itemId) return
    const itemId = editFormData.itemId
    let cancelled = false
    getItemBom(parseInt(itemId, 10))
      .then((lines) => {
        if (cancelled) return
        const specs = specsFromFgBom(lines)
        setEditFormData((prev) =>
          prev.itemId === itemId
            ? {
                ...prev,
                totalGsm: prev.totalGsm || specs.totalGsm,
                size: prev.size || specs.size,
                structure: prev.structure || specs.structure,
              }
            : prev
        )
      })
      .catch(() => {
        /* keep existing spec values if BOM is unavailable */
      })
    return () => {
      cancelled = true
    }
  }, [isEditOrderOpen, editFormData.itemId])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold shrink-0">Order Book</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 left-3" />
              <Input
                type="text"
                placeholder="Order number"
                value={orderNumberSearch}
                onChange={(e) => setOrderNumberSearch(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddOrder} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Order</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Orders
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
            size="xs"
            compact
            columns={getOrderBookColumns({
              onEdit: handleEditOrderOpen,
              onDispatch: setDispatchOrder,
              onDelete: handleDeleteOrder,
            })}
            data={orders.filter((order) => {
              if (!orderNumberSearch.trim()) return true
              const q = orderNumberSearch.trim().toLowerCase()
              const num = (order.orderNumber ?? "").toString().toLowerCase()
              const po = (order.poNo ?? "").toString().toLowerCase()
              return num.includes(q) || po.includes(q)
            })}
            onRowClick={(order) => navigate(`/manufacturing/order-book/${order.id}`)}
          />
        </div>
      )}

      {orders.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No orders found. Create your first order to get started.
          </p>
        </div>
      )}

      <OrderBookCreateDialog
        open={isAddOrderOpen}
        onOpenChange={setIsAddOrderOpen}
        onCreated={(newOrder) => {
          setOrders((prev) => [newOrder, ...prev])
        }}
      />

      <OrderBookDispatchDialog
        open={dispatchOrder != null}
        order={dispatchOrder}
        onOpenChange={(open) => {
          if (!open) setDispatchOrder(null)
        }}
        onDispatched={(updated) => {
          setOrders((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        }}
      />

      {isEditOrderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Order</CardTitle>
                <CardDescription>Update the order details.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseEditModal} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleEditSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-partyId">Party (Customer/Both) *</Label>
                    <CreatableCombobox
                      options={partyOptions}
                      value={editFormData.partyId || null}
                      onValueChange={(value) => handleEditInputChange("partyId", value ?? "")}
                      placeholder="Select party"
                      searchPlaceholder="Search party..."
                    />
                    {editErrors.partyId && (
                      <p className="text-sm text-red-500">{editErrors.partyId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-itemId">Item (FG Variety) *</Label>
                    <CreatableCombobox
                      options={itemOptions}
                      value={editFormData.itemId || null}
                      onValueChange={(value) => handleEditInputChange("itemId", value ?? "")}
                      placeholder="Select item"
                      searchPlaceholder="Search item..."
                    />
                    {editErrors.itemId && (
                      <p className="text-sm text-red-500">{editErrors.itemId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-orderDate">Order Date</Label>
                    <Input
                      id="edit-orderDate"
                      type="date"
                      value={editFormData.orderDate}
                      onChange={(e) => handleEditInputChange("orderDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-poNo">PO No.</Label>
                    <Input
                      id="edit-poNo"
                      type="text"
                      value={editFormData.poNo}
                      onChange={(e) => handleEditInputChange("poNo", e.target.value)}
                      placeholder="Enter PO number"
                    />
                  </div>
                </div>

                <OrderBookSpecFields
                  idPrefix="edit-"
                  value={editFormData}
                  onChange={(field, value) => handleEditInputChange(field, value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-qty">Quantity (KG) *</Label>
                    <Input
                      id="edit-qty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.qty}
                      onChange={(e) => handleEditInputChange("qty", e.target.value)}
                      placeholder="Enter quantity"
                      className={editErrors.qty ? "border-red-500" : ""}
                    />
                    {editErrors.qty && <p className="text-sm text-red-500">{editErrors.qty}</p>}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 mt-6">
                <Button type="button" variant="outline" onClick={handleCloseEditModal} className="flex-1">
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
