import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
const getStatusColor = (status) => {
    switch (status) {
        case "planned":
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
        case "in_progress":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
        case "completed":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
};
const getPriorityColor = (priority) => {
    switch (priority) {
        case "high":
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        case "normal":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
        case "low":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
};
export const getWorkOrderColumns = ({ onEdit, onDelete, }) => {
    const hasActions = onEdit != null || onDelete != null;
    const columns = [
        {
            accessorKey: "woNumber",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "WO NUMBER", column: column, placeholder: "Filter WO number..." })),
            cell: ({ row }) => {
                const woNumber = row.getValue("woNumber");
                return (_jsx("div", { className: "font-medium", children: woNumber || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "partyCode",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY CODE", column: column, placeholder: "Filter party code..." })),
            cell: ({ row }) => {
                const partyCode = row.getValue("partyCode");
                return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: partyCode || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "itemCode",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM CODE", column: column, placeholder: "Filter item code..." })),
            cell: ({ row }) => {
                const itemCode = row.getValue("itemCode");
                return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: itemCode || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "plannedQty",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PLANNED QTY (KG)", column: column, placeholder: "Filter planned qty..." })),
            cell: ({ row }) => {
                const plannedQty = row.getValue("plannedQty");
                return (_jsx("div", { className: "text-sm", children: plannedQty != null ? Number(plannedQty).toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "producedQty",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PRODUCED QTY (KG)", column: column, placeholder: "Filter produced qty..." })),
            cell: ({ row }) => {
                const producedQty = row.getValue("producedQty");
                return (_jsx("div", { className: "text-sm", children: producedQty != null ? Number(producedQty).toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "STATUS", column: column, placeholder: "Filter status..." })),
            cell: ({ row }) => {
                const status = row.getValue("status") ?? "";
                if (!status)
                    return _jsx("span", { className: "text-gray-400", children: "-" });
                return (_jsx("div", { className: "text-sm", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`, children: status.replace("_", " ").toUpperCase() }) }));
            },
        },
        {
            accessorKey: "priority",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PRIORITY", column: column, placeholder: "Filter priority..." })),
            cell: ({ row }) => {
                const priority = row.getValue("priority");
                return (_jsx("div", { className: "text-sm", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`, children: priority?.toUpperCase() || "NORMAL" }) }));
            },
        },
        ...(hasActions
            ? [
                {
                    id: "actions",
                    cell: ({ row }) => {
                        const workOrder = row.original;
                        return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), onEdit != null && (_jsxs(DropdownMenuItem, { onClick: () => onEdit(workOrder), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit work order"] })), onDelete != null && (_jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(workOrder), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete work order"] }))] })] }));
                    },
                },
            ]
            : []),
    ];
    return columns;
};
