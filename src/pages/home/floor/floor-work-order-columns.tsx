import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical } from "lucide-react"

import { ColumnHeader } from "@/components/column-header"
import { ColumnHeaderSelect } from "@/components/column-header-select"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const statusClassName = (status: string) => {
  if (status === "in_progress") return "text-blue-600 dark:text-blue-400"
  if (status === "completed" || status === "printed") return "text-green-600 dark:text-green-400"
  return "text-gray-600 dark:text-gray-400"
}

type FloorWorkOrderColumnOptions = {
  onSkip?: (workOrder: WorkOrderMaster) => void
}

/** Searchable/filterable columns for Floor dashboard work-order lists. */
export const getFloorWorkOrderColumns = (
  options?: FloorWorkOrderColumnOptions
): ColumnDef<WorkOrderMaster>[] => [
  {
    accessorKey: "woNumber",
    header: ({ column }) => (
      <ColumnHeader title="WO NUMBER" column={column} placeholder="Filter WO number..." />
    ),
    cell: ({ row }) => (
      <div className="font-medium text-gray-900 dark:text-gray-100">
        {row.original.woNumber ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "partyName",
    header: ({ column }) => (
      <ColumnHeader title="PARTY" column={column} placeholder="Filter party..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {row.original.partyName ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "itemName",
    header: ({ column }) => (
      <ColumnHeader title="ITEM" column={column} placeholder="Filter item..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {row.original.itemName ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true
      const rowValue = String(row.getValue(columnId) ?? "")
      return filterValue.includes(rowValue)
    },
    header: ({ column }) => (
      <ColumnHeaderSelect
        title="STATUS"
        column={column}
        options={["planned", "in_progress", "printed", "completed", "cancelled"]}
      />
    ),
    cell: ({ row }) => {
      const status = row.original.status ?? ""
      return (
        <span className={statusClassName(status)}>
          {status.replace(/_/g, " ") || "-"}
        </span>
      )
    },
  },
  ...(options?.onSkip
    ? [
        {
          id: "action",
          enableSorting: false,
          enableColumnFilter: false,
          header: () => (
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">ACTION</span>
          ),
          cell: ({ row }: { row: { original: WorkOrderMaster } }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => options.onSkip?.(row.original)}
                  >
                    Skip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        } satisfies ColumnDef<WorkOrderMaster>,
      ]
    : []),
]
