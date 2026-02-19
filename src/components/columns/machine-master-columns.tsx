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

export type MachineMaster = {
  id: number
  machineCode: string
  machineName: string
  operation: string
  status: string
}

type MachineColumnHandlers = {
  onEdit: (machine: MachineMaster) => void
  onDelete: (machine: MachineMaster) => void
}

export const getMachineMasterColumns = ({
  onEdit,
  onDelete,
}: MachineColumnHandlers): ColumnDef<MachineMaster>[] => [
  {
    accessorKey: "machineCode",
    header: ({ column }) => (
      <ColumnHeader title="MACHINE CODE" column={column} placeholder="Filter machine code..." />
    ),
    cell: ({ row }) => {
      const machineCode = row.getValue("machineCode") as string
      return <div className="font-medium">{machineCode}</div>
    },
  },
  {
    accessorKey: "machineName",
    header: ({ column }) => (
      <ColumnHeader title="MACHINE NAME" column={column} placeholder="Filter machine name..." />
    ),
    cell: ({ row }) => {
      const machineName = row.getValue("machineName") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{machineName}</div>
    },
  },
  {
    accessorKey: "operation",
    header: ({ column }) => (
      <ColumnHeader title="OPERATION" column={column} placeholder="Filter operation..." />
    ),
    cell: ({ row }) => {
      const operation = row.getValue("operation") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{operation}</div>
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <ColumnHeader title="STATUS" column={column} placeholder="Filter status..." />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <div className="text-sm">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {status}
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const machine = row.original

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
            <DropdownMenuItem onClick={() => onEdit(machine)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit machine
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(machine)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete machine
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

