import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, RefreshCw } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ColumnHeader } from "@/components/column-header"
import { Button } from "@/components/ui/button"
import api from "@/lib/axios"
import { getPartyStockSummaries, type PartyStockSummaryResponse } from "@/lib/stock-voucher-api"
import type { CreatableOption } from "@/components/ui/creatable-combobox"
import { StockVoucherFormDialog } from "@/components/stock-voucher-form-dialog"
import type { StockVoucher } from "@/components/columns/stock-voucher-columns"

type VendorOption = {
  id: number
  party_code: string
  party_name: string
  party_type: string
}

type PartyRow = PartyStockSummaryResponse

function getPartyColumns(): ColumnDef<PartyRow>[] {
  return [
    {
      accessorKey: "vendor_code",
      header: ({ column }) => (
        <ColumnHeader title="PARTY CODE" column={column} placeholder="Filter code..." />
      ),
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => (
        <ColumnHeader title="PARTY NAME" column={column} placeholder="Filter name..." />
      ),
    },
    {
      accessorKey: "voucher_count",
      header: ({ column }) => <ColumnHeader title="VOUCHERS" column={column} placeholder="Filter..." />,
      cell: ({ row }) => <div className="font-medium tabular-nums">{row.getValue("voucher_count")}</div>,
    },
    {
      accessorKey: "rolls_count",
      header: ({ column }) => <ColumnHeader title="ROLLS" column={column} placeholder="Filter..." />,
      cell: ({ row }) => <div className="font-medium tabular-nums">{row.getValue("rolls_count")}</div>,
    },
  ]
}

export default function StockEntryPartyIndex() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<PartyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendorSelectOptions, setVendorSelectOptions] = useState<CreatableOption[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)

  const fetchSummaries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getPartyStockSummaries()
      setRows(data)
    } catch (err) {
      console.error(err)
      setError("Failed to load party summary. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get<VendorOption[]>("/meta/party-vendors")
      setVendorSelectOptions(
        response.data.map((vendor) => ({
          value: vendor.id.toString(),
          label: vendor.party_code,
          description: `${vendor.party_name} (${vendor.party_type})`,
        }))
      )
    } catch (e) {
      console.error("Failed to load vendors:", e)
      setVendorSelectOptions([])
    }
  }

  useEffect(() => {
    fetchVendors()
    fetchSummaries()
  }, [])

  const handleVoucherCreated = (voucher: StockVoucher) => {
    if (voucher.stockType === "rolls") {
      navigate(`/manufacturing/stock-entry/${voucher.id}`)
    } else if (voucher.stockType === "ink/adhesive/chemical") {
      navigate(`/manufacturing/stock-entry/${voucher.id}/chem`)
    }
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span className="text-gray-900 dark:text-gray-100 font-medium">Stock Entry</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Stock Entry</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Select a party to view vouchers and roll lines.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                fetchVendors()
                fetchSummaries()
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => setIsAddOpen(true)} size="sm">
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
            <p className="text-gray-600 dark:text-gray-400">Loading parties...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <Button onClick={fetchSummaries} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : (
        <DataTable
          columns={getPartyColumns()}
          data={rows}
          onRowClick={(row) => navigate(`/manufacturing/stock-entry/party/${row.vendor_id}`)}
        />
      )}

      {rows.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No parties with stock vouchers yet. Add a stock voucher to get started.
          </p>
        </div>
      )}

      <StockVoucherFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        mode="add"
        initialVendorId=""
        vendorSelectOptions={vendorSelectOptions}
        onSuccess={(voucher, action) => {
          if (action === "add") {
            fetchSummaries()
            handleVoucherCreated(voucher)
          }
        }}
      />
    </div>
  )
}
