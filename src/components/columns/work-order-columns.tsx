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

export type WorkOrderMaster = {
  id: number
  woNumber?: string | null
  partyId?: number | null
  partyCode?: string | null
  partyName?: string | null
  itemId?: number | null
  itemCode?: string | null
  itemName?: string | null
  plannedQty: number
  producedQty: number
  status: string
  priority?: string | null
  createdBy?: number
  createdAt?: string
  startedAt?: string | null
  completedAt?: string | null
}

type WorkOrderColumnHandlers = {
  onEdit: (workOrder: WorkOrderMaster) => void
  onDelete: (workOrder: WorkOrderMaster) => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "planned":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

const getPriorityColor = (priority?: string | null) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "normal":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

export const getWorkOrderColumns = ({
  onEdit,
  onDelete,
}: WorkOrderColumnHandlers): ColumnDef<WorkOrderMaster>[] => [
  {
    accessorKey: "woNumber",
    header: ({ column }) => (
      <ColumnHeader title="WO NUMBER" column={column} placeholder="Filter WO number..." />
    ),
    cell: ({ row }) => {
      const woNumber = row.getValue("woNumber") as string | null
      return (
        <div className="font-medium">
          {woNumber || <span className="text-gray-400">-</span>}
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
    accessorKey: "plannedQty",
    header: ({ column }) => (
      <ColumnHeader title="PLANNED QTY (KG)" column={column} placeholder="Filter planned qty..." />
    ),
    cell: ({ row }) => {
      const plannedQty = row.getValue("plannedQty") as number
      return <div className="text-sm">{plannedQty.toFixed(2)}</div>
    },
  },
  {
    accessorKey: "producedQty",
    header: ({ column }) => (
      <ColumnHeader title="PRODUCED QTY (KG)" column={column} placeholder="Filter produced qty..." />
    ),
    cell: ({ row }) => {
      const producedQty = row.getValue("producedQty") as number
      return <div className="text-sm">{producedQty.toFixed(2)}</div>
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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status.replace("_", " ").toUpperCase()}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <ColumnHeader title="PRIORITY" column={column} placeholder="Filter priority..." />
    ),
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string | null
      return (
        <div className="text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
            {priority?.toUpperCase() || "NORMAL"}
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const workOrder = row.original

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
            <DropdownMenuItem onClick={() => onEdit(workOrder)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit work order
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(workOrder)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete work order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

