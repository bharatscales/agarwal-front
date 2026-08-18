import { type ColumnDef } from "@tanstack/react-table"
import { ColumnHeader } from "@/components/column-header"
import { Checkbox } from "@/components/ui/checkbox"
import { includesStringFilterFn } from "@/lib/table-filter-utils"

export { includesStringFilterFn } from "@/lib/table-filter-utils"

export type RollsStockRow = {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  vendorCode: string
  invoiceNo?: string
  invoiceDate?: string
  customerName?: string | null
  gradeId?: number
  grade?: string
  rollno: string
  size: number
  micron: number
  netweight: number
  meter?: number
  grossweight: number
  barcode?: string
  issued: boolean
  issuedAt: string | null
  stage?: string | null
  consumed?: boolean
}

const formatInvoiceDate = (invoiceDate?: string | null) => {
  if (!invoiceDate) return "-"
  const parsed = new Date(invoiceDate)
  return Number.isNaN(parsed.getTime()) ? invoiceDate : parsed.toLocaleDateString()
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
  filterFn: includesStringFilterFn,
}

type RollsColumnsOptions = {
  showIssuedAt?: boolean
  variant?: "rm" | "wip"
}

export const getRollsStockColumns = (options?: RollsColumnsOptions): ColumnDef<RollsStockRow>[] => {
  const baseSelect: ColumnDef<RollsStockRow> = {
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
  }

  const idColumn: ColumnDef<RollsStockRow> = {
    accessorKey: "id",
    header: ({ column }) => (
      <ColumnHeader title="ID" column={column} placeholder="Filter ID..." />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
    filterFn: includesStringFilterFn,
  }

  const itemColumn: ColumnDef<RollsStockRow> = {
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
    filterFn: includesStringFilterFn,
  }

  // RM reports: original layout (grade, roll no, vendor)
  if (!options || options.variant === "rm" || options.variant === undefined) {
    const rmColumns: ColumnDef<RollsStockRow>[] = [
      baseSelect,
      idColumn,
      itemColumn,
      {
        accessorKey: "grade",
        header: ({ column }) => (
          <ColumnHeader title="Grade" column={column} placeholder="Filter grade..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.original.grade || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "rollno",
        header: ({ column }) => (
          <ColumnHeader title="Roll No" column={column} placeholder="Filter roll no..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("rollno") || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "size",
        header: ({ column }) => (
          <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("size") ?? "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "micron",
        header: ({ column }) => (
          <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("micron") ?? "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "netweight",
        header: ({ column }) => (
          <ColumnHeader title="Net Weight (kg)" column={column} placeholder="Filter..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("netweight") ?? "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "meter",
        header: ({ column }) => (
          <ColumnHeader title="Meter" column={column} placeholder="Filter meter..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.original.meter ? Math.round(row.original.meter) : "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "grossweight",
        header: ({ column }) => (
          <ColumnHeader title="Gross Weight (kg)" column={column} placeholder="Filter..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("grossweight") ?? "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "vendorCode",
        header: ({ column }) => (
          <ColumnHeader title="Vendor" column={column} placeholder="Filter vendor..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("vendorCode") || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "invoiceNo",
        header: ({ column }) => (
          <ColumnHeader title="Invoice No" column={column} placeholder="Filter invoice..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{row.original.invoiceNo || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "invoiceDate",
        header: ({ column }) => (
          <ColumnHeader title="Invoice Date" column={column} placeholder="Filter date..." />
        ),
        cell: ({ row }) => (
          <div className="text-sm">{formatInvoiceDate(row.original.invoiceDate)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
    ]
    if (options?.showIssuedAt) {
      rmColumns.push(issuedAtColumn)
    }
    return rmColumns
  }

  // WIP reports: customer, stage, consumed (no grade/roll/vendor)
  const wipColumns: ColumnDef<RollsStockRow>[] = [
    baseSelect,
    idColumn,
    itemColumn,
    {
      accessorKey: "size",
      header: ({ column }) => (
        <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("size") ?? "-"}</div>
      ),
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "micron",
      header: ({ column }) => (
        <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("micron") ?? "-"}</div>
      ),
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "netweight",
      header: ({ column }) => (
        <ColumnHeader title="Net Weight (kg)" column={column} placeholder="Filter..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("netweight") ?? "-"}</div>
      ),
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "grossweight",
      header: ({ column }) => (
        <ColumnHeader title="Gross Weight (kg)" column={column} placeholder="Filter..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("grossweight") ?? "-"}</div>
      ),
      filterFn: includesStringFilterFn,
    },
    {
      id: "customer",
      accessorFn: (row) => row.customerName || row.vendorCode || "",
      header: ({ column }) => (
        <ColumnHeader title="Customer" column={column} placeholder="Filter customer..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.customerName || row.original.vendorCode || "-"}
        </div>
      ),
      filterFn: includesStringFilterFn,
    },
    {
      accessorKey: "stage",
      header: ({ column }) => (
        <ColumnHeader title="Stage" column={column} placeholder="Filter stage..." />
      ),
        cell: ({ row }) => {
          const stage = (row.original.stage ?? "").toLowerCase().replace(/-/g, "_")
          const label =
            stage === "virgin_rm"
              ? "RM Virgin"
              : stage === "rm_balance"
                ? "RM Balance"
                : stage === "wip_printed"
                  ? "WIP Printing"
                  : stage === "wip_inspection"
                    ? "WIP Inspection"
                    : stage === "wip_ecl"
                      ? "WIP ECL"
                      : stage === "wip_lamination"
                        ? "WIP Lamination"
                        : row.original.stage || "-"
          return <div className="text-sm">{label}</div>
        },
      filterFn: includesStringFilterFn,
    },
    {
      id: "consumed",
      accessorFn: (row) => (row.consumed ? "Yes" : "No"),
      header: ({ column }) => (
        <ColumnHeader title="Consumed" column={column} placeholder="Filter..." />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.consumed ? "Yes" : "No"}
        </div>
      ),
      filterFn: includesStringFilterFn,
    },
  ]

  if (options?.showIssuedAt) {
    wipColumns.push(issuedAtColumn)
  }
  return wipColumns
}
