import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

import type { OrderBookMaster } from "@/components/columns/order-book-columns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getItemBom, getItemsFgVarietyByParty, specsFromFgBom } from "@/lib/item-api"
import { getPartyCustomers } from "@/lib/party-api"
import { createOrderBook, ORDER_BOOK_STATUSES, type OrderBookStatus } from "@/lib/order-book-api"
import {
  OrderBookSpecFields,
  parseOptionalInt,
  parseOptionalNumber,
  type OrderBookSpecFieldsValue,
} from "@/components/order-book-spec-fields"

type OrderBookForm = {
  partyId: string
  itemId: string
  qty: string
  orderDate: string
  poNo: string
  status: OrderBookStatus
  remarks: string
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
  status: "pending",
  remarks: "",
  totalGsm: "",
  size: "",
  structure: "",
  coilWidth: "",
  repeatLength: "",
  noOfPanel: "",
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (order: OrderBookMaster) => void
}

export function OrderBookCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [formData, setFormData] = useState<OrderBookForm>(emptyForm())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrderBookForm, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | null>>([])

  useEffect(() => {
    if (!open) return
    setFormData(emptyForm())
    setFormErrors({})
    setItemOptions([])
    requestAnimationFrame(() => {
      addFieldRefs.current[0]?.focus()
    })

    const loadLookups = async () => {
      try {
        const parties = await getPartyCustomers()
        setPartyOptions(parties.map((p) => ({ value: p.id.toString(), label: p.partyCode })))
      } catch (error) {
        console.error("Failed to load party lookups:", error)
      }
    }
    void loadLookups()
  }, [open])

  useEffect(() => {
    if (!open || !formData.partyId) {
      if (!formData.partyId) setItemOptions([])
      return
    }
    const loadItems = async () => {
      try {
        const data = await getItemsFgVarietyByParty(parseInt(formData.partyId, 10))
        setItemOptions(data.map((i) => ({ value: i.id.toString(), label: i.itemCode })))
      } catch (error) {
        console.error("Failed to load items for party:", error)
        setItemOptions([])
      }
    }
    void loadItems()
  }, [open, formData.partyId])

  useEffect(() => {
    if (!open || !formData.itemId) return
    const itemId = formData.itemId
    let cancelled = false
    getItemBom(parseInt(itemId, 10))
      .then((lines) => {
        if (cancelled) return
        const specs = specsFromFgBom(lines)
        setFormData((prev) => (prev.itemId === itemId ? { ...prev, ...specs } : prev))
      })
      .catch(() => {
        if (!cancelled) {
          setFormData((prev) =>
            prev.itemId === itemId ? { ...prev, totalGsm: "", size: "", structure: "" } : prev
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, formData.itemId])

  const handleInputChange = (field: keyof OrderBookForm, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "partyId") {
        next.itemId = ""
        next.totalGsm = ""
        next.size = ""
        next.structure = ""
      }
      if (field === "itemId" && !value) {
        next.totalGsm = ""
        next.size = ""
        next.structure = ""
      }
      return next
    })
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEnterKey = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>,
    index: number
  ) => {
    if (event.key !== "Enter" || event.currentTarget.tagName === "TEXTAREA") return
    const nextField = addFieldRefs.current[index + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof OrderBookForm, string>> = {}
    if (!formData.partyId.trim()) errors.partyId = "Party is required"
    if (!formData.itemId.trim()) errors.itemId = "Item is required"
    if (!formData.qty.trim()) {
      errors.qty = "Quantity is required"
    } else {
      const qty = parseFloat(formData.qty)
      if (isNaN(qty) || qty <= 0) {
        errors.qty = "Quantity must be a positive number"
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    createOrderBook({
      partyId: parseInt(formData.partyId),
      itemId: parseInt(formData.itemId),
      qty: parseFloat(formData.qty),
      orderDate: formData.orderDate.trim() || null,
      poNo: formData.poNo.trim() || null,
      totalGsm: parseOptionalNumber(formData.totalGsm),
      size: parseOptionalNumber(formData.size),
      structure: formData.structure.trim() || null,
      coilWidth: parseOptionalNumber(formData.coilWidth),
      repeatLength: parseOptionalNumber(formData.repeatLength),
      noOfPanel: parseOptionalInt(formData.noOfPanel),
      status: formData.status,
      remarks: formData.remarks.trim() || null,
    })
      .then((newOrder) => {
        onCreated(newOrder)
        onOpenChange(false)
      })
      .catch((err) => {
        console.error("Error creating order:", err)
        const errorMsg = err.response?.data?.detail || "Failed to create order. Please try again."
        setFormErrors({ partyId: errorMsg })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Add New Order</CardTitle>
            <CardDescription>Record an order from a party.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partyId">Party (Customer/Both) *</Label>
                <CreatableCombobox
                  options={partyOptions}
                  value={formData.partyId || null}
                  onValueChange={(value) => handleInputChange("partyId", value ?? "")}
                  placeholder="Select party"
                  searchPlaceholder="Search party..."
                  triggerRef={(el) => {
                    addFieldRefs.current[0] = el
                  }}
                  onInputKeyDown={(e) => handleEnterKey(e, 0)}
                />
                {formErrors.partyId && <p className="text-sm text-red-500">{formErrors.partyId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemId">Item (FG Variety) *</Label>
                <CreatableCombobox
                  options={itemOptions}
                  value={formData.itemId || null}
                  onValueChange={(value) => handleInputChange("itemId", value ?? "")}
                  placeholder="Select item"
                  searchPlaceholder="Search item..."
                  triggerRef={(el) => {
                    addFieldRefs.current[1] = el
                  }}
                  onInputKeyDown={(e) => handleEnterKey(e, 1)}
                />
                {formErrors.itemId && <p className="text-sm text-red-500">{formErrors.itemId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  ref={(el) => {
                    addFieldRefs.current[2] = el
                  }}
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 2)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poNo">PO No.</Label>
                <Input
                  id="poNo"
                  type="text"
                  ref={(el) => {
                    addFieldRefs.current[3] = el
                  }}
                  value={formData.poNo}
                  onChange={(e) => handleInputChange("poNo", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 3)}
                  placeholder="Enter PO number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_BOOK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <OrderBookSpecFields
              value={formData}
              onChange={(field, value) => handleInputChange(field, value)}
              fieldRefs={addFieldRefs.current}
              startIndex={4}
              onEnterKey={handleEnterKey}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity (KG) *</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.01"
                  min="0"
                  ref={(el) => {
                    addFieldRefs.current[10] = el
                  }}
                  value={formData.qty}
                  onChange={(e) => handleInputChange("qty", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 10)}
                  placeholder="Enter quantity"
                  className={formErrors.qty ? "border-red-500" : ""}
                />
                {formErrors.qty && <p className="text-sm text-red-500">{formErrors.qty}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                ref={(el) => {
                  addFieldRefs.current[11] = el
                }}
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Order"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
