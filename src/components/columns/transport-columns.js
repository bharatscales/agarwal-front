import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, Copy, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
export const createTransportColumns = (onEdit, onDelete) => [
    {
        accessorKey: "sapcode",
        header: "SAP Code",
        cell: ({ row }) => {
            const sapcode = row.getValue("sapcode");
            if (!sapcode) {
                return (_jsx("span", { className: "text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm", children: "No SAP Code" }));
            }
            return (_jsx("div", { className: "flex items-center space-x-2", children: _jsx("span", { className: "font-mono text-sm", children: sapcode }) }));
        },
    },
    {
        accessorKey: "name",
        header: "Transport Name",
        cell: ({ row }) => {
            const name = row.getValue("name");
            return (_jsx("div", { className: "font-medium", children: name }));
        },
    },
    {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => {
            const address = row.getValue("address");
            if (!address) {
                return (_jsx("span", { className: "text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm", children: "No Address" }));
            }
            return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "max-w-xs truncate", title: address, children: address })] }));
        },
    },
    {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => {
            const city = row.getValue("city");
            if (!city) {
                return (_jsx("span", { className: "text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm", children: "No City" }));
            }
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: city }));
        },
    },
    {
        accessorKey: "created_at",
        header: "Created Date",
        cell: ({ row }) => {
            const created_at = row.getValue("created_at");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: new Date(created_at).toLocaleDateString() }));
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const transport = row.original;
            const { user } = useAuth();
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), transport.sapcode && (_jsxs(DropdownMenuItem, { onClick: () => navigator.clipboard.writeText(transport.sapcode), children: [_jsx(Copy, { className: "mr-2 h-4 w-4" }), "Copy SAP Code"] })), user?.role === "admin" || user?.role === "superuser" ? (_jsxs(DropdownMenuItem, { onClick: () => onEdit(transport), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit Transport"] })) : null, user?.role === "admin" || user?.role === "superuser" ? (_jsxs(DropdownMenuItem, { onClick: () => onDelete(transport), className: "text-red-600", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Transport"] })) : null] })] }));
        },
    },
];
// Keep the old export for backward compatibility
export const transportColumns = createTransportColumns(() => { }, () => { });
