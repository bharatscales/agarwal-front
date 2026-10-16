import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverAnchor, } from "@/components/ui/popover";
export function CreatableCombobox({ options, value, onValueChange, onCreateOption, allowCreate = true, placeholder = "Select option...", disabled = false, loading = false, searchPlaceholder = "Search...", emptyMessage = "No options found.", createLabel = "Create new", footerText, tickable = false, triggerRef, onInputKeyDown, className, }) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const inputRef = useRef(null);
    const skipCommitOnClose = useRef(false);
    const selectedOption = options.find(option => option.value === value);
    const trimmedSearch = searchValue.trim();
    const canCreate = allowCreate &&
        !!onCreateOption &&
        trimmedSearch.length > 0 &&
        !options.some(option => option.label.toLowerCase() === trimmedSearch.toLowerCase());
    const createText = useMemo(() => {
        if (!trimmedSearch)
            return createLabel;
        return `${createLabel} "${trimmedSearch}"`;
    }, [createLabel, trimmedSearch]);
    const filteredOptions = options.filter(option => option.label.toLowerCase().includes(trimmedSearch.toLowerCase()));
    const displayValue = open
        ? searchValue
        : selectedOption
            ? selectedOption.label
            : (value ?? "");
    const closeAfterSelect = () => {
        skipCommitOnClose.current = true;
        setSearchValue("");
        setOpen(false);
    };
    const commitTypedValue = (typed) => {
        if (!typed)
            return;
        const match = options.find(option => option.label.toLowerCase() === typed.toLowerCase());
        if (match) {
            onValueChange(match.value);
            return;
        }
        if (!allowCreate)
            return;
        onCreateOption?.(typed);
        onValueChange(typed);
    };
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [open]);
    const setInputRef = (node) => {
        inputRef.current = node;
        if (typeof triggerRef === "function") {
            triggerRef(node);
        }
        else if (triggerRef && "current" in triggerRef) {
            triggerRef.current = node;
        }
    };
    return (_jsxs(Popover, { open: open, onOpenChange: (next) => {
            if (!next) {
                if (!skipCommitOnClose.current) {
                    commitTypedValue(searchValue.trim());
                }
                skipCommitOnClose.current = false;
                setSearchValue("");
            }
            setOpen(next);
        }, children: [_jsx(PopoverAnchor, { asChild: true, children: _jsxs("div", { className: "relative w-full", children: [_jsx(Input, { ref: setInputRef, role: "combobox", "aria-expanded": open, disabled: disabled || loading, placeholder: loading ? "Loading..." : open ? searchPlaceholder : placeholder, value: displayValue, onChange: (event) => {
                                setSearchValue(event.target.value);
                                if (!open) {
                                    setOpen(true);
                                }
                            }, onFocus: () => {
                                setOpen(true);
                                setSearchValue(selectedOption?.label ?? "");
                            }, onClick: () => {
                                setOpen(true);
                            }, onKeyDown: onInputKeyDown, className: cn("pr-9", className) }), _jsx(ArrowRight, { className: "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" })] }) }), _jsx(PopoverContent, { className: "p-0 w-[var(--radix-popover-trigger-width)]", align: "start", onOpenAutoFocus: (event) => {
                    event.preventDefault();
                }, onCloseAutoFocus: (event) => {
                    event.preventDefault();
                }, onInteractOutside: (event) => {
                    const target = event.target;
                    if (target && inputRef.current?.contains(target)) {
                        event.preventDefault();
                    }
                }, children: _jsx(Command, { children: _jsxs("div", { className: "max-h-64 overflow-y-auto", children: [filteredOptions.length === 0 && _jsx(CommandEmpty, { children: emptyMessage }), filteredOptions.length > 0 && (_jsx(CommandGroup, { children: filteredOptions.map((option) => (_jsxs(CommandItem, { onSelect: () => {
                                        if (tickable && value === option.value) {
                                            onValueChange(null);
                                            skipCommitOnClose.current = true;
                                            setSearchValue("");
                                            return;
                                        }
                                        onValueChange(option.value);
                                        if (!tickable) {
                                            closeAfterSelect();
                                        }
                                    }, disabled: option.disabled, className: tickable ? "data-[selected=true]:bg-transparent" : undefined, children: [tickable && (_jsx(Check, { className: cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0") })), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: option.label }), option.description && (_jsx("span", { className: "text-xs text-muted-foreground", children: option.description }))] })] }, option.value))) })), canCreate && (_jsx(CommandGroup, { children: _jsxs(CommandItem, { onSelect: () => {
                                        onCreateOption?.(trimmedSearch);
                                        onValueChange(trimmedSearch);
                                        closeAfterSelect();
                                    }, children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), createText] }) })), footerText && (_jsx("div", { className: "px-3 py-2 text-xs text-muted-foreground", children: footerText }))] }) }) })] }));
}
