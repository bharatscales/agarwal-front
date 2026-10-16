import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getJobCardColumns = ({ onEdit, onDelete, }) => [
    {
        accessorKey: "jobCardNumber",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "JOB CARD NUMBER", column: column, placeholder: "Filter job card number..." })),
        cell: ({ row }) => {
            const jobCardNumber = row.getValue("jobCardNumber");
            return _jsx("div", { className: "font-medium", children: jobCardNumber });
        },
    },
    {
        accessorKey: "woNumber",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "WO NUMBER", column: column, placeholder: "Filter WO number..." })),
        cell: ({ row }) => {
            const woNumber = row.getValue("woNumber");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: woNumber || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "partyName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY NAME", column: column, placeholder: "Filter party name..." })),
        cell: ({ row }) => {
            const partyName = row.getValue("partyName");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: partyName || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "itemName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM NAME", column: column, placeholder: "Filter item name..." })),
        cell: ({ row }) => {
            const itemName = row.getValue("itemName");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: itemName || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "operation",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OPERATION", column: column, placeholder: "Filter operation..." })),
        cell: ({ row }) => {
            const operation = row.getValue("operation");
            return _jsx("div", { className: "text-sm font-medium", children: operation });
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
        accessorKey: "machineName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "MACHINE NAME", column: column, placeholder: "Filter machine name..." })),
        cell: ({ row }) => {
            const machineName = row.getValue("machineName");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: machineName || _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "operatorName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OPERATOR NAME", column: column, placeholder: "Filter operator name..." })),
        cell: ({ row }) => {
            const operatorName = row.getValue("operatorName");
            return _jsx("div", { className: "text-sm", children: operatorName });
        },
    },
    {
        accessorKey: "shift",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "SHIFT", column: column, placeholder: "Filter shift..." })),
        cell: ({ row }) => {
            const shift = row.getValue("shift");
            return (_jsx("div", { className: "text-sm", children: _jsx("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", children: shift }) }));
        },
    },
    {
        accessorKey: "inputQty",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "INPUT QTY (KG)", column: column, placeholder: "Filter input qty..." })),
        cell: ({ row }) => {
            const inputQty = row.getValue("inputQty");
            return (_jsx("div", { className: "text-sm", children: inputQty !== null && inputQty !== undefined ? inputQty.toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "outputQty",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OUTPUT QTY (KG)", column: column, placeholder: "Filter output qty..." })),
        cell: ({ row }) => {
            const outputQty = row.getValue("outputQty");
            return (_jsx("div", { className: "text-sm", children: outputQty !== null && outputQty !== undefined ? outputQty.toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "wastageQty",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "WASTAGE QTY (KG)", column: column, placeholder: "Filter wastage qty..." })),
        cell: ({ row }) => {
            const wastageQty = row.getValue("wastageQty");
            return (_jsx("div", { className: "text-sm", children: wastageQty !== null && wastageQty !== undefined ? wastageQty.toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "inputRollCount",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "INPUT ROLLS", column: column, placeholder: "Filter input rolls..." })),
        cell: ({ row }) => {
            const inputRollCount = row.getValue("inputRollCount");
            return (_jsx("div", { className: "text-sm", children: inputRollCount !== null && inputRollCount !== undefined ? inputRollCount : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "outputRollCount",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "OUTPUT ROLLS", column: column, placeholder: "Filter output rolls..." })),
        cell: ({ row }) => {
            const outputRollCount = row.getValue("outputRollCount");
            return (_jsx("div", { className: "text-sm", children: outputRollCount !== null && outputRollCount !== undefined ? outputRollCount : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
        filterFn: includesStringFilterFn,
    },
    {
        accessorKey: "startedAt",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "STARTED AT", column: column, placeholder: "Filter started at..." })),
        cell: ({ row }) => {
            const startedAt = row.getValue("startedAt");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: startedAt ? new Date(startedAt).toLocaleString() : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        accessorKey: "finishedAt",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "FINISHED AT", column: column, placeholder: "Filter finished at..." })),
        cell: ({ row }) => {
            const finishedAt = row.getValue("finishedAt");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: finishedAt ? new Date(finishedAt).toLocaleString() : _jsx("span", { className: "text-gray-400", children: "-" }) }));
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const jobCard = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(jobCard), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit job card"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(jobCard), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete job card"] })] })] }));
        },
    },
];
