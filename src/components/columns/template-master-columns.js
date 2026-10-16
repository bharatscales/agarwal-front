import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export const getTemplateMasterColumns = ({ onEdit, onDelete, isSuperUser = false, }) => [
    {
        accessorKey: "name",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "NAME", column: column, placeholder: "Filter name..." })),
        cell: ({ row }) => {
            const name = row.getValue("name");
            return _jsx("div", { className: "font-medium", children: name });
        },
    },
    {
        accessorKey: "fileType",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "FILE TYPE", column: column, placeholder: "Filter file type..." })),
        cell: ({ row }) => {
            const fileType = row.getValue("fileType");
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: fileType });
        },
    },
    {
        accessorKey: "defaultForm",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "DEFAULT FORM", column: column, placeholder: "Filter default form..." })),
        cell: ({ row }) => {
            const defaultForm = row.getValue("defaultForm");
            if (!defaultForm) {
                return _jsx("div", { className: "text-sm text-gray-400 dark:text-gray-500", children: "-" });
            }
            // Format the enum value for display
            const displayValue = defaultForm === "stock_roll_stk"
                ? "Stock Roll STK"
                : defaultForm === "stock_ink_stk"
                    ? "Stock Ink STK"
                    : defaultForm === "wip-printing"
                        ? "WIP Printing"
                        : defaultForm === "wip-lamination"
                            ? "WIP Lamination"
                            : defaultForm === "wip-slitting"
                                ? "WIP Slitting"
                                : defaultForm === "wip-ecl"
                                    ? "WIP ECL"
                                    : defaultForm;
            return _jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: displayValue });
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const template = row.original;
            // Only show actions menu for superusers
            if (!isSuperUser) {
                return null;
            }
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(template), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit template"] }), _jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(template), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete template"] })] })] }));
        },
    },
];
