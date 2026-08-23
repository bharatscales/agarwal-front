import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Edit, Trash2, Truck } from "lucide-react"
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

function Header(props: {
  title: string
  column: any
  placeholder?: string
  wrap?: boolean
}) {
  return <ColumnHeader {...props} compact />
}

export type OrderBookMaster = {
  id: number
  orderNumber?: string | null
  poNo?: string | null
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
  status?: string | null
  dispatchQty?: number | null
  remarks?: string | null
  createdBy?: number | null
  createdAt?: string
}

type OrderBookColumnHandlers = {
  onEdit?: (order: OrderBookMaster) => void
  onDispatch?: (order: OrderBookMaster) => void
  onDelete?: (order: OrderBookMaster) => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "closed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  }
}

export const getOrderBookColumns = ({
  onEdit,
  onDispatch,
  onDelete,
}: OrderBookColumnHandlers): ColumnDef<OrderBookMaster>[] => {
  const hasActions = onEdit != null || onDispatch != null || onDelete != null
  const columns: ColumnDef<OrderBookMaster>[] = [
    {
      accessorKey: "orderNumber",
      header: ({ column }) => (
        <Header title="ORDER NO" column={column} placeholder="Filter order number..." />
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
      accessorKey: "poNo",
      header: ({ column }) => (
        <Header title="PO NO." column={column} placeholder="Filter PO no..." />
      ),
      cell: ({ row }) => {
        const poNo = row.getValue("poNo") as string | null
        return (
          <div className="font-medium">
            {poNo || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <Header title="ORDER DATE" column={column} placeholder="Filter order date..." />
      ),
      cell: ({ row }) => {
        const orderDate = row.getValue("orderDate") as string | null
        return (
          <div className="text-gray-600 dark:text-gray-400">
            {orderDate || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "partyCode",
      header: ({ column }) => (
        <Header title="PARTY CODE" column={column} placeholder="Filter party code..." />
      ),
      cell: ({ row }) => {
        const partyCode = row.getValue("partyCode") as string | null
        return (
          <div className="text-gray-600 dark:text-gray-400">
            {partyCode || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "itemCode",
      header: ({ column }) => (
        <Header title="ITEM CODE" column={column} placeholder="Filter item code..." />
      ),
      cell: ({ row }) => {
        const itemCode = row.getValue("itemCode") as string | null
        return (
          <div className="text-gray-600 dark:text-gray-400">
            {itemCode || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "totalGsm",
      header: ({ column }) => (
        <Header title="TOTAL GSM" column={column} placeholder="Filter total GSM..." wrap />
      ),
      cell: ({ row }) => {
        const value = row.getValue("totalGsm") as number | null
        return (
          <div>
            {value != null ? Number(value).toFixed(2) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "size",
      header: ({ column }) => (
        <Header title="SIZE" column={column} placeholder="Filter size..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("size") as number | null
        return (
          <div>
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "structure",
      header: ({ column }) => (
        <Header title="STRUCTURE" column={column} placeholder="Filter structure..." />
      ),
      cell: ({ row }) => {
        const value = row.getValue("structure") as string | null
        return (
          <div className="text-gray-600 dark:text-gray-400 max-w-[220px] truncate">
            {value || <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "qty",
      header: ({ column }) => (
        <Header title="QTY (KG)" column={column} placeholder="Filter qty..." wrap />
      ),
      cell: ({ row }) => {
        const qty = row.getValue("qty") as number
        return <div>{Number(qty).toFixed(2)}</div>
      },
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "dispatchQty",
      header: ({ column }) => (
        <Header title="DISPATCH QTY" column={column} placeholder="Filter dispatch qty..." wrap />
      ),
      cell: ({ row }) => {
        const value = row.getValue("dispatchQty") as number | null
        return <div>{Number(value || 0).toFixed(2)}</div>
      },
      filterFn: includesStringFilterFn,
    },
    {
      id: "pendingQty",
      accessorFn: (row) => Number(row.qty || 0) - Number(row.dispatchQty || 0),
      header: ({ column }) => (
        <Header title="PENDING QTY" column={column} placeholder="Filter pending qty..." wrap />
      ),
      cell: ({ getValue }) => <div>{Number(getValue() ?? 0).toFixed(2)}</div>,
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "coilWidth",
      header: ({ column }) => (
        <Header title="COIL WIDTH" column={column} placeholder="Filter coil width..." wrap />
      ),
      cell: ({ row }) => {
        const value = row.getValue("coilWidth") as number | null
        return (
          <div>
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "repeatLength",
      header: ({ column }) => (
        <Header title="REPEAT LENGTH" column={column} placeholder="Filter repeat length..." wrap />
      ),
      cell: ({ row }) => {
        const value = row.getValue("repeatLength") as number | null
        return (
          <div>
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "noOfPanel",
      header: ({ column }) => (
        <Header title="NO OF PANEL" column={column} placeholder="Filter no of panel..." wrap />
      ),
      cell: ({ row }) => {
        const value = row.getValue("noOfPanel") as number | null
        return (
          <div>
            {value != null ? String(value) : <span className="text-gray-400">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Header title="STATUS" column={column} placeholder="Filter status..." />
      ),
      cell: ({ row }) => {
        const status = ((row.getValue("status") as string | null) || "pending").toLowerCase()
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status.toUpperCase()}
          </span>
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
                    {onDispatch != null && (
                      <DropdownMenuItem onClick={() => onDispatch(order)}>
                        <Truck className="mr-2 h-4 w-4" />
                        Dispatch
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
