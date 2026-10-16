import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
export const partyColumns = [
    {
        accessorKey: "sapcode",
        header: "SAP Code",
        cell: ({ row }) => {
            const sapcode = row.getValue("sapcode");
            return (_jsx("div", { className: "font-mono text-sm", children: sapcode }));
        },
    },
    {
        accessorKey: "name",
        header: "Party Name",
        cell: ({ row }) => {
            const name = row.getValue("name");
            return (_jsx("div", { className: "font-medium", children: name }));
        },
    },
    {
        accessorKey: "addresses",
        header: "Addresses",
        cell: ({ row }) => {
            const addresses = row.getValue("addresses");
            if (!addresses || addresses.length === 0) {
                return (_jsx("span", { className: "text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm", children: "No Addresses" }));
            }
            return (_jsx(AddressesCell, { addresses: addresses }));
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const party = row.original;
            const { user } = useAuth();
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsx(DropdownMenuItem, { onClick: () => navigator.clipboard.writeText(party.sapcode), children: "Copy SAP Code" }), (user?.role === "admin" || user?.role === "superuser") && (_jsxs(DropdownMenuItem, { children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit Party"] })), (user?.role === "admin" || user?.role === "superuser") && (_jsxs(DropdownMenuItem, { className: "text-red-600", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Party"] }))] })] }));
        },
    },
];
// Separate component for the addresses cell with expand/collapse functionality
function AddressesCell({ addresses }) {
    const [isExpanded, setIsExpanded] = useState(false);
    if (addresses.length === 0) {
        return (_jsx("span", { className: "text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm", children: "No Addresses" }));
    }
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };
    return (_jsxs("div", { className: "space-y-2", children: [addresses.slice(0, 2).map((address) => (_jsxs("div", { className: "flex items-center space-x-2 text-sm", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsxs("span", { className: "max-w-xs truncate", title: address.address, children: [address.name, ": ", address.address] })] }, address.id))), addresses.length > 2 && (_jsx("div", { className: "flex items-center space-x-2", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: toggleExpanded, className: "h-6 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300", children: isExpanded ? (_jsxs(_Fragment, { children: [_jsx(ChevronDown, { className: "h-3 w-3 mr-1" }), "Show Less"] })) : (_jsxs(_Fragment, { children: [_jsx(ChevronRight, { className: "h-3 w-3 mr-1" }), "Show ", addresses.length - 2, " More"] })) }) })), isExpanded && addresses.length > 2 && (_jsx("div", { className: "space-y-1 pl-4 border-l-2 border-gray-200 dark:border-gray-700", children: addresses.slice(2).map((address) => (_jsxs("div", { className: "flex items-center space-x-2 text-sm", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsxs("span", { className: "max-w-xs truncate", title: address.address, children: [address.name, ": ", address.address] })] }, address.id))) }))] }));
}
