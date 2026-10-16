import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { RefreshCw, ChevronDown, FileSpreadsheet, Send } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getRollsStockColumns } from "@/components/columns/rolls-stock-columns";
import { getAllRollsStock, exportRollsStockItemWiseXlsx, exportRollsStockSummaryXlsx, exportRollsStockSizeWise2Xlsx, bulkIssueRollsStock } from "@/lib/rolls-stock-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItems } from "@/lib/item-api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
const PAGE_SIZE = 100;
function todayInIndia() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function getStockReportConfig(pathname) {
    if (pathname.endsWith("/rm-balance")) {
        return {
            title: "RM Balance",
            stage: "rm_balance",
            description: "Leftover RM film from printing, with the same item, size, micron, and grade as the loaded parent roll.",
            itemDescription: (code) => `Viewing RM Balance stock for item: ${code}`,
            exportPrefix: "RM-Balance",
        };
    }
    return {
        title: "Rm Film Stock",
        stage: "virgin_rm",
        description: "View and analyze RM film stock (virgin RM stage only).",
        itemDescription: (code) => `Viewing virgin RM film stock for item: ${code}`,
        exportPrefix: "Rm-Film-Stock",
    };
}
export default function StockReport() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const itemCodeFilter = searchParams.get("itemCode") ?? undefined;
    const config = getStockReportConfig(location.pathname);
    const [rollsStock, setRollsStock] = useState([]);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isIssuing, setIsIssuing] = useState(false);
    const [sizeWiseOpen, setSizeWiseOpen] = useState(false);
    const [sizeWiseDate, setSizeWiseDate] = useState(todayInIndia);
    const [sizeWiseError, setSizeWiseError] = useState(null);
    const [tableKey, setTableKey] = useState(0);
    const nextSkipRef = useRef(0);
    const itemCustomerMap = useMemo(() => {
        const map = {};
        for (const item of items) {
            if (item.partyName) {
                map[item.itemCode] = item.partyName;
            }
        }
        return map;
    }, [items]);
    const filteredRollsStock = useMemo(() => {
        const withCustomer = rollsStock.map((row) => ({
            ...row,
            customerName: itemCustomerMap[row.itemCode] ?? row.customerName ?? null,
        }));
        if (!itemCodeFilter)
            return withCustomer;
        return withCustomer.filter((row) => row.itemCode === itemCodeFilter);
    }, [rollsStock, itemCodeFilter, itemCustomerMap]);
    const fetchRollsStock = useCallback(async (reset = true) => {
        try {
            if (reset) {
                setIsLoading(true);
                setHasMore(true);
                nextSkipRef.current = 0;
            }
            setError(null);
            const start = reset ? 0 : nextSkipRef.current;
            const limit = PAGE_SIZE;
            const data = await getAllRollsStock(start, limit, false, config.stage);
            if (reset) {
                setRollsStock(data);
                nextSkipRef.current = data.length;
            }
            else {
                setRollsStock((prev) => [...prev, ...data]);
                nextSkipRef.current = start + data.length;
            }
            setHasMore(data.length === limit);
        }
        catch (err) {
            console.error("Error fetching rolls stock:", err);
            setError("Failed to load film stock");
            if (reset)
                setRollsStock([]);
        }
        finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [config.stage]);
    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingMore || isLoading)
            return;
        setIsLoadingMore(true);
        fetchRollsStock(false);
    }, [hasMore, isLoadingMore, isLoading, fetchRollsStock]);
    useEffect(() => {
        fetchRollsStock();
    }, [fetchRollsStock]);
    useEffect(() => {
        getItems(0, 1000)
            .then(setItems)
            .catch(() => setItems([]));
    }, []);
    const handleRefresh = () => {
        fetchRollsStock();
    };
    const handleBulkIssue = useCallback(async (selectedRows) => {
        if (selectedRows.length === 0)
            return;
        try {
            setIsIssuing(true);
            setError(null);
            await bulkIssueRollsStock(selectedRows.map((r) => r.id));
            await fetchRollsStock();
            setTableKey((k) => k + 1);
        }
        catch (err) {
            console.error("Bulk issue failed:", err);
            setError("Failed to issue selected rolls. Please try again.");
        }
        finally {
            setIsIssuing(false);
        }
    }, [fetchRollsStock]);
    const handleItemWiseExportXlsx = async () => {
        try {
            setIsExporting(true);
            const blob = await exportRollsStockItemWiseXlsx(false, config.stage);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${config.exportPrefix}-ItemWise-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error("Export failed:", err);
            setError("Export failed. Please try again.");
        }
        finally {
            setIsExporting(false);
        }
    };
    const openSizeWiseDialog = () => {
        setSizeWiseDate(todayInIndia());
        setSizeWiseError(null);
        setSizeWiseOpen(true);
    };
    const handleSizeWiseExportXlsx = async () => {
        if (!sizeWiseDate) {
            setSizeWiseError("Choose a report date.");
            return;
        }
        try {
            setIsExporting(true);
            setSizeWiseError(null);
            const blob = await exportRollsStockSizeWise2Xlsx(sizeWiseDate, itemCodeFilter, config.stage);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${config.exportPrefix}-SizeWise2-${sizeWiseDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setSizeWiseOpen(false);
        }
        catch (err) {
            console.error("Export failed:", err);
            setSizeWiseError("Export failed. Please try again.");
        }
        finally {
            setIsExporting(false);
        }
    };
    const handleSummaryExportXlsx = async () => {
        try {
            setIsExporting(true);
            const blob = await exportRollsStockSummaryXlsx(itemCodeFilter, false, config.stage);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download =
                itemCodeFilter != null && itemCodeFilter.trim() !== ""
                    ? `${itemCodeFilter.trim()}_summary_${dateStr}.xlsx`
                    : `${config.exportPrefix}-Summary-${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error("Export failed:", err);
            setError("Export failed. Please try again.");
        }
        finally {
            setIsExporting(false);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h1", { className: "text-lg sm:text-xl font-bold", children: [config.title, itemCodeFilter ? ` — ${itemCodeFilter}` : ""] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: itemCodeFilter
                                ? config.itemDescription(itemCodeFilter)
                                : config.description })] }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading film stock..." })] }) })] }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-lg sm:text-xl font-bold", children: [config.title, itemCodeFilter ? ` — ${itemCodeFilter}` : ""] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: itemCodeFilter
                                    ? config.itemDescription(itemCodeFilter)
                                    : config.description })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", children: ["Export", _jsx(ChevronDown, { className: "ml-2 h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [!itemCodeFilter && (_jsxs(DropdownMenuItem, { onClick: handleItemWiseExportXlsx, disabled: isExporting, children: [_jsx(FileSpreadsheet, { className: "mr-2 h-4 w-4" }), isExporting ? "Exporting..." : "Item wise export .xlsx"] })), _jsxs(DropdownMenuItem, { onClick: handleSummaryExportXlsx, disabled: isExporting, children: [_jsx(FileSpreadsheet, { className: "mr-2 h-4 w-4" }), isExporting ? "Exporting..." : "Summary .xlsx"] }), _jsxs(DropdownMenuItem, { onSelect: () => {
                                                    window.setTimeout(() => openSizeWiseDialog(), 0);
                                                }, disabled: isExporting, children: [_jsx(FileSpreadsheet, { className: "mr-2 h-4 w-4" }), "Size wise report 2"] })] })] }), _jsx(Dialog, { open: sizeWiseOpen, onOpenChange: setSizeWiseOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Size wise report 2" }), _jsx(DialogDescription, { children: "Issued and received weights use this date. Roll weights and closing are the rolls currently in stock. Balance lists leftover RM rolls of the same size." })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx("label", { htmlFor: "size-wise-report-date", className: "text-sm font-medium", children: "Report date" }), _jsx(Input, { id: "size-wise-report-date", type: "date", value: sizeWiseDate, onChange: (e) => setSizeWiseDate(e.target.value), disabled: isExporting }), sizeWiseError && (_jsx("p", { className: "text-sm text-red-600 dark:text-red-300", children: sizeWiseError }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setSizeWiseOpen(false), disabled: isExporting, children: "Cancel" }), _jsx(Button, { onClick: handleSizeWiseExportXlsx, disabled: isExporting || !sizeWiseDate, children: isExporting ? "Exporting..." : "Download" })] })] }) }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline ml-2", children: "Refresh" })] })] })] }), error && (_jsxs("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: [_jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", className: "mt-2", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Try Again"] })] })), !error && (_jsx(DataTable, { columns: getRollsStockColumns(), data: filteredRollsStock, getRowId: (row) => String(row.id), scrollable: true, scrollHeight: "80vh", onLoadMore: loadMore, isLoadingMore: isLoadingMore, hasMore: hasMore, bulkActions: (selectedRows) => (_jsxs(Button, { size: "sm", variant: "default", onClick: () => handleBulkIssue(selectedRows), disabled: isIssuing, children: [_jsx(Send, { className: "h-4 w-4 mr-2" }), isIssuing ? "Issuing..." : `Issue selected (${selectedRows.length})`] })) }, `${config.stage}-${tableKey}`))] }));
}
