import { type ColumnDef } from "@tanstack/react-table"
import { ColumnHeader } from "@/components/column-header"
import { Checkbox } from "@/components/ui/checkbox"

export type RollsStockRow = {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  vendorCode: string
  customerName?: string | null
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
  stage?: string | null
  consumed?: boolean
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
    id: "customer",
    header: ({ column }) => (
      <ColumnHeader title="Customer" column={column} placeholder="Filter customer..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.customerName || row.original.vendorCode || "-"}
      </div>
    ),
  },
  {
    accessorKey: "stage",
    header: ({ column }) => (
      <ColumnHeader title="Stage" column={column} placeholder="Filter stage..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.stage || "-"}</div>
    ),
  },
  {
    accessorKey: "consumed",
    header: ({ column }) => (
      <ColumnHeader title="Consumed" column={column} placeholder="Filter..." />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.consumed ? "Yes" : "No"}
      </div>
    ),
  },
  ...(options?.showIssuedAt ? [issuedAtColumn] : []),
]
