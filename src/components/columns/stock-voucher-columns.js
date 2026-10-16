import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getStockVoucherColumns = ({ onEdit, onDelete, }) => [
    {
        accessorKey: "id",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ID", column: column, placeholder: "Filter ID..." })),
        cell: ({ row }) => {
            const id = row.getValue("id");
            return _jsx("div", { className: "font-medium", children: id });
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "vendor",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "VENDOR", column: column, placeholder: "Filter vendor..." })),
        cell: ({ row }) => {
            const vendor = row.getValue("vendor");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: vendor });
        },
    },
    {
        accessorKey: "invoiceNo",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "INVOICE NO", column: column, placeholder: "Filter invoice no..." })),
    },
    {
        accessorKey: "stockType",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "STOCK TYPE", column: column, placeholder: "Filter stock type..." })),
        cell: ({ row }) => {
            const stockType = row.getValue("stockType");
            if (!stockType) {
                return _jsx("div", { className: "text-sm text-gray-400 dark:text-gray-500", children: "-" });
            }
            // Format the display: "rolls" -> "Rolls", "ink/adhesive/chemical" -> "Ink/Adhesive/Chemical"
            const formatted = stockType === "rolls"
                ? "Rolls"
                : stockType === "ink/adhesive/chemical"
                    ? "Ink/Adhesive/Chemical"
                    : stockType;
            return _jsx("div", { className: "text-sm", children: formatted });
        },
    },
    {
        accessorKey: "invoiceDate",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "DATE", column: column, placeholder: "Filter date..." })),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const voucher = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(voucher), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit voucher"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(voucher), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete voucher"] })] })] }));
        },
    },
];
