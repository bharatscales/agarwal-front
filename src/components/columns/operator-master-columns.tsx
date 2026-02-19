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

export type OperatorMaster = {
  id: number
  operatorName: string
  machineId?: number | null
  machineCode?: string | null
  machineName?: string | null
  operation?: string | null
}

type OperatorColumnHandlers = {
  onEdit: (operator: OperatorMaster) => void
  onDelete: (operator: OperatorMaster) => void
}

export const getOperatorMasterColumns = ({
  onEdit,
  onDelete,
}: OperatorColumnHandlers): ColumnDef<OperatorMaster>[] => [
  {
    accessorKey: "operatorName",
    header: ({ column }) => (
      <ColumnHeader title="OPERATOR NAME" column={column} placeholder="Filter operator name..." />
    ),
    cell: ({ row }) => {
      const operatorName = row.getValue("operatorName") as string
      return <div className="font-medium">{operatorName}</div>
    },
  },
  {
    accessorKey: "machineCode",
    header: ({ column }) => (
      <ColumnHeader title="MACHINE CODE" column={column} placeholder="Filter machine code..." />
    ),
    cell: ({ row }) => {
      const machineCode = row.getValue("machineCode") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {machineCode || <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "operation",
    header: ({ column }) => (
      <ColumnHeader title="OPERATION" column={column} placeholder="Filter operation..." />
    ),
    cell: ({ row }) => {
      const operation = row.getValue("operation") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {operation || <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const operator = row.original

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
            <DropdownMenuItem onClick={() => onEdit(operator)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit operator
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(operator)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete operator
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

