import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getMachineMasterColumns = ({ onEdit, onDelete, }) => [
    {
        accessorKey: "machineCode",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "MACHINE CODE", column: column, placeholder: "Filter machine code..." })),
        cell: ({ row }) => {
            const machineCode = row.getValue("machineCode");
            return _jsx("div", { className: "font-medium", children: machineCode });
        },
    },
    {
        accessorKey: "machineName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "MACHINE NAME", column: column, placeholder: "Filter machine name..." })),
        cell: ({ row }) => {
            const machineName = row.getValue("machineName");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: machineName });
        },
    },
    {
        accessorKey: "operation",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OPERATION", column: column, placeholder: "Filter operation..." })),
        cell: ({ row }) => {
            const operation = row.getValue("operation");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: operation });
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "STATUS", column: column, placeholder: "Filter status..." })),
        cell: ({ row }) => {
            const status = row.getValue("status");
            return (_jsx("div", { className: "text-sm", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`, children: status }) }));
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const machine = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(machine), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit machine"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(machine), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete machine"] })] })] }));
        },
    },
];
