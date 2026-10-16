import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { jobCardApiErrorMessage } from "@/lib/job-card-api";
export function CloseWithoutOutputDialog({ target, saving, onOpenChange, onConfirm, }) {
    const [error, setError] = useState(null);
    return (_jsx(Dialog, { open: target != null, onOpenChange: (open) => {
            if (!open)
                setError(null);
            onOpenChange(open);
        }, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Consume film" }), _jsx(DialogDescription, { children: "This film is used now. No output roll is created, and it does not return to stock. Output weight and meter are ignored. Values already entered on the loaded roll are kept. If a balance weight is entered, that weight becomes a balance roll. The film stays on this job card and becomes a parent when the output roll is created." })] }), target && (_jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("dl", { className: "grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs", children: [_jsx("dt", { className: "text-gray-500 dark:text-gray-400", children: "Film" }), _jsx("dd", { className: "text-gray-900 dark:text-gray-100", children: target.label }), _jsx("dt", { className: "text-gray-500 dark:text-gray-400", children: "Barcode" }), _jsx("dd", { className: "text-gray-900 dark:text-gray-100", children: target.barcode || "—" }), _jsx("dt", { className: "text-gray-500 dark:text-gray-400", children: "Structure" }), _jsx("dd", { className: "text-gray-900 dark:text-gray-100", children: target.structure || "—" }), _jsx("dt", { className: "text-gray-500 dark:text-gray-400", children: "Loaded weight" }), _jsx("dd", { className: "text-gray-900 dark:text-gray-100", children: target.weightKg != null ? `${Number(target.weightKg).toFixed(2)} kg` : "—" }), target.balanceKg != null && target.balanceKg > 0 && (_jsxs(_Fragment, { children: [_jsx("dt", { className: "text-gray-500 dark:text-gray-400", children: "Balance roll" }), _jsxs("dd", { className: "text-gray-900 dark:text-gray-100", children: [Number(target.balanceKg).toFixed(2), " kg"] })] }))] }), error && _jsx("p", { className: "text-xs text-red-500", children: error })] })), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: saving, onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "button", disabled: saving, onClick: async () => {
                                setError(null);
                                try {
                                    await onConfirm();
                                }
                                catch (confirmError) {
                                    setError(jobCardApiErrorMessage(confirmError, "Could not consume this roll."));
                                }
                            }, children: saving ? "Consuming…" : "Consume film" })] })] }) }));
}
export function ClosedWithoutOutputList({ rows, undoing, onUndo, }) {
    if (rows.length === 0)
        return null;
    return (_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1", children: "Consumed films" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-2", children: "These films are used. They will be parents of the next output roll." }), _jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: ["Job card", "Film", "Structure", "Loaded weight", "Wastage", "Balance", ""].map((title) => (_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: title }, title || "undo"))) }) }), _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50 last:border-0", children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: row.jobCardNumber }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: row.label }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: row.structure }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: row.weightLabel }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: row.wastageLabel }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: row.balanceLabel }), _jsx("td", { className: "py-1.5 px-2 text-right", children: _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-6 px-1.5 text-xs", title: "Undo this consume, clear wastage, and return the film to stock", disabled: undoing || !onUndo, onClick: () => {
                                                if (!onUndo)
                                                    return;
                                                if (!window.confirm(`Undo consume for ${row.label}? Wastage will be cleared, the balance roll will be removed, and the film will return to stock.`)) {
                                                    return;
                                                }
                                                onUndo(row);
                                            }, children: "Undo" }) })] }, row.id))) })] }) })] }));
}
