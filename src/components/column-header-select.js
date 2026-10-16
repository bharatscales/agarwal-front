import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpDown, FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export function ColumnHeaderSelect({ title, column, options }) {
    return (_jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("span", { className: "text-black dark:text-zinc-300 text-sm font-bold", children: title }), _jsxs("div", { className: "flex flex-col gap-1 -mr-2", children: [_jsx(Button, { variant: "ghost", onClick: () => column.toggleSorting(column.getIsSorted() === "asc"), className: "flex items-center h-3 w-3 p-1 dark:text-zinc-600 text-zinc-300 focus:outline-none focus:ring-0 focus-visible:ring-0", children: _jsx(ArrowUpDown, { className: "h-1 w-1" }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: `h-3 w-3 p-1 focus:outline-none focus:ring-0 focus-visible:ring-0 ${column.getFilterValue() ? 'text-black dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'}`, children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(FilterIcon, { className: "h-1 w-1" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { className: "text-[10px]", children: _jsx(FilterIcon, { className: "mr-2 h-4 w-4" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-2 p-2", children: [options.map((option) => (_jsx(DropdownMenuItem, { onSelect: e => e.preventDefault(), onClick: e => {
                                                    e.preventDefault();
                                                    const current = column.getFilterValue();
                                                    const next = current?.includes(option)
                                                        ? current.filter((s) => s !== option)
                                                        : [...(current || []), option];
                                                    column.setFilterValue(next.length ? next : undefined);
                                                }, className: "p-0", children: _jsx(Badge, { variant: (column.getFilterValue()?.includes(option)) ? "default" : "outline", className: "w-full justify-center", children: option.charAt(0).toUpperCase() + option.slice(1) }) }, option))), _jsx(DropdownMenuItem, { onClick: () => column.setFilterValue(undefined), className: "p-0 col-span-2", children: _jsx(Badge, { variant: "destructive", className: "w-full justify-center", children: "Clear" }) })] })] })] })] })] }));
}
