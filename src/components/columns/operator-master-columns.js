import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getOperatorMasterColumns = ({ onEdit, onDelete, }) => [
    {
        accessorKey: "operatorName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OPERATOR NAME", column: column, placeholder: "Filter operator name..." })),
        cell: ({ row }) => {
            const operatorName = row.getValue("operatorName");
            return _jsx("div", { className: "font-medium", children: operatorName });
        },
    },
    {
        accessorKey: "machineCode",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "MACHINE CODE", column: column, placeholder: "Filter machine code..." })),
        cell: ({ row }) => {
            const machineCode = row.getValue("machineCode");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: machineCode || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "operation",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OPERATION", column: column, placeholder: "Filter operation..." })),
        cell: ({ row }) => {
            const operation = row.getValue("operation");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: operation || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const operator = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(operator), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit operator"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(operator), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete operator"] })] })] }));
        },
    },
];
