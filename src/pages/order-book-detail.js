import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FgStageBomReadonly } from "@/components/fg-stage-bom-readonly";
import { materialRowsFromBom } from "@/lib/bom-material";
import { getAllChemStock } from "@/lib/chem-stock-api";
import { getItem, getItemBom } from "@/lib/item-api";
import { getOrderBook, getOrderDispatches } from "@/lib/order-book-api";
import { getAllRollsStock } from "@/lib/rolls-stock-api";
import { getAllWorkOrders } from "@/lib/work-order-api";
const dash = (value) => {
    if (value == null || value === "")
        return _jsx("span", { className: "text-gray-400", children: "-" });
    return String(value);
};
const formatQty = (value) => {
    if (value == null || Number.isNaN(Number(value)))
        return "-";
    return Number(value).toFixed(2);
};
const formatDate = (value) => {
    if (!value)
        return "-";
    return value.slice(0, 10);
};
const statusClass = (status) => {
    switch (status) {
        case "closed":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "pending":
        default:
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
};
const woStatusClass = (status) => {
    switch (status) {
        case "in_progress":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
        case "completed":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
};
function Field({ label, children }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: label }), _jsx("p", { className: "text-sm font-semibold mt-1 break-words", children: children })] }));
}
export default function OrderBookDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [item, setItem] = useState(null);
    const [bomLines, setBomLines] = useState([]);
    const [filmStock, setFilmStock] = useState([]);
    const [chemStock, setChemStock] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bomLoading, setBomLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = async () => {
        if (!id)
            return;
        const orderId = Number(id);
        if (!Number.isFinite(orderId)) {
            setError("Invalid order");
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const row = await getOrderBook(orderId);
            setOrder(row);
            const extra = [
                getOrderDispatches(orderId)
                    .then(setDispatches)
                    .catch(() => setDispatches([])),
            ];
            if (row.itemId) {
                setBomLoading(true);
                extra.push(getItem(row.itemId)
                    .then(setItem)
                    .catch(() => setItem(null)));
                extra.push(getItemBom(row.itemId)
                    .then(setBomLines)
                    .catch(() => setBomLines([]))
                    .finally(() => setBomLoading(false)));
                extra.push(getAllWorkOrders(0, 500)
                    .then((rows) => setWorkOrders(rows.filter((wo) => wo.itemId === row.itemId)))
                    .catch(() => setWorkOrders([])));
                extra.push(Promise.all([
                    getAllRollsStock(0, 5000, false, "virgin_rm").catch(() => []),
                    getAllRollsStock(0, 5000, false, "rm_balance").catch(() => []),
                    getAllChemStock(0, 5000, "ink", false).catch(() => []),
                    getAllChemStock(0, 5000, "adhesive", false).catch(() => []),
                    getAllChemStock(0, 5000, "chemical", false).catch(() => []),
                ]).then(([virgin, balance, ink, adhesive, chemical]) => {
                    setFilmStock([...virgin, ...balance]);
                    setChemStock([...ink, ...adhesive, ...chemical]);
                }));
            }
            else {
                setItem(null);
                setBomLines([]);
                setFilmStock([]);
                setChemStock([]);
                setWorkOrders([]);
            }
            await Promise.all(extra);
        }
        catch {
            setOrder(null);
            setError("Failed to load order details. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, [id]);
    const pendingQty = useMemo(() => {
        if (!order)
            return 0;
        return Math.max(0, Number(order.qty || 0) - Number(order.dispatchQty || 0));
    }, [order]);
    const materialRows = useMemo(() => materialRowsFromBom({
        bomLines,
        orderQtyKg: Number(order?.qty || 0),
        filmStock,
        chemStock,
    }), [bomLines, order?.qty, filmStock, chemStock]);
    if (isLoading) {
        return (_jsx("div", { className: "px-6 pt-2 pb-6", children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading order details..." })] }) }) }));
    }
    if (error || !order) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs(Button, { variant: "ghost", onClick: () => navigate("/manufacturing/order-book"), className: "mb-4", children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to Order Book"] }), _jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsx("p", { className: "text-red-500", children: error || "Order not found" }) }) })] }));
    }
    const status = (order.status || "pending").toLowerCase();
    return (_jsxs("div", { className: "px-1 sm:px-3 pt-2 pb-6", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => navigate("/manufacturing/order-book"), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back"] }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("h1", { className: "text-base sm:text-lg font-bold truncate", children: ["Order: ", order.orderNumber || `#${order.id}`] }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${statusClass(status)}`, children: status.toUpperCase() })] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: order.itemName || order.itemCode || "Item details" })] })] }), _jsxs(Button, { onClick: load, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline ml-2", children: "Refresh" })] })] }), _jsxs(Card, { className: "mb-3", children: [_jsx(CardHeader, { className: "py-3", children: _jsx(CardTitle, { className: "text-sm", children: "Order details" }) }), _jsx(CardContent, { className: "pt-0 pb-3", children: _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: [_jsx(Field, { label: "Order No", children: dash(order.orderNumber) }), _jsx(Field, { label: "PO No.", children: dash(order.poNo) }), _jsx(Field, { label: "Order Date", children: formatDate(order.orderDate) }), _jsx(Field, { label: "Party", children: order.partyName || order.partyCode || _jsx("span", { className: "text-gray-400", children: "-" }) }), _jsx(Field, { label: "Qty (KG)", children: formatQty(order.qty) }), _jsx(Field, { label: "Dispatch Qty (KG)", children: formatQty(order.dispatchQty) }), _jsx(Field, { label: "Pending Qty (KG)", children: formatQty(pendingQty) }), _jsx(Field, { label: "Total GSM", children: order.totalGsm != null ? Number(order.totalGsm).toFixed(2) : dash(null) }), _jsx(Field, { label: "Size", children: dash(order.size) }), _jsx(Field, { label: "Coil Width", children: dash(order.coilWidth) }), _jsx(Field, { label: "Repeat Length", children: dash(order.repeatLength) }), _jsx(Field, { label: "No of Panel", children: dash(order.noOfPanel) }), _jsx("div", { className: "col-span-2 md:col-span-3 lg:col-span-4", children: _jsx(Field, { label: "Structure", children: dash(order.structure) }) }), order.remarks ? (_jsx("div", { className: "col-span-2 md:col-span-3 lg:col-span-4", children: _jsx(Field, { label: "Remarks", children: order.remarks }) })) : null] }) })] }), _jsxs(Card, { className: "mb-3", children: [_jsxs(CardHeader, { className: "py-3", children: [_jsx(CardTitle, { className: "text-sm", children: "Item details" }), _jsx(CardDescription, { className: "text-xs", children: "From Item Master for this FG variety." })] }), _jsxs(CardContent, { className: "pt-0 pb-3", children: [item ? (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: [_jsx(Field, { label: "Item Code", children: item.itemCode }), _jsx(Field, { label: "Item Name", children: item.itemName }), _jsx(Field, { label: "Item Group", children: item.itemGroup }), _jsx(Field, { label: "UOM", children: dash(item.uom) }), _jsx(Field, { label: "Abbreviation", children: dash(item.abv) }), _jsx(Field, { label: "Party", children: item.partyName || item.partyCode || dash(null) })] })) : (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [_jsx(Field, { label: "Item Code", children: dash(order.itemCode) }), _jsx(Field, { label: "Item Name", children: dash(order.itemName) })] })), item && item.routing.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-2", children: "Routing" }), _jsx("div", { className: "flex flex-wrap gap-2", children: item.routing
                                            .slice()
                                            .sort((a, b) => a.sno - b.sno)
                                            .map((step) => (_jsxs("span", { className: "px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", children: [step.sno, ". ", step.operation] }, `${step.sno}-${step.operation}`))) })] }))] })] }), order.itemId != null && (_jsxs(Card, { className: "mb-3", children: [_jsxs(CardHeader, { className: "py-3", children: [_jsx(CardTitle, { className: "text-sm", children: "BOM & structure" }), _jsx(CardDescription, { className: "text-xs", children: "Loaded from the FG variety in Item Master (read-only)." })] }), _jsx(CardContent, { className: "pt-0 pb-3", children: bomLoading ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading BOM\u2026" })) : (_jsx(FgStageBomReadonly, { lines: bomLines })) })] })), order.itemId != null && (_jsxs(Card, { className: "mb-3", children: [_jsxs(CardHeader, { className: "py-3", children: [_jsx(CardTitle, { className: "text-sm", children: "Required vs available material" }), _jsx(CardDescription, { className: "text-xs", children: "Required is this order qty split by BOM GSM share. Available is current RM stock (virgin RM + RM balance for film; ink / adhesive / chemical stock for others)." })] }), _jsx(CardContent, { className: "pt-0 pb-3", children: bomLoading ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading material\u2026" })) : materialRows.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No BOM RM lines with GSM to calculate material for this order." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-500 dark:text-gray-400 border-b", children: [_jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Item" }), _jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Stage" }), _jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Spec" }), _jsx("th", { className: "py-1.5 pr-4 font-medium text-right", children: "Required (KG)" }), _jsx("th", { className: "py-1.5 pr-4 font-medium text-right", children: "Available (KG)" }), _jsx("th", { className: "py-1.5 font-medium text-right", children: "Shortage (KG)" })] }) }), _jsx("tbody", { children: materialRows.map((row) => {
                                            const shortage = Math.max(0, Math.round((row.requiredKg - row.availableKg) * 100) / 100);
                                            const short = shortage > 0.009;
                                            const spec = row.isFilm
                                                ? [
                                                    row.size != null ? `${row.size} mm` : null,
                                                    row.micron != null ? `${row.micron} µ` : null,
                                                    row.gsm > 0 ? `${row.gsm} gsm` : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" / ")
                                                : row.gsm > 0
                                                    ? `${row.gsm} gsm`
                                                    : "—";
                                            return (_jsxs("tr", { className: "border-b last:border-0", children: [_jsxs("td", { className: "py-1.5 pr-4", children: [_jsx("div", { className: "font-medium", children: row.itemCode || row.itemName || `Item #${row.rmItemId}` }), row.itemCode && row.itemName ? (_jsx("div", { className: "text-xs text-muted-foreground", children: row.itemName })) : null] }), _jsx("td", { className: "py-1.5 pr-4", children: row.stages.join(", ") || "—" }), _jsx("td", { className: "py-1.5 pr-4 tabular-nums", children: spec || "—" }), _jsx("td", { className: "py-1.5 pr-4 text-right tabular-nums font-medium", children: formatQty(row.requiredKg) }), _jsx("td", { className: "py-1.5 pr-4 text-right tabular-nums", children: formatQty(row.availableKg) }), _jsx("td", { className: `py-1.5 text-right tabular-nums font-medium ${short ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`, children: short ? formatQty(shortage) : "0.00" })] }, row.key));
                                        }) })] }) })) })] })), _jsxs(Card, { className: "mb-3", children: [_jsx(CardHeader, { className: "py-3", children: _jsx(CardTitle, { className: "text-sm", children: "Dispatches" }) }), _jsx(CardContent, { className: "pt-0 pb-3", children: dispatches.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No dispatches recorded for this order." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-500 dark:text-gray-400 border-b", children: [_jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Date" }), _jsx("th", { className: "py-1.5 font-medium", children: "Qty (KG)" })] }) }), _jsx("tbody", { children: dispatches.map((row) => (_jsxs("tr", { className: "border-b last:border-0", children: [_jsx("td", { className: "py-1.5 pr-4", children: formatDate(row.dispatchDate) }), _jsx("td", { className: "py-1.5 font-medium", children: formatQty(row.qty) })] }, row.id))) })] }) })) })] }), _jsxs(Card, { className: "mb-3", children: [_jsxs(CardHeader, { className: "py-3", children: [_jsx(CardTitle, { className: "text-sm", children: "Related work orders" }), _jsx(CardDescription, { className: "text-xs", children: "Work orders for the same item." })] }), _jsx(CardContent, { className: "pt-0 pb-3", children: workOrders.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No work orders found for this item." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-500 dark:text-gray-400 border-b", children: [_jsx("th", { className: "py-1.5 pr-4 font-medium", children: "WO Number" }), _jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Status" }), _jsx("th", { className: "py-1.5 pr-4 font-medium", children: "Planned (KG)" }), _jsx("th", { className: "py-1.5 font-medium", children: "Produced (KG)" })] }) }), _jsx("tbody", { children: workOrders.map((wo) => (_jsxs("tr", { className: "border-b last:border-0 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800", onClick: () => navigate(`/manufacturing/work-order/${wo.id}`), children: [_jsx("td", { className: "py-1.5 pr-4 font-medium text-blue-700 dark:text-blue-400", children: wo.woNumber || `#${wo.id}` }), _jsx("td", { className: "py-1.5 pr-4", children: wo.status ? (_jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-medium ${woStatusClass(wo.status)}`, children: wo.status.replace("_", " ").toUpperCase() })) : (_jsx("span", { className: "text-gray-400", children: "-" })) }), _jsx("td", { className: "py-1.5 pr-4", children: formatQty(wo.plannedQty) }), _jsx("td", { className: "py-1.5", children: formatQty(wo.producedQty) })] }, wo.id))) })] }) })) })] })] }));
}
