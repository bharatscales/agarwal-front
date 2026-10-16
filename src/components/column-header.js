import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpDown, FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
function twoLineTitle(title) {
    const parts = title.trim().split(/\s+/);
    if (parts.length < 2)
        return title;
    const last = parts.pop();
    return `${parts.join(" ")}\n${last}`;
}
export function ColumnHeader({ title, column, placeholder, wrap, compact }) {
    const label = wrap ? twoLineTitle(title) : title;
    const iconClass = compact ? "size-2.5" : "size-3.5";
    const btnClass = compact
        ? "h-3.5 w-3.5 min-h-0 min-w-0 p-0 [&_svg]:size-2.5"
        : "h-4 w-4 min-h-0 min-w-0 p-0 [&_svg]:size-3.5";
    return (_jsxs("div", { className: `flex justify-between gap-1 ${wrap ? "items-start w-min" : "items-center w-full"}`, children: [_jsx("span", { "data-wrap-header": wrap ? "" : undefined, className: `text-black dark:text-zinc-300 font-bold ${wrap ? "whitespace-pre-line leading-tight" : ""}`, children: label }), _jsxs("div", { className: `flex flex-col -mr-2 ${compact ? "gap-0" : "gap-0.5"}`, children: [_jsx(Button, { variant: "ghost", onClick: () => column.toggleSorting(column.getIsSorted() === "asc"), className: `flex items-center ${btnClass} text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent dark:hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0`, children: _jsx(ArrowUpDown, { className: iconClass }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: `${btnClass} hover:bg-transparent dark:hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 ${column.getFilterValue() ? 'text-black dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'} hover:text-zinc-900 dark:hover:text-zinc-100`, children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(FilterIcon, { className: iconClass })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { className: "text-[10px]", children: _jsx(FilterIcon, { className: "mr-2 h-4 w-4" }) }), _jsx("div", { className: "p-2", children: _jsx("input", { placeholder: placeholder || `Filter ${title.toLowerCase()}...`, value: column.getFilterValue() ?? "", onChange: (event) => column.setFilterValue(event.target.value), className: "w-full p-1 text-xs border rounded" }) })] })] })] })] }));
}
