import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getRollsStockColumns } from "@/components/columns/rolls-stock-columns";
import { getAllRollsStock } from "@/lib/rolls-stock-api";
import { Button } from "@/components/ui/button";
import { getItems } from "@/lib/item-api";
const PAGE_SIZE = 100;
function getConfigForPath(pathname) {
    if (pathname.endsWith("/wip-printing")) {
        return {
            title: "WIP Printing",
            description: "View roll stock currently in WIP Printing stage.",
            tab: "printing",
        };
    }
    if (pathname.endsWith("/wip-inspection")) {
        return {
            title: "WIP Inspection",
            description: "View roll stock currently in WIP Inspection stage.",
            tab: "inspection",
        };
    }
    if (pathname.endsWith("/wip-ecl")) {
        return {
            title: "WIP ECL",
            description: "View roll stock currently in WIP ECL stage.",
            tab: "ecl",
        };
    }
    if (pathname.endsWith("/wip-lamination")) {
        return {
            title: "WIP Lamination",
            description: "View roll stock currently in WIP Lamination stage.",
            tab: "lamination",
        };
    }
    // Default: ALL WIP stages
    return {
        title: "WIP Rolls (All Stages)",
        description: "View roll stock currently in any WIP stage.",
        tab: "all",
    };
}
export default function WipReport() {
    const location = useLocation();
    const { title, description, tab } = getConfigForPath(location.pathname);
    const [rollsStock, setRollsStock] = useState([]);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
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
        const normalizeStage = (stage) => (stage || "").toLowerCase().replace(/[\s_]+/g, "-");
        const withCustomer = rollsStock.map((row) => ({
            ...row,
            customerName: itemCustomerMap[row.itemCode] ?? row.customerName ?? null,
        }));
        if (tab === "all") {
            // ALL: keep only rows whose stage starts with "wip"
            return withCustomer.filter((row) => normalizeStage(row.stage).startsWith("wip"));
        }
        return withCustomer.filter((row) => {
            const s = normalizeStage(row.stage);
            if (!s.startsWith("wip"))
                return false;
            switch (tab) {
                case "printing":
                    // Match wip-printing, wip_printed, etc.
                    return s.startsWith("wip-print");
                case "inspection":
                    return s.startsWith("wip-inspection");
                case "ecl":
                    return s.startsWith("wip-ecl");
                case "lamination":
                    return s.startsWith("wip-lamination");
                default:
                    return true;
            }
        });
    }, [rollsStock, tab, itemCustomerMap]);
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
            // Fetch all non-issued rolls; we'll filter WIP stages on the client
            const data = await getAllRollsStock(start, limit, false);
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
            console.error("Error fetching WIP rolls stock:", err);
            setError("Failed to load WIP rolls");
            if (reset)
                setRollsStock([]);
        }
        finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);
    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingMore || isLoading)
            return;
        setIsLoadingMore(true);
        fetchRollsStock(false);
    }, [hasMore, isLoadingMore, isLoading, fetchRollsStock]);
    useEffect(() => {
        // When path changes (switching between WIP tabs), reload
        setTableKey((k) => k + 1);
        fetchRollsStock();
    }, [location.pathname, fetchRollsStock]);
    useEffect(() => {
        getItems(0, 1000)
            .then(setItems)
            .catch(() => setItems([]));
    }, []);
    const handleRefresh = () => {
        fetchRollsStock();
    };
    if (isLoading) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: title }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: description })] }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading WIP rolls..." })] }) })] }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: title }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: description })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline ml-2", children: "Refresh" })] }) })] }), error && (_jsxs("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: [_jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", className: "mt-2", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Try Again"] })] })), !error && (_jsx(DataTable, { columns: getRollsStockColumns({ variant: "wip" }), data: filteredRollsStock, getRowId: (row) => String(row.id), scrollable: true, scrollHeight: "80vh", onLoadMore: loadMore, isLoadingMore: isLoadingMore, hasMore: hasMore }, tableKey))] }));
}
