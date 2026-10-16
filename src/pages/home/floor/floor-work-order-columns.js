import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";
import { WorkOrderTrackCell } from "./work-order-track";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
const statusClassName = (status) => {
    if (status === "in_progress")
        return "text-blue-600 dark:text-blue-400";
    if (status === "completed" || status === "printed")
        return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
};
/** Searchable/filterable columns for Floor dashboard work-order lists. */
export const getFloorWorkOrderColumns = (options) => [
    {
        accessorKey: "woNumber",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "WO NUMBER", column: column, placeholder: "Filter WO number..." })),
        cell: ({ row }) => (_jsx("div", { className: "font-medium text-gray-900 dark:text-gray-100", children: row.original.woNumber ?? "-" })),
    },
    {
        accessorKey: "partyName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY", column: column, placeholder: "Filter party..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm text-gray-700 dark:text-gray-300", children: row.original.partyName ?? "-" })),
    },
    {
        accessorKey: "itemName",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "ITEM", column: column, placeholder: "Filter item..." })),
        cell: ({ row }) => (_jsx("div", { className: "text-sm text-gray-700 dark:text-gray-300", children: row.original.itemName ?? "-" })),
    },
    ...(options?.showTrack
        ? [
            {
                id: "track",
                enableSorting: false,
                enableColumnFilter: false,
                header: () => (_jsx("span", { className: "text-xs font-medium text-gray-700 dark:text-gray-300", children: "TRACK" })),
                cell: ({ row }) => (_jsx(WorkOrderTrackCell, { track: options.tracks?.[row.original.id] })),
            },
        ]
        : [
            {
                accessorKey: "status",
                filterFn: (row, columnId, filterValue) => {
                    if (!Array.isArray(filterValue) || filterValue.length === 0)
                        return true;
                    const rowValue = String(row.getValue(columnId) ?? "");
                    return filterValue.includes(rowValue);
                },
                header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "STATUS", column: column, options: ["planned", "in_progress", "printed", "completed", "cancelled"] })),
                cell: ({ row }) => {
                    const status = row.original.status ?? "";
                    return (_jsx("span", { className: statusClassName(status), children: status.replace(/_/g, " ") || "-" }));
                },
            },
        ]),
    ...(options?.onSkip
        ? [
            {
                id: "action",
                enableSorting: false,
                enableColumnFilter: false,
                header: () => (_jsx("span", { className: "text-xs font-medium text-gray-700 dark:text-gray-300", children: "ACTION" })),
                cell: ({ row }) => (_jsx("div", { onClick: (e) => e.stopPropagation(), children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { type: "button", variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsx(DropdownMenuContent, { align: "end", children: _jsx(DropdownMenuItem, { onClick: () => options.onSkip?.(row.original), children: "Skip" }) })] }) })),
            },
        ]
        : []),
];
