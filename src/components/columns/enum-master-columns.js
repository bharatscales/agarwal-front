import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getEnumMasterColumns = ({ onEdit, onDelete, }) => [
    {
        accessorKey: "value",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "VALUE", column: column, placeholder: "Search value..." })),
        cell: ({ row }) => _jsx("div", { className: "font-medium", children: row.original.value }),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const item = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(item), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit value"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(item), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete value"] })] })] }));
        },
    },
];
