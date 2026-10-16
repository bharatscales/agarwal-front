import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
export const producedRollEditDialogClassName = "sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card text-card-foreground border-border";
export const producedRollEditInputClassName = "h-7 w-20 px-1.5 text-xs text-foreground dark:bg-input/50 dark:text-foreground";
export function ProducedRollEditField({ label, className, children, }) {
    return (_jsxs("div", { className: cn("space-y-1.5", className), children: [_jsx(Label, { className: "text-xs font-medium text-muted-foreground", children: label }), children] }));
}
export function isProducedRollLocked(row) {
    return Boolean(row.consumed || row.issued);
}
export const PRODUCED_ROLL_DELETE_CONFIRM = "Delete this produced roll? If it is the last produced roll from the loaded parent, its leftover balance roll will also be deleted.";
export function ProducedRollRowActions({ reprintDisabled, mutateDisabled, onReprint, onEdit, onDelete, }) {
    return (_jsxs("div", { className: "flex items-center justify-center gap-0.5", children: [onReprint ? (_jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", disabled: reprintDisabled, title: "Reprint", onClick: onReprint, children: _jsx(Printer, { className: "h-3.5 w-3.5" }) })) : null, _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", disabled: mutateDisabled, title: "Edit", onClick: onEdit, children: _jsx(Pencil, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", disabled: mutateDisabled, title: "Delete", onClick: onDelete, children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }));
}
