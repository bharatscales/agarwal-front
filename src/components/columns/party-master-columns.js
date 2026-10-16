import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getPartyMasterColumns = ({ onEdit, onDelete, canEdit = true, }) => [
    {
        accessorKey: "partyCode",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY CODE", column: column, placeholder: "Filter party code..." })),
        cell: ({ row }) => {
            const partyCode = row.getValue("partyCode");
            return _jsx("div", { className: "font-medium", children: partyCode });
        },
    },
    {
        accessorKey: "partyName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY NAME", column: column, placeholder: "Filter party name..." })),
        cell: ({ row }) => {
            const partyName = row.getValue("partyName");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: partyName });
        },
    },
    {
        accessorKey: "partyType",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY TYPE", column: column, placeholder: "Filter party type..." })),
        cell: ({ row }) => {
            const partyType = row.getValue("partyType");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: partyType });
        },
    },
    ...(canEdit
        ? [
            {
                id: "actions",
                cell: ({ row }) => {
                    const party = row.original;
                    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(party), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit party"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(party), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete party"] })] })] }));
                },
            },
        ]
        : []),
];
