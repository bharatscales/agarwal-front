import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
function Header(props) {
    return _jsx(ColumnHeader, { ...props, compact: true });
}
const getStatusColor = (status) => {
    switch (status) {
        case "closed":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "pending":
        default:
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
};
export const getOrderBookColumns = ({ onEdit, onDispatch, onDelete, }) => {
    const hasActions = onEdit != null || onDispatch != null || onDelete != null;
    const columns = [
        {
            accessorKey: "orderNumber",
            header: ({ column }) => (_jsx(Header, { title: "ORDER NO", column: column, placeholder: "Filter order number..." })),
            cell: ({ row }) => {
                const orderNumber = row.getValue("orderNumber");
                return (_jsx("div", { className: "font-medium text-blue-700 dark:text-blue-400 hover:underline", children: orderNumber || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "poNo",
            header: ({ column }) => (_jsx(Header, { title: "PO NO.", column: column, placeholder: "Filter PO no..." })),
            cell: ({ row }) => {
                const poNo = row.getValue("poNo");
                return (_jsx("div", { className: "font-medium", children: poNo || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "orderDate",
            header: ({ column }) => (_jsx(Header, { title: "ORDER DATE", column: column, placeholder: "Filter order date..." })),
            cell: ({ row }) => {
                const orderDate = row.getValue("orderDate");
                return (_jsx("div", { className: "text-gray-600 dark:text-gray-400", children: orderDate || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "partyCode",
            header: ({ column }) => (_jsx(Header, { title: "PARTY CODE", column: column, placeholder: "Filter party code..." })),
            cell: ({ row }) => {
                const partyCode = row.getValue("partyCode");
                return (_jsx("div", { className: "text-gray-600 dark:text-gray-400", children: partyCode || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "itemCode",
            header: ({ column }) => (_jsx(Header, { title: "ITEM CODE", column: column, placeholder: "Filter item code..." })),
            cell: ({ row }) => {
                const itemCode = row.getValue("itemCode");
                return (_jsx("div", { className: "text-gray-600 dark:text-gray-400", children: itemCode || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "totalGsm",
            header: ({ column }) => (_jsx(Header, { title: "TOTAL GSM", column: column, placeholder: "Filter total GSM...", wrap: true })),
            cell: ({ row }) => {
                const value = row.getValue("totalGsm");
                return (_jsx("div", { children: value != null ? Number(value).toFixed(2) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "size",
            header: ({ column }) => (_jsx(Header, { title: "SIZE", column: column, placeholder: "Filter size..." })),
            cell: ({ row }) => {
                const value = row.getValue("size");
                return (_jsx("div", { children: value != null ? String(value) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "structure",
            header: ({ column }) => (_jsx(Header, { title: "STRUCTURE", column: column, placeholder: "Filter structure..." })),
            cell: ({ row }) => {
                const value = row.getValue("structure");
                return (_jsx("div", { className: "text-gray-600 dark:text-gray-400 min-w-[320px] max-w-[420px] truncate", title: value || undefined, children: value || _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "qty",
            header: ({ column }) => (_jsx(Header, { title: "QTY (KG)", column: column, placeholder: "Filter qty...", wrap: true })),
            cell: ({ row }) => {
                const qty = row.getValue("qty");
                return _jsx("div", { children: Number(qty).toFixed(2) });
            },
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "dispatchQty",
            header: ({ column }) => (_jsx(Header, { title: "DISPATCH QTY", column: column, placeholder: "Filter dispatch qty...", wrap: true })),
            cell: ({ row }) => {
                const value = row.getValue("dispatchQty");
                return _jsx("div", { children: Number(value || 0).toFixed(2) });
            },
            filterFn: includesStringFilterFn,
        },
        {
            id: "pendingQty",
            accessorFn: (row) => Number(row.qty || 0) - Number(row.dispatchQty || 0),
            header: ({ column }) => (_jsx(Header, { title: "PENDING QTY", column: column, placeholder: "Filter pending qty...", wrap: true })),
            cell: ({ getValue }) => _jsx("div", { children: Number(getValue() ?? 0).toFixed(2) }),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "coilWidth",
            header: ({ column }) => (_jsx(Header, { title: "COIL WIDTH", column: column, placeholder: "Filter coil width...", wrap: true })),
            cell: ({ row }) => {
                const value = row.getValue("coilWidth");
                return (_jsx("div", { children: value != null ? String(value) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "repeatLength",
            header: ({ column }) => (_jsx(Header, { title: "REPEAT LENGTH", column: column, placeholder: "Filter repeat length...", wrap: true })),
            cell: ({ row }) => {
                const value = row.getValue("repeatLength");
                return (_jsx("div", { children: value != null ? String(value) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "noOfPanel",
            header: ({ column }) => (_jsx(Header, { title: "NO OF PANEL", column: column, placeholder: "Filter no of panel...", wrap: true })),
            cell: ({ row }) => {
                const value = row.getValue("noOfPanel");
                return (_jsx("div", { children: value != null ? String(value) : _jsx("span", { className: "text-gray-400", children: "-" }) }));
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (_jsx(Header, { title: "STATUS", column: column, placeholder: "Filter status..." })),
            cell: ({ row }) => {
                const status = (row.getValue("status") || "pending").toLowerCase();
                return (_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`, children: status.toUpperCase() }));
            },
        },
        ...(hasActions
            ? [
                {
                    id: "actions",
                    cell: ({ row }) => {
                        const order = row.original;
                        return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), onEdit != null && (_jsxs(DropdownMenuItem, { onClick: () => onEdit(order), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit order"] })), onDispatch != null && (_jsxs(DropdownMenuItem, { onClick: () => onDispatch(order), children: [_jsx(Truck, { className: "mr-2 h-4 w-4" }), "Dispatch"] })), onDelete != null && (_jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(order), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete order"] }))] })] }));
                    },
                },
            ]
            : []),
    ];
    return columns;
};
