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

export type JobCardMaster = {
  id: number
  jobCardNumber: string
  workOrderId: number
  woNumber?: string | null
  partyName?: string | null
  itemName?: string | null
  operation: string
  machineId: number
  machineCode?: string | null
  machineName?: string | null
  operatorName: string
  shift: string
  inputQty?: number | null
  outputQty?: number | null
  wastageQty?: number | null
  inputRollCount?: number | null
  outputRollCount?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  createdBy?: number
  createdAt?: string
}

type JobCardColumnHandlers = {
  onEdit: (jobCard: JobCardMaster) => void
  onDelete: (jobCard: JobCardMaster) => void
}

export const getJobCardColumns = ({
  onEdit,
  onDelete,
}: JobCardColumnHandlers): ColumnDef<JobCardMaster>[] => [
  {
    accessorKey: "jobCardNumber",
    header: ({ column }) => (
      <ColumnHeader title="JOB CARD NUMBER" column={column} placeholder="Filter job card number..." />
    ),
    cell: ({ row }) => {
      const jobCardNumber = row.getValue("jobCardNumber") as string
      return <div className="font-medium">{jobCardNumber}</div>
    },
  },
  {
    accessorKey: "woNumber",
    header: ({ column }) => (
      <ColumnHeader title="WO NUMBER" column={column} placeholder="Filter WO number..." />
    ),
    cell: ({ row }) => {
      const woNumber = row.getValue("woNumber") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {woNumber || <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "partyName",
    header: ({ column }) => (
      <ColumnHeader title="PARTY NAME" column={column} placeholder="Filter party name..." />
    ),
    cell: ({ row }) => {
      const partyName = row.getValue("partyName") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {partyName || <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "itemName",
    header: ({ column }) => (
      <ColumnHeader title="ITEM NAME" column={column} placeholder="Filter item name..." />
    ),
    cell: ({ row }) => {
      const itemName = row.getValue("itemName") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {itemName || <span className="text-gray-400">-</span>}
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
      const operation = row.getValue("operation") as string
      return <div className="text-sm font-medium">{operation}</div>
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
    accessorKey: "machineName",
    header: ({ column }) => (
      <ColumnHeader title="MACHINE NAME" column={column} placeholder="Filter machine name..." />
    ),
    cell: ({ row }) => {
      const machineName = row.getValue("machineName") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {machineName || <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "operatorName",
    header: ({ column }) => (
      <ColumnHeader title="OPERATOR NAME" column={column} placeholder="Filter operator name..." />
    ),
    cell: ({ row }) => {
      const operatorName = row.getValue("operatorName") as string
      return <div className="text-sm">{operatorName}</div>
    },
  },
  {
    accessorKey: "shift",
    header: ({ column }) => (
      <ColumnHeader title="SHIFT" column={column} placeholder="Filter shift..." />
    ),
    cell: ({ row }) => {
      const shift = row.getValue("shift") as string
      return (
        <div className="text-sm">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {shift}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "inputQty",
    header: ({ column }) => (
      <ColumnHeader title="INPUT QTY (KG)" column={column} placeholder="Filter input qty..." />
    ),
    cell: ({ row }) => {
      const inputQty = row.getValue("inputQty") as number | null
      return (
        <div className="text-sm">
          {inputQty !== null && inputQty !== undefined ? inputQty.toFixed(2) : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "outputQty",
    header: ({ column }) => (
      <ColumnHeader title="OUTPUT QTY (KG)" column={column} placeholder="Filter output qty..." />
    ),
    cell: ({ row }) => {
      const outputQty = row.getValue("outputQty") as number | null
      return (
        <div className="text-sm">
          {outputQty !== null && outputQty !== undefined ? outputQty.toFixed(2) : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "wastageQty",
    header: ({ column }) => (
      <ColumnHeader title="WASTAGE QTY (KG)" column={column} placeholder="Filter wastage qty..." />
    ),
    cell: ({ row }) => {
      const wastageQty = row.getValue("wastageQty") as number | null
      return (
        <div className="text-sm">
          {wastageQty !== null && wastageQty !== undefined ? wastageQty.toFixed(2) : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "inputRollCount",
    header: ({ column }) => (
      <ColumnHeader title="INPUT ROLLS" column={column} placeholder="Filter input rolls..." />
    ),
    cell: ({ row }) => {
      const inputRollCount = row.getValue("inputRollCount") as number | null
      return (
        <div className="text-sm">
          {inputRollCount !== null && inputRollCount !== undefined ? inputRollCount : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "outputRollCount",
    header: ({ column }) => (
      <ColumnHeader title="OUTPUT ROLLS" column={column} placeholder="Filter output rolls..." />
    ),
    cell: ({ row }) => {
      const outputRollCount = row.getValue("outputRollCount") as number | null
      return (
        <div className="text-sm">
          {outputRollCount !== null && outputRollCount !== undefined ? outputRollCount : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "startedAt",
    header: ({ column }) => (
      <ColumnHeader title="STARTED AT" column={column} placeholder="Filter started at..." />
    ),
    cell: ({ row }) => {
      const startedAt = row.getValue("startedAt") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {startedAt ? new Date(startedAt).toLocaleString() : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "finishedAt",
    header: ({ column }) => (
      <ColumnHeader title="FINISHED AT" column={column} placeholder="Filter finished at..." />
    ),
    cell: ({ row }) => {
      const finishedAt = row.getValue("finishedAt") as string | null
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {finishedAt ? new Date(finishedAt).toLocaleString() : <span className="text-gray-400">-</span>}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const jobCard = row.original

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
            <DropdownMenuItem onClick={() => onEdit(jobCard)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit job card
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(jobCard)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete job card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

