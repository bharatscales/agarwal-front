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

export type Item = {
  id: number
  itemCode: string
  itemName: string
  itemGroup: string
  uom: string
  openingStock: string
}

type ItemColumnHandlers = {
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
}

export const getItemColumns = ({
  onEdit,
  onDelete,
}: ItemColumnHandlers): ColumnDef<Item>[] => [
  {
    accessorKey: "itemCode",
    header: ({ column }) => (
      <ColumnHeader title="ITEM CODE" column={column} placeholder="Filter item code..." />
    ),
    cell: ({ row }) => {
      const itemCode = row.getValue("itemCode") as string
      return <div className="font-medium">{itemCode}</div>
    },
  },
  {
    accessorKey: "itemName",
    header: ({ column }) => (
      <ColumnHeader title="ITEM NAME" column={column} placeholder="Filter item name..." />
    ),
    cell: ({ row }) => {
      const itemName = row.getValue("itemName") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{itemName || "-"}</div>
    },
  },
  {
    accessorKey: "itemGroup",
    header: ({ column }) => (
      <ColumnHeader title="ITEM GROUP" column={column} placeholder="Filter item group..." />
    ),
  },
  {
    accessorKey: "uom",
    header: ({ column }) => (
      <ColumnHeader title="UOM" column={column} placeholder="Filter UOM..." />
    ),
  },
  {
    accessorKey: "openingStock",
    header: ({ column }) => (
      <ColumnHeader title="OPENING STOCK" column={column} placeholder="Filter opening stock..." />
    ),
    cell: ({ row }) => {
      const openingStock = row.getValue("openingStock") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{openingStock || "-"}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original

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
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit item
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(item)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

