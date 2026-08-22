import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ColumnHeader } from "@/components/column-header"
import { includesStringFilterFn } from "@/lib/table-filter-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type OrderBookMaster = {
  id: number
  orderNumber?: string | null
  partyId?: number | null
  partyCode?: string | null
  partyName?: string | null
  itemId?: number | null
  itemCode?: string | null
  itemName?: string | null
  qty: number
  orderDate?: string | null
  totalGsm?: number | null
  size?: number | null
  structure?: string | null
  coilWidth?: number | null
  repeatLength?: number | null
  noOfPanel?: number | null
  remarks?: string | null
  createdBy?: number | null
  createdAt?: string
}

type OrderBookColumnHandlers = {
  onEdit?: (order: OrderBookMaster) => void
  onDelete?: (order: OrderBookMaster) => void
}

export const getOrderBookColumns = ({
  onEdit,
  onDelete,
}: OrderBookColumnHandlers): ColumnDef<OrderBookMaster>[] => {
  const hasActions = onEdit != null || onDelete != null
  const columns: ColumnDef<OrderBookMaster>[] = [
    {
      accessorKey: "orderNumber",
      header: ({ column }) => (
        <ColumnHeader title="ORDER NO" column={column} placeholder="Filter order number..." />
      ),
      cell: ({ row }) => {
        const orderNumber = row.getValue("orderNumber") as string | null
        return (
          <div className="font-medium">
            {orderNumber || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "partyCode",
      header: ({ column }) => (
        <ColumnHeader title="PARTY CODE" column={column} placeholder="Filter party code..." />
      ),
      cell: ({ row }) => {
        const partyCode = row.getValue("partyCode") as string | null
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {partyCode || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "itemCode",
      header: ({ column }) => (
        <ColumnHeader title="ITEM CODE" column={column} placeholder="Filter item code..." />
      ),
      cell: ({ row }) => {
        const itemCode = row.getValue("itemCode") as string | null
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {itemCode || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "qty",
      header: ({ column }) => (
        <ColumnHeader title="QTY (KG)" column={column} placeholder="Filter qty..." />
      ),
      cell: ({ row }) => {
        const qty = row.getValue("qty") as number
        return <div className="text-sm">{Number(qty).toFixed(2)}</div>
      },
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "totalGsm",
      header: ({ column }) => (
        <ColumnHeader title="TOTAL GSM" column={column} placeholder="Filter total GSM..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("totalGsm") as number | null
        return (
          <div className="text-sm">
            {value != null ? Number(value).toFixed(2) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "size",
      header: ({ column }) => (
        <ColumnHeader title="SIZE" column={column} placeholder="Filter size..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("size") as number | null
        return (
          <div className="text-sm">
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "structure",
      header: ({ column }) => (
        <ColumnHeader title="STRUCTURE" column={column} placeholder="Filter structure..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("structure") as string | null
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400 max-w-[220px] truncate">
            {value || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "coilWidth",
      header: ({ column }) => (
        <ColumnHeader title="COIL WIDTH" column={column} placeholder="Filter coil width..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("coilWidth") as number | null
        return (
          <div className="text-sm">
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "repeatLength",
      header: ({ column }) => (
        <ColumnHeader title="REPEAT LENGTH" column={column} placeholder="Filter repeat length..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("repeatLength") as number | null
        return (
          <div className="text-sm">
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "noOfPanel",
      header: ({ column }) => (
        <ColumnHeader title="NO OF PANEL" column={column} placeholder="Filter no of panel..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("noOfPanel") as number | null
        return (
          <div className="text-sm">
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <ColumnHeader title="ORDER DATE" column={column} placeholder="Filter order date..." />
      ),
      cell: ({ row }) => {
        const orderDate = row.getValue("orderDate") as string | null
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {orderDate || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "remarks",
      header: ({ column }) => (
        <ColumnHeader title="REMARKS" column={column} placeholder="Filter remarks..." />
      ),
      cell: ({ row }) => {
        const remarks = row.getValue("remarks") as string | null
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400 max-w-[240px] truncate">
            {remarks || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    ...(hasActions
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: { original: OrderBookMaster } }) => {
              const order = row.original
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
                    {onEdit != null && (
                      <DropdownMenuItem onClick={() => onEdit(order)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit order
                      </DropdownMenuItem>
                    )}
                    {onDelete != null && (
                      <DropdownMenuItem className="text-red-600" onClick={() => onDelete(order)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete order
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]
      : []),
  ]
  return columns
}
