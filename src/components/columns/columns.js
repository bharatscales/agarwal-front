import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";
export const columns = [
    {
        id: "select",
        header: ({ table }) => (_jsx("div", { className: "flex items-center", children: _jsx(Checkbox, { checked: table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate"), onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value), "aria-label": "Select all", className: "" }) })),
        cell: ({ row }) => (_jsx("div", { className: "flex items-center justify-center w-full pr-2", children: _jsx(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (value) => row.toggleSelected(!!value), "aria-label": "Select row" }) })),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "date",
        header: ({ column }) => _jsx(ColumnHeader, { title: "DATE", column: column, placeholder: "Filter date..." }),
    },
    {
        accessorKey: "pono",
        header: ({ column }) => _jsx(ColumnHeader, { title: "P.O. NO.", column: column, placeholder: "Filter P.O. No..." }),
    },
    {
        accessorKey: "party",
        header: ({ column }) => _jsx(ColumnHeader, { title: "PARTY", column: column, placeholder: "Filter party..." }),
    },
    {
        accessorKey: "location",
        header: ({ column }) => _jsx(ColumnHeader, { title: "LOCATION", column: column, placeholder: "Filter location..." }),
    },
    {
        accessorKey: "quantity",
        header: ({ column }) => _jsx(ColumnHeader, { title: "QUANTITY", column: column, placeholder: "Filter quantity..." }),
    },
    {
        accessorKey: "shipping",
        header: ({ column }) => _jsx(ColumnHeader, { title: "SHIPPING ADDRESS", column: column, placeholder: "Filter shipping..." }),
    },
    {
        accessorKey: "priority",
        header: ({ column }) => _jsx(ColumnHeader, { title: "PRIORITY", column: column, placeholder: "Filter priority..." }),
    },
    {
        accessorKey: "status",
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const rowValue = row.getValue(columnId);
            return filterValue.includes(rowValue);
        },
        cell: ({ row }) => {
            const value = row.getValue("status");
            return _jsx("span", { children: value });
        },
        header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "STATUS", column: column, options: ["pending", "processing", "success", "failed"] })),
    },
    {
        accessorKey: "loadingPoint",
        header: ({ column }) => _jsx(ColumnHeader, { title: "LOADING POINT", column: column, placeholder: "Filter loading point..." }),
    },
    {
        accessorKey: "truckNo",
        header: ({ column }) => _jsx(ColumnHeader, { title: "TRUCK NO", column: column, placeholder: "Filter truck no..." }),
    },
    {
        accessorKey: "transport",
        header: ({ column }) => _jsx(ColumnHeader, { title: "TRANSPORT", column: column, placeholder: "Filter transport..." }),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const payment = row.original;
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsx(DropdownMenuItem, { onClick: () => navigator.clipboard.writeText(payment.id), children: "Copy payment ID" })] })] }));
        },
    },
];
