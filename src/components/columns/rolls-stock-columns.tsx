import { type ColumnDef } from "@tanstack/react-table"
import { ColumnHeader } from "@/components/column-header"
import { Checkbox } from "@/components/ui/checkbox"

export type RollsStockRow = {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  vendorCode: string
  gradeId?: number
  grade?: string
  rollno: string
  size: number
  micron: number
  netweight: number
  grossweight: number
  barcode?: string
  issued: boolean
  issuedAt: string | null
}

const issuedAtColumn: ColumnDef<RollsStockRow> = {
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

export const getRollsStockColumns = (options?: { showIssuedAt?: boolean }): ColumnDef<RollsStockRow>[] => [
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
    accessorKey: "grade",
    header: ({ column }) => (
      <ColumnHeader title="Grade" column={column} placeholder="Filter grade..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.grade || "-"}</div>
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
  ...(options?.showIssuedAt ? [issuedAtColumn] : []),
]
