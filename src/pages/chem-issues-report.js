import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, FileSpreadsheet, RotateCcw } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getChemStockColumns } from "@/components/columns/chem-stock-columns";
import { getAllChemStock, exportChemStockSummaryXlsx, bulkRestoreChemStock, getChemGroupLabel, } from "@/lib/chem-stock-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const RESTORE_CONFIRM_TEXT = "restore";
export function ChemIssuesReport({ group }) {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [tableKey, setTableKey] = useState(0);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [restoreConfirmInput, setRestoreConfirmInput] = useState("");
    const [pendingRestoreRows, setPendingRestoreRows] = useState([]);
    const label = getChemGroupLabel(group);
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const list = await getAllChemStock(0, 5000, group, true);
            setData(list);
        }
        catch (err) {
            console.error(`Error fetching issued ${group}:`, err);
            setError(`Failed to load issued ${label.toLowerCase()}`);
            setData([]);
        }
        finally {
            setIsLoading(false);
        }
    }, [group, label]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    const openRestoreDialog = useCallback((selectedRows) => {
        setPendingRestoreRows(selectedRows);
        setRestoreConfirmInput("");
        setRestoreDialogOpen(true);
    }, []);
    const closeRestoreDialog = useCallback(() => {
        setRestoreDialogOpen(false);
        setPendingRestoreRows([]);
        setRestoreConfirmInput("");
    }, []);
    const handleConfirmRestore = useCallback(async () => {
        if (pendingRestoreRows.length === 0 || restoreConfirmInput.trim().toLowerCase() !== RESTORE_CONFIRM_TEXT)
            return;
        try {
            setIsRestoring(true);
            setError(null);
            await bulkRestoreChemStock(pendingRestoreRows.map((r) => r.id));
            closeRestoreDialog();
            await fetchData();
            setTableKey((k) => k + 1);
        }
        catch (err) {
            console.error("Bulk restore failed:", err);
            setError(`Failed to restore selected ${label.toLowerCase()}. Please try again.`);
            closeRestoreDialog();
        }
        finally {
            setIsRestoring(false);
        }
    }, [pendingRestoreRows, restoreConfirmInput, closeRestoreDialog, fetchData, label]);
    const handleSummaryExportXlsx = async () => {
        try {
            setIsExporting(true);
            const blob = await exportChemStockSummaryXlsx(undefined, group, true);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Rm-${label}-Issued-Summary-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h1", { className: "text-lg sm:text-xl font-bold", children: ["Rm ", label, " Issued"] }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: ["View issued ", label.toLowerCase(), " only."] })] }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: ["Loading ", label.toLowerCase(), " issued..."] })] }) })] }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-lg sm:text-xl font-bold", children: ["Rm ", label, " Issued"] }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: ["View issued ", label.toLowerCase(), " only."] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: handleSummaryExportXlsx, disabled: isExporting, children: [_jsx(FileSpreadsheet, { className: "h-4 w-4 mr-2" }), isExporting ? "Exporting..." : "Summary .xlsx"] }), _jsxs(Button, { onClick: fetchData, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline ml-2", children: "Refresh" })] })] })] }), error && (_jsxs("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: [_jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }), _jsxs(Button, { onClick: fetchData, variant: "outline", size: "sm", className: "mt-2", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Try Again"] })] })), !error && (_jsx(DataTable, { columns: getChemStockColumns({ showIssuedAt: true, showIssuedReport: true }), data: data, getRowId: (row) => String(row.id), bulkActions: (selectedRows) => (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => openRestoreDialog(selectedRows), children: [_jsx(RotateCcw, { className: "h-4 w-4 mr-2" }), "Restore selected (", selectedRows.length, ")"] })) }, tableKey)), _jsx(Dialog, { open: restoreDialogOpen, onOpenChange: (open) => !open && closeRestoreDialog(), children: _jsxs(DialogContent, { className: "dark:text-zinc-100", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "dark:text-white", children: ["Restore selected ", label.toLowerCase()] }), _jsxs(DialogDescription, { className: "dark:text-zinc-300", children: ["This will mark the selected ", pendingRestoreRows.length, " batch(es) as not issued so they appear again in Rm ", label, " Stock. Type ", _jsx("strong", { className: "dark:text-zinc-200", children: "restore" }), " below to confirm."] })] }), _jsxs("div", { className: "grid gap-2 py-2", children: [_jsx(Label, { htmlFor: "restore-confirm-chem", className: "dark:text-zinc-300", children: "Type \"restore\" to confirm" }), _jsx(Input, { id: "restore-confirm-chem", value: restoreConfirmInput, onChange: (e) => setRestoreConfirmInput(e.target.value), placeholder: "restore", className: "font-mono dark:text-zinc-100 dark:placeholder:text-zinc-500", autoComplete: "off" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: closeRestoreDialog, disabled: isRestoring, children: "Cancel" }), _jsx(Button, { onClick: handleConfirmRestore, disabled: isRestoring ||
                                        restoreConfirmInput.trim().toLowerCase() !== RESTORE_CONFIRM_TEXT, children: isRestoring ? "Restoring..." : "Restore" })] })] }) })] }));
}
