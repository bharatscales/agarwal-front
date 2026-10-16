import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderDispatch, getOrderDispatches, } from "@/lib/order-book-api";
const todayIso = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};
const formatDate = (value) => {
    if (!value)
        return "-";
    return value.slice(0, 10);
};
export function OrderBookDispatchDialog({ open, order, onOpenChange, onDispatched }) {
    const [dispatchDate, setDispatchDate] = useState(todayIso());
    const [qty, setQty] = useState("");
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const remaining = Number(order?.qty || 0) - Number(order?.dispatchQty || 0);
    useEffect(() => {
        if (!open || !order)
            return;
        setDispatchDate(todayIso());
        setQty("");
        setError(null);
        setIsLoadingHistory(true);
        getOrderDispatches(order.id)
            .then(setHistory)
            .catch(() => setHistory([]))
            .finally(() => setIsLoadingHistory(false));
    }, [open, order]);
    const handleClose = () => {
        if (isSubmitting)
            return;
        onOpenChange(false);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!order)
            return;
        const dispatchQty = Number(qty);
        if (!Number.isFinite(dispatchQty) || dispatchQty <= 0) {
            setError("Dispatch quantity must be a positive number");
            return;
        }
        setIsSubmitting(true);
        createOrderDispatch(order.id, {
            dispatchDate: dispatchDate || todayIso(),
            qty: dispatchQty,
        })
            .then((updated) => {
            onDispatched(updated);
            onOpenChange(false);
        })
            .catch((err) => {
            const detail = err.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Failed to save dispatch. Please try again.");
        })
            .finally(() => {
            setIsSubmitting(false);
        });
    };
    if (!open || !order)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-lg max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Dispatch order" }), _jsxs(CardDescription, { children: [order.orderNumber || `Order #${order.id}`, remaining >= 0
                                            ? ` — remaining ${remaining.toFixed(2)} KG`
                                            : ` — over by ${Math.abs(remaining).toFixed(2)} KG`] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleClose, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Order qty" }), _jsxs("p", { className: "font-medium", children: [Number(order.qty).toFixed(2), " KG"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Already dispatched" }), _jsxs("p", { className: "font-medium", children: [Number(order.dispatchQty || 0).toFixed(2), " KG"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "dispatchDate", children: "Dispatch date *" }), _jsx(Input, { id: "dispatchDate", type: "date", value: dispatchDate, onChange: (e) => setDispatchDate(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "dispatchQty", children: "Dispatch quantity *" }), _jsx(Input, { id: "dispatchQty", type: "number", step: "0.01", min: "0", value: qty, onChange: (e) => {
                                                        setQty(e.target.value);
                                                        if (error)
                                                            setError(null);
                                                    }, placeholder: "Enter quantity", className: error ? "border-red-500" : "" })] })] }), error && _jsx("p", { className: "text-sm text-red-500", children: error }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium", children: "Previous dispatches" }), isLoadingHistory ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" })) : history.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No dispatches recorded yet." })) : (_jsx("div", { className: "rounded-md border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/40 text-left", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Date" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Qty (KG)" })] }) }), _jsx("tbody", { children: history.map((row) => (_jsxs("tr", { className: "border-b last:border-0", children: [_jsx("td", { className: "px-3 py-2", children: formatDate(row.dispatchDate) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: Number(row.qty).toFixed(2) })] }, row.id))) })] }) }))] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleClose, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSubmitting, children: isSubmitting ? "Saving…" : "Save dispatch" })] })] })] }) }));
}
