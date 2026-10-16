import { jsx as _jsx } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { ColumnHeader } from "@/components/column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { availableQty } from "@/lib/ink-stock-api";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
const issuedAtColumn = {
    accessorKey: "issuedAt",
    header: ({ column }) => (_jsx(ColumnHeader, { title: "Issued At", column: column, placeholder: "Filter..." })),
    cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.issuedAt
            ? new Date(row.original.issuedAt).toLocaleString()
            : "-" })),
};
const formatInvoiceDate = (invoiceDate) => {
    if (!invoiceDate)
        return "-";
    const parsed = new Date(invoiceDate);
    return Number.isNaN(parsed.getTime()) ? invoiceDate : parsed.toLocaleDateString();
};
export const getInkStockColumns = (options) => [
    {
        id: "select",
        header: ({ table }) => (_jsx(Checkbox, { checked: table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate"), onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value), "aria-label": "Select all", className: "translate-y-[1px]" })),
        cell: ({ row }) => (_jsx(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (value) => row.toggleSelected(!!value), "aria-label": "Select row", className: "translate-y-[1px]" })),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "id",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ID", column: column, placeholder: "Filter ID..." })),
        cell: ({ row }) => _jsx("div", { className: "font-medium", children: row.getValue("id") }),
        filterFn: includesStringFilterFn,
    },
    {
        id: "item",
        accessorFn: (row) => row.itemCode ?? "",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Item", column: column, placeholder: "Filter item..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.itemCode })),
    },
    {
        accessorKey: "color",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Color", column: column, placeholder: "Filter color..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("color") || "-" })),
    },
    {
        accessorKey: "grade",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Grade", column: column, placeholder: "Filter grade..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.grade || "-" })),
    },
    {
        id: "qty",
        accessorFn: (row) => options?.showIssuedReport ? (row.issuedQty ?? 0) : availableQty(row),
        header: ({ column }) => (_jsx(ColumnHeader, { title: options?.showIssuedReport ? "Issued Qty" : "Qty", column: column, placeholder: "Filter..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("qty") ?? "-" })),
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "uom",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "UOM", column: column, placeholder: "Filter..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("uom") || "-" })),
    },
    {
        accessorKey: "invoiceNo",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Invoice No", column: column, placeholder: "Filter invoice..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.invoiceNo || "-" })),
    },
    {
        accessorKey: "invoiceDate",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Invoice Date", column: column, placeholder: "Filter date..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: formatInvoiceDate(row.original.invoiceDate) })),
    },
    ...(options?.showIssuedAt ? [issuedAtColumn] : []),
];
