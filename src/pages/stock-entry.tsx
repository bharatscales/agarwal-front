import { useEffect, useRef, useState } from "react"
import { Plus, RefreshCw, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { DataTable } from "@/components/data-table"
import { getStockVoucherColumns, type StockVoucher } from "@/components/columns/stock-voucher-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { createStockVoucher, deleteStockVoucher, getStockVouchers } from "@/lib/stock-voucher-api"

type StockVoucherForm = {
  vendorId: string
  invoiceNo: string
  invoiceDate: string
}

type VendorOption = {
  id: number
  party_code: string
  party_name: string
  party_type: string
}

export default function StockEntry() {
  const navigate = useNavigate()
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<StockVoucherForm>({
    vendorId: "",
    invoiceNo: "",
    invoiceDate: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof StockVoucherForm, string>>>({})
  const [stockVouchers, setStockVouchers] = useState<StockVoucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])
  const [vendorSelectOptions, setVendorSelectOptions] = useState<CreatableOption[]>([])
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const fetchVendors = async () => {
    try {
      const response = await api.get<VendorOption[]>("/meta/party-vendors")
      setVendorOptions(response.data)
      setVendorSelectOptions(
        response.data.map((vendor) => ({
          value: vendor.id.toString(),
          label: vendor.party_code,
          description: `${vendor.party_name} (${vendor.party_type})`,
        }))
      )
    } catch (error) {
      console.error("Failed to load vendors:", error)
      setVendorOptions([])
      setVendorSelectOptions([])
    }
  }

  const handleRefresh = () => {
    fetchVendors()
    fetchStockVouchers()
  }

  const handleAddVoucher = () => {
    setIsAddVoucherOpen(true)
  }

  const handleInputChange = (field: keyof StockVoucherForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
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

    if (!formData.vendorId.trim()) {
      errors.vendorId = "Vendor is required"
    }
    if (!formData.invoiceNo.trim()) {
      errors.invoiceNo = "Invoice number is required"
    }
    if (!formData.invoiceDate.trim()) {
      errors.invoiceDate = "Invoice date is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    createStockVoucher({
      vendorId: Number(formData.vendorId),
      invoiceNo: formData.invoiceNo.trim(),
      invoiceDate: formData.invoiceDate,
    })
      .then((newVoucher) => {
        setStockVouchers(prev => [newVoucher, ...prev])
        setFormData({
          vendorId: "",
          invoiceNo: "",
          invoiceDate: "",
        })
        setFormErrors({})
        setIsAddVoucherOpen(false)
        navigate(`/manufacturing/stock-entry/${newVoucher.id}/stock`)
      })
      .catch((err) => {
        console.error("Error creating stock voucher:", err)
        setFormErrors({ invoiceNo: "Failed to create voucher. Please try again." })
      })
      .finally(() => setIsSubmitting(false))
  }

  const handleCloseModal = () => {
    setIsAddVoucherOpen(false)
    setFormData({
      vendorId: "",
      invoiceNo: "",
      invoiceDate: "",
    })
    setFormErrors({})
  }

  const handleDeleteVoucher = (voucher: StockVoucher) => {
    if (!window.confirm(`Delete stock voucher #${voucher.id}? This cannot be undone.`)) {
      return
    }
    deleteStockVoucher(voucher.id)
      .then(() => {
        setStockVouchers(prev => prev.filter(row => row.id !== voucher.id))
      })
      .catch((err) => {
        console.error("Error deleting stock voucher:", err)
        setError("Failed to delete stock voucher. Please try again.")
      })
  }

  const fetchStockVouchers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getStockVouchers()
      setStockVouchers(data)
    } catch (err: any) {
      console.error("Error fetching stock vouchers:", err)
      setError("Failed to fetch stock vouchers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
    fetchStockVouchers()
  }, [])

  useEffect(() => {
    if (isAddVoucherOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddVoucherOpen])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Stock Entry</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage stock entries.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddVoucher} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Stock Voucher</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading stock vouchers...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Stock Vouchers
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
            columns={getStockVoucherColumns({
              onEdit: () => {},
              onDelete: handleDeleteVoucher,
            })}
            data={stockVouchers}
            onRowClick={(voucher) => {
              navigate(`/manufacturing/stock-entry/${voucher.id}/stock`)
            }}
          />
        </div>
      )}

      {stockVouchers.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No stock vouchers found. Create your first voucher to get started.
          </p>
        </div>
      )}

      {isAddVoucherOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add Stock Voucher</CardTitle>
                <CardDescription>
                  Create a new stock voucher entry.
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
                    {formErrors.vendorId && (
                      <p className="text-sm text-red-500">{formErrors.vendorId}</p>
                    )}
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
                    {formErrors.invoiceNo && (
                      <p className="text-sm text-red-500">{formErrors.invoiceNo}</p>
                    )}
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
                    {formErrors.invoiceDate && (
                      <p className="text-sm text-red-500">{formErrors.invoiceDate}</p>
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  Create Voucher
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

