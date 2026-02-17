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

export type TemplateMaster = {
  id: number
  name: string
  fileType: string
  template?: Record<string, any>[] | null
  defaultForm?: string | null
}

type TemplateColumnHandlers = {
  onEdit: (template: TemplateMaster) => void
  onDelete: (template: TemplateMaster) => void
  isSuperUser?: boolean
}

export const getTemplateMasterColumns = ({
  onEdit,
  onDelete,
  isSuperUser = false,
}: TemplateColumnHandlers): ColumnDef<TemplateMaster>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <ColumnHeader title="NAME" column={column} placeholder="Filter name..." />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return <div className="font-medium">{name}</div>
    },
  },
  {
    accessorKey: "fileType",
    header: ({ column }) => (
      <ColumnHeader title="FILE TYPE" column={column} placeholder="Filter file type..." />
    ),
    cell: ({ row }) => {
      const fileType = row.getValue("fileType") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{fileType}</div>
    },
  },
  {
    accessorKey: "defaultForm",
    header: ({ column }) => (
      <ColumnHeader title="DEFAULT FORM" column={column} placeholder="Filter default form..." />
    ),
    cell: ({ row }) => {
      const defaultForm = row.getValue("defaultForm") as string | null | undefined
      if (!defaultForm) {
        return <div className="text-sm text-gray-400 dark:text-gray-500">-</div>
      }
      // Format the enum value for display
      const displayValue = defaultForm === "stock_roll_stk" 
        ? "Stock Roll STK" 
        : defaultForm === "stock_ink_stk"
        ? "Stock Ink STK"
        : defaultForm
      return <div className="text-sm text-gray-600 dark:text-gray-400">{displayValue}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original

      // Only show actions menu for superusers
      if (!isSuperUser) {
        return null
      }

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
            <DropdownMenuItem onClick={() => onEdit(template)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit template
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(template)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

