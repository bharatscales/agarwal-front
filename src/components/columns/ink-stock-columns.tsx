import { type ColumnDef } from "@tanstack/react-table"
import { ColumnHeader } from "@/components/column-header"
import { Checkbox } from "@/components/ui/checkbox"
import type { InkStockRow } from "@/lib/ink-stock-api"

export type { InkStockRow } from "@/lib/ink-stock-api"

const issuedAtColumn: ColumnDef<InkStockRow> = {
  accessorKey: "issuedAt",
  header: ({ column }) => (
    <ColumnHeader title="Issued At" column={column} placeholder="Filter..." />
  ),
  cell: ({ row }) => (
    <div className="text-sm">
      {row.original.issuedAt
        ? new Date(row.original.issuedAt).toLocaleString()
        : "-"}
    </div>
  ),
}

export const getInkStockColumns = (options?: { showIssuedAt?: boolean }): ColumnDef<InkStockRow>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[1px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[1px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <ColumnHeader title="ID" column={column} placeholder="Filter ID..." />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  },
  {
    id: "item",
    accessorFn: (row) => row.itemCode ?? "",
    header: ({ column }) => (
      <ColumnHeader title="Item" column={column} placeholder="Filter item..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.itemCode}
      </div>
    ),
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <ColumnHeader title="Color" column={column} placeholder="Filter color..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("color") || "-"}</div>
    ),
  },
  {
    accessorKey: "grade",
    header: ({ column }) => (
      <ColumnHeader title="Grade" column={column} placeholder="Filter grade..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.grade || "-"}</div>
    ),
  },
  {
    accessorKey: "qty",
    header: ({ column }) => (
      <ColumnHeader title="Qty" column={column} placeholder="Filter..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("qty") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "uom",
    header: ({ column }) => (
      <ColumnHeader title="UOM" column={column} placeholder="Filter..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("uom") || "-"}</div>
    ),
  },
  ...(options?.showIssuedAt ? [issuedAtColumn] : []),
]
