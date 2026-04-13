import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { createStockVoucher, updateStockVoucher } from "@/lib/stock-voucher-api"
import { STOCK_TYPE_OPTIONS } from "@/lib/enums"
import type { StockVoucher } from "@/components/columns/stock-voucher-columns"

type StockVoucherForm = {
  vendorId: string
  invoiceNo: string
  invoiceDate: string
  stockType: string
}

const emptyForm = (vendorId = ""): StockVoucherForm => ({
  vendorId,
  invoiceNo: "",
  invoiceDate: "",
  stockType: "",
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  /** When adding from a party drill-down page, pre-fill vendor */
  initialVendorId?: string
  editingVoucher?: StockVoucher | null
  vendorSelectOptions: CreatableOption[]
  onSuccess: (voucher: StockVoucher, action: "add" | "edit") => void
}

export function StockVoucherFormDialog({
  open,
  onOpenChange,
  mode,
  initialVendorId = "",
  editingVoucher,
  vendorSelectOptions,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<StockVoucherForm>(emptyForm())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof StockVoucherForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && editingVoucher) {
      setFormData({
        vendorId: editingVoucher.vendorId.toString(),
        invoiceNo: editingVoucher.invoiceNo,
        invoiceDate: editingVoucher.invoiceDate,
        stockType: editingVoucher.stockType,
      })
    } else {
      setFormData(emptyForm(initialVendorId))
    }
    setFormErrors({})
  }, [open, mode, editingVoucher, initialVendorId])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [open])

  const handleInputChange = (field: keyof StockVoucherForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEnterKey = (event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>, index: number) => {
    if (event.key !== "Enter") return
    const nextField = addFieldRefs.current[index + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof StockVoucherForm, string>> = {}
    if (!formData.vendorId.trim()) errors.vendorId = "Vendor is required"
    if (!formData.invoiceNo.trim()) errors.invoiceNo = "Invoice number is required"
    if (!formData.invoiceDate.trim()) errors.invoiceDate = "Invoice date is required"
    if (!formData.stockType.trim()) errors.stockType = "Stock type is required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    const payload = {
      vendorId: Number(formData.vendorId),
      invoiceNo: formData.invoiceNo.trim(),
      invoiceDate: formData.invoiceDate,
      stockType: formData.stockType.trim(),
    }

    const promise =
      mode === "edit" && editingVoucher
        ? updateStockVoucher(editingVoucher.id, payload)
        : createStockVoucher(payload)

    promise
      .then((voucher) => {
        onSuccess(voucher, mode === "edit" ? "edit" : "add")
        onOpenChange(false)
      })
      .catch((err) => {
        console.error("Error saving stock voucher:", err)
        setFormErrors({ invoiceNo: "Failed to save voucher. Please try again." })
      })
      .finally(() => setIsSubmitting(false))
  }

  const handleClose = () => {
    onOpenChange(false)
    setFormErrors({})
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{mode === "edit" ? "Edit Stock Voucher" : "Add Stock Voucher"}</CardTitle>
            <CardDescription>
              {mode === "edit" ? "Update stock voucher entry." : "Create a new stock voucher entry."}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <CreatableCombobox
                  options={vendorSelectOptions}
                  value={formData.vendorId || null}
                  onValueChange={(value) => handleInputChange("vendorId", value ?? "")}
                  placeholder="Select vendor"
                  searchPlaceholder="Search vendor..."
                  onInputKeyDown={(e) => handleEnterKey(e, 0)}
                  triggerRef={(el) => {
                    addFieldRefs.current[0] = el
                  }}
                />
                {formErrors.vendorId && <p className="text-sm text-red-500">{formErrors.vendorId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Invoice No *</Label>
                <Input
                  id="invoiceNo"
                  ref={(el) => {
                    addFieldRefs.current[1] = el
                  }}
                  value={formData.invoiceNo}
                  onChange={(e) => handleInputChange("invoiceNo", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 1)}
                  placeholder="Enter invoice number"
                  className={formErrors.invoiceNo ? "border-red-500" : ""}
                />
                {formErrors.invoiceNo && <p className="text-sm text-red-500">{formErrors.invoiceNo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  ref={(el) => {
                    addFieldRefs.current[2] = el
                  }}
                  value={formData.invoiceDate}
                  onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 2)}
                  className={formErrors.invoiceDate ? "border-red-500" : ""}
                />
                {formErrors.invoiceDate && <p className="text-sm text-red-500">{formErrors.invoiceDate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockType">Stock Type *</Label>
                <Select
                  value={formData.stockType ? formData.stockType : undefined}
                  onValueChange={(value) => handleInputChange("stockType", value || "")}
                >
                  <SelectTrigger
                    id="stockType"
                    ref={(el) => {
                      addFieldRefs.current[3] = el
                    }}
                    onKeyDown={(e) => handleEnterKey(e, 3)}
                    className={`w-full ${formErrors.stockType ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Select stock type" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.stockType && <p className="text-sm text-red-500">{formErrors.stockType}</p>}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {mode === "edit" ? "Update Voucher" : "Create Voucher"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
