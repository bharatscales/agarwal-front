import { type ColumnDef } from "@tanstack/react-table"
import { ColumnHeader } from "@/components/column-header"

export type RollsStockRow = {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  vendorCode: string
  rollno: string
  size: number
  micron: number
  netweight: number
  grossweight: number
  barcode?: string
}

export const getRollsStockColumns = (): ColumnDef<RollsStockRow>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <ColumnHeader title="ID" column={column} placeholder="Filter ID..." />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  },
  {
    id: "item",
    accessorFn: (row) => `${row.itemCode} ${row.itemName}`.trim(),
    header: ({ column }) => (
      <ColumnHeader title="Item" column={column} placeholder="Filter item..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.itemCode} - {row.original.itemName}
      </div>
    ),
  },
  {
    accessorKey: "rollno",
    header: ({ column }) => (
      <ColumnHeader title="Roll No" column={column} placeholder="Filter roll no..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("rollno") || "-"}</div>
    ),
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("size") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "micron",
    header: ({ column }) => (
      <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("micron") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "netweight",
    header: ({ column }) => (
      <ColumnHeader title="Net Weight (kg)" column={column} placeholder="Filter..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("netweight") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "grossweight",
    header: ({ column }) => (
      <ColumnHeader title="Gross Weight (kg)" column={column} placeholder="Filter..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("grossweight") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "vendorCode",
    header: ({ column }) => (
      <ColumnHeader title="Vendor" column={column} placeholder="Filter vendor..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("vendorCode") || "-"}</div>
    ),
  },
]
