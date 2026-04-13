import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronRight, Plus, RefreshCw } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getStockVoucherColumns, type StockVoucher } from "@/components/columns/stock-voucher-columns"
import { Button } from "@/components/ui/button"
import api from "@/lib/axios"
import type { CreatableOption } from "@/components/ui/creatable-combobox"
import { deleteStockVoucher, getStockVouchers } from "@/lib/stock-voucher-api"
import { StockVoucherFormDialog } from "@/components/stock-voucher-form-dialog"

type VendorOption = {
  id: number
  party_code: string
  party_name: string
  party_type: string
}

export default function StockEntry() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const vendorFilterId = partyId ? Number(partyId) : NaN

  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false)
  const [isEditVoucherOpen, setIsEditVoucherOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<StockVoucher | null>(null)
  const [stockVouchers, setStockVouchers] = useState<StockVoucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendorSelectOptions, setVendorSelectOptions] = useState<CreatableOption[]>([])
  const [partyLabel, setPartyLabel] = useState<string>("")

  const loadPage = useCallback(async () => {
    if (!partyId || Number.isNaN(vendorFilterId)) {
      setError("Invalid party.")
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const [vendorsRes, vouchersData] = await Promise.all([
        api.get<VendorOption[]>("/meta/party-vendors"),
        getStockVouchers(0, 100, vendorFilterId),
      ])
      setVendorSelectOptions(
        vendorsRes.data.map((vendor) => ({
          value: vendor.id.toString(),
          label: vendor.party_code,
          description: `${vendor.party_name} (${vendor.party_type})`,
        }))
      )
      const v = vendorsRes.data.find((x) => x.id === vendorFilterId)
      setPartyLabel(v ? `${v.party_code} — ${v.party_name}` : `Party #${partyId}`)
      setStockVouchers(vouchersData)
    } catch (err: unknown) {
      console.error("Error loading stock entry party page:", err)
      setError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [partyId, vendorFilterId])

  const handleRefresh = () => {
    void loadPage()
  }

  const handleEditVoucher = (voucher: StockVoucher) => {
    setEditingVoucher(voucher)
    setIsEditVoucherOpen(true)
  }

  const handleDeleteVoucher = (voucher: StockVoucher) => {
    if (!window.confirm(`Delete stock voucher #${voucher.id}? This cannot be undone.`)) {
      return
    }
    deleteStockVoucher(voucher.id)
      .then(() => {
        setStockVouchers((prev) => prev.filter((row) => row.id !== voucher.id))
        setError(null)
      })
      .catch((err) => {
        console.error("Error deleting stock voucher:", err)
        setError("Failed to delete stock voucher. Please try again.")
      })
  }

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const handleFormSuccess = (voucher: StockVoucher, action: "add" | "edit") => {
    if (action === "edit") {
      setStockVouchers((prev) => prev.map((v) => (v.id === voucher.id ? voucher : v)))
      setIsEditVoucherOpen(false)
      setEditingVoucher(null)
      return
    }
    setStockVouchers((prev) => [voucher, ...prev])
    setIsAddVoucherOpen(false)
    if (voucher.stockType === "rolls") {
      navigate(`/manufacturing/stock-entry/${voucher.id}`)
    } else if (voucher.stockType === "ink/adhesive/chemical") {
      navigate(`/manufacturing/stock-entry/${voucher.id}/chem`)
    }
  }

  if (!partyId || Number.isNaN(vendorFilterId)) {
    return (
      <div className="px-6 pt-2 pb-6">
        <p className="text-red-600 dark:text-red-400">Missing or invalid party.</p>
        <Button asChild variant="link" className="mt-2 p-0 h-auto">
          <Link to="/manufacturing/stock-entry">Back to Stock Entry</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link to="/manufacturing/stock-entry" className="hover:text-gray-900 dark:hover:text-gray-100">
            Stock Entry
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="text-gray-900 dark:text-gray-100">{partyLabel || `Party #${partyId}`}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Stock vouchers</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Vouchers for this party.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => setIsAddVoucherOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Stock Voucher</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading stock vouchers...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Stock Vouchers</h3>
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
              onEdit: handleEditVoucher,
              onDelete: handleDeleteVoucher,
            })}
            data={stockVouchers}
            onRowClick={(voucher) => {
              if (voucher.stockType === "rolls") {
                navigate(`/manufacturing/stock-entry/${voucher.id}`)
              } else if (voucher.stockType === "ink/adhesive/chemical") {
                navigate(`/manufacturing/stock-entry/${voucher.id}/chem`)
              } else {
                alert(`Stock type "${voucher.stockType}" is not yet supported.`)
              }
            }}
          />
        </div>
      )}

      {stockVouchers.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No stock vouchers for this party. Create one to get started.
          </p>
        </div>
      )}

      <StockVoucherFormDialog
        open={isAddVoucherOpen}
        onOpenChange={setIsAddVoucherOpen}
        mode="add"
        initialVendorId={partyId}
        vendorSelectOptions={vendorSelectOptions}
        onSuccess={handleFormSuccess}
      />

      <StockVoucherFormDialog
        open={isEditVoucherOpen}
        onOpenChange={(open) => {
          setIsEditVoucherOpen(open)
          if (!open) setEditingVoucher(null)
        }}
        mode="edit"
        editingVoucher={editingVoucher ?? undefined}
        vendorSelectOptions={vendorSelectOptions}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
