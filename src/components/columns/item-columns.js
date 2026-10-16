import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getItemColumns = ({ onEdit, onDelete, canEdit = true, }) => [
    {
        accessorKey: "itemCode",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM CODE", column: column, placeholder: "Filter item code..." })),
        cell: ({ row }) => {
            const itemCode = row.getValue("itemCode");
            return _jsx("div", { className: "font-medium", children: itemCode });
        },
    },
    {
        accessorKey: "itemName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM NAME", column: column, placeholder: "Filter item name..." })),
        cell: ({ row }) => {
            const itemName = row.getValue("itemName");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: itemName || "-" });
        },
    },
    {
        accessorKey: "abv",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ABV", column: column, placeholder: "Filter abbreviation..." })),
        cell: ({ row }) => {
            const abv = row.original.abv;
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: abv || "-" });
        },
    },
    {
        accessorKey: "itemGroup",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM GROUP", column: column, placeholder: "Filter item group..." })),
    },
    {
        accessorKey: "partyCode",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY", column: column, placeholder: "Filter party..." })),
        cell: ({ row }) => {
            const partyCode = row.original.partyCode;
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: partyCode || "-" });
        },
    },
    {
        accessorKey: "uom",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "UOM", column: column, placeholder: "Filter UOM..." })),
    },
    {
        accessorKey: "density",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "DENSITY", column: column, placeholder: "Filter density..." })),
        cell: ({ row }) => {
            const density = row.original.density;
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: density != null ? density : "-" }));
        },
    },
    ...(canEdit
        ? [
            {
                id: "actions",
                cell: ({ row }) => {
                    const item = row.original;
                    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(item), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit item"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(item), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete item"] })] })] }));
                },
            },
        ]
        : []),
];
