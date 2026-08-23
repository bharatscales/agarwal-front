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
import type { EnumMasterValue } from "@/lib/enum-master-api"

type EnumMasterColumnHandlers = {
  onEdit: (row: EnumMasterValue) => void
  onDelete: (row: EnumMasterValue) => void
}

export const getEnumMasterColumns = ({
  onEdit,
  onDelete,
}: EnumMasterColumnHandlers): ColumnDef<EnumMasterValue>[] => [
  {
    accessorKey: "value",
    header: ({ column }) => (
      <ColumnHeader title="VALUE" column={column} placeholder="Search value..." />
    ),
    cell: ({ row }) => <div className="font-medium">{row.original.value}</div>,
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
              Edit value
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(item)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete value
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
