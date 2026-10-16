import { jsx as _jsx } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { ColumnHeader } from "@/components/column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
export { includesStringFilterFn } from "@/lib/table-filter-utils";
const formatInvoiceDate = (invoiceDate) => {
    if (!invoiceDate)
        return "-";
    const parsed = new Date(invoiceDate);
    return Number.isNaN(parsed.getTime()) ? invoiceDate : parsed.toLocaleDateString();
};
const issuedAtColumn = {
    accessorKey: "issuedAt",
    header: ({ column }) => (_jsx(ColumnHeader, { title: "Issued At", column: column, placeholder: "Filter..." })),
    cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.issuedAt
            ? new Date(row.original.issuedAt).toLocaleString()
            : "-" })),
    filterFn: includesStringFilterFn,
};
export const getRollsStockColumns = (options) => {
    const baseSelect = {
        id: "select",
        header: ({ table }) => (_jsx(Checkbox, { checked: table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate"), onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value), "aria-label": "Select all", className: "translate-y-[1px]" })),
        cell: ({ row }) => (_jsx(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (value) => row.toggleSelected(!!value), "aria-label": "Select row", className: "translate-y-[1px]" })),
        enableSorting: false,
        enableHiding: false,
    };
    const idColumn = {
        accessorKey: "id",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ID", column: column, placeholder: "Filter ID..." })),
        cell: ({ row }) => _jsx("div", { className: "font-medium", children: row.getValue("id") }),
        filterFn: includesStringFilterFn,
    };
    const itemColumn = {
        id: "item",
        accessorFn: (row) => row.itemCode ?? "",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "Item", column: column, placeholder: "Filter item..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.itemCode })),
        filterFn: includesStringFilterFn,
    };
    // RM reports: original layout (grade, roll no, vendor)
    if (!options || options.variant === "rm" || options.variant === undefined) {
        const rmColumns = [
            baseSelect,
            idColumn,
            itemColumn,
            {
                accessorKey: "grade",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Grade", column: column, placeholder: "Filter grade..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.grade || "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "rollno",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Roll No", column: column, placeholder: "Filter roll no..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("rollno") || "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "size",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Size", column: column, placeholder: "Filter size..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("size") ?? "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "micron",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Micron", column: column, placeholder: "Filter micron..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("micron") ?? "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "netweight",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Net Weight (kg)", column: column, placeholder: "Filter..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("netweight") ?? "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "meter",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Meter", column: column, placeholder: "Filter meter..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.meter ? Math.round(row.original.meter) : "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "grossweight",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Gross Weight (kg)", column: column, placeholder: "Filter..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("grossweight") ?? "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "vendorCode",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Vendor", column: column, placeholder: "Filter vendor..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("vendorCode") || "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "invoiceNo",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Invoice No", column: column, placeholder: "Filter invoice..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.invoiceNo || "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "invoiceDate",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Invoice Date", column: column, placeholder: "Filter date..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-sm", children: formatInvoiceDate(row.original.invoiceDate) })),
                filterFn: includesStringFilterFn,
            },
        ];
        if (options?.showIssuedAt) {
            rmColumns.push(issuedAtColumn);
        }
        return rmColumns;
    }
    // WIP reports: customer, stage, consumed (no grade/roll/vendor)
    const wipColumns = [
        baseSelect,
        idColumn,
        itemColumn,
        {
            accessorKey: "size",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Size", column: column, placeholder: "Filter size..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("size") ?? "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "micron",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Micron", column: column, placeholder: "Filter micron..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("micron") ?? "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "netweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Net Weight (kg)", column: column, placeholder: "Filter..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("netweight") ?? "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "grossweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Gross Weight (kg)", column: column, placeholder: "Filter..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.getValue("grossweight") ?? "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            id: "customer",
            accessorFn: (row) => row.customerName || row.vendorCode || "",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Customer", column: column, placeholder: "Filter customer..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.customerName || row.original.vendorCode || "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "stage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Stage", column: column, placeholder: "Filter stage..." })),
            cell: ({ row }) => {
                const stage = (row.original.stage ?? "").toLowerCase().replace(/-/g, "_");
                const label = stage === "virgin_rm"
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
                                        : row.original.stage || "-";
                return _jsx("div", { className: "text-sm", children: label });
            },
            filterFn: includesStringFilterFn,
        },
        {
            id: "consumed",
            accessorFn: (row) => (row.consumed ? "Yes" : "No"),
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Consumed", column: column, placeholder: "Filter..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-sm", children: row.original.consumed ? "Yes" : "No" })),
            filterFn: includesStringFilterFn,
        },
    ];
    if (options?.showIssuedAt) {
        wipColumns.push(issuedAtColumn);
    }
    return wipColumns;
};
