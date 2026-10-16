import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
export function Combobox({ options, value, onValueChange, placeholder = "Select option...", disabled = false, loading = false, searchPlaceholder = "Search...", emptyMessage = "No options found.", noOptionLabel = "No Option", showNoOption = true }) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find(option => option.value === value);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": open, className: "w-full justify-between text-left", disabled: disabled || loading, children: [_jsx("span", { className: "truncate flex-1 text-left", children: loading ? ("Loading...") : value && selectedOption ? (selectedOption.label) : (placeholder) }), _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-full p-0", children: _jsxs(Command, { children: [_jsx(CommandInput, { placeholder: searchPlaceholder }), _jsx(CommandEmpty, { children: emptyMessage }), _jsxs(CommandGroup, { children: [showNoOption && (_jsxs(CommandItem, { onSelect: () => {
                                        onValueChange(null);
                                        setOpen(false);
                                    }, children: [_jsx(Check, { className: cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0") }), noOptionLabel] })), options.map((option) => (_jsxs(CommandItem, { onSelect: () => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }, disabled: option.disabled, children: [_jsx(Check, { className: cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0") }), option.label] }, option.value)))] })] }) })] }));
}
