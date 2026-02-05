import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ColumnHeader } from "@/components/column-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type StockVoucher = {
  id: number
  vendorId: number
  vendor: string
  invoiceNo: string
  invoiceDate: string
  stockType: string
}

type StockVoucherHandlers = {
  onEdit: (voucher: StockVoucher) => void
  onDelete: (voucher: StockVoucher) => void
}

export const getStockVoucherColumns = ({
  onEdit,
  onDelete,
}: StockVoucherHandlers): ColumnDef<StockVoucher>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <ColumnHeader title="ID" column={column} placeholder="Filter ID..." />
    ),
    cell: ({ row }) => {
      const id = row.getValue("id") as number
      return <div className="font-medium">{id}</div>
    },
  },
  {
    accessorKey: "vendor",
    header: ({ column }) => (
      <ColumnHeader title="VENDOR" column={column} placeholder="Filter vendor..." />
    ),
    cell: ({ row }) => {
      const vendor = row.getValue("vendor") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{vendor}</div>
    },
  },
  {
    accessorKey: "invoiceNo",
    header: ({ column }) => (
      <ColumnHeader title="INVOICE NO" column={column} placeholder="Filter invoice no..." />
    ),
  },
  {
    accessorKey: "stockType",
    header: ({ column }) => (
      <ColumnHeader title="STOCK TYPE" column={column} placeholder="Filter stock type..." />
    ),
    cell: ({ row }) => {
      const stockType = row.getValue("stockType") as string
      if (!stockType) {
        return <div className="text-sm text-gray-400 dark:text-gray-500">-</div>
      }
      // Format the display: "rolls" -> "Rolls", "ink/adhesive/chemical" -> "Ink/Adhesive/Chemical"
      const formatted = stockType === "rolls" 
        ? "Rolls" 
        : stockType === "ink/adhesive/chemical"
        ? "Ink/Adhesive/Chemical"
        : stockType
      return <div className="text-sm">{formatted}</div>
    },
  },
  {
    accessorKey: "invoiceDate",
    header: ({ column }) => (
      <ColumnHeader title="DATE" column={column} placeholder="Filter date..." />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const voucher = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(voucher)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit voucher
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(voucher)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete voucher
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

