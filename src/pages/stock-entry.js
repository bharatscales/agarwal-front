import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getStockVoucherColumns } from "@/components/columns/stock-voucher-columns";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { deleteStockVoucher, getStockVouchers } from "@/lib/stock-voucher-api";
import { StockVoucherFormDialog } from "@/components/stock-voucher-form-dialog";
export default function StockEntry() {
    const { partyId } = useParams();
    const navigate = useNavigate();
    const vendorFilterId = partyId ? Number(partyId) : NaN;
    const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
    const [isEditVoucherOpen, setIsEditVoucherOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [stockVouchers, setStockVouchers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [vendorSelectOptions, setVendorSelectOptions] = useState([]);
    const [partyLabel, setPartyLabel] = useState("");
    const loadPage = useCallback(async () => {
        if (!partyId || Number.isNaN(vendorFilterId)) {
            setError("Invalid party.");
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const [vendorsRes, vouchersData] = await Promise.all([
                api.get("/meta/party-vendors"),
                getStockVouchers(0, 100, vendorFilterId),
            ]);
            setVendorSelectOptions(vendorsRes.data.map((vendor) => ({
                value: vendor.id.toString(),
                label: vendor.party_code,
                description: `${vendor.party_name} (${vendor.party_type})`,
            })));
            const v = vendorsRes.data.find((x) => x.id === vendorFilterId);
            setPartyLabel(v ? `${v.party_code} — ${v.party_name}` : `Party #${partyId}`);
            setStockVouchers(vouchersData);
        }
        catch (err) {
            console.error("Error loading stock entry party page:", err);
            setError("Failed to load data. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    }, [partyId, vendorFilterId]);
    const handleRefresh = () => {
        void loadPage();
    };
    const handleEditVoucher = (voucher) => {
        setEditingVoucher(voucher);
        setIsEditVoucherOpen(true);
    };
    const handleDeleteVoucher = (voucher) => {
        if (!window.confirm(`Delete stock voucher #${voucher.id}? This cannot be undone.`)) {
            return;
        }
        deleteStockVoucher(voucher.id)
            .then(() => {
            setStockVouchers((prev) => prev.filter((row) => row.id !== voucher.id));
            setError(null);
        })
            .catch((err) => {
            console.error("Error deleting stock voucher:", err);
            setError("Failed to delete stock voucher. Please try again.");
        });
    };
    useEffect(() => {
        void loadPage();
    }, [loadPage]);
    const handleFormSuccess = (voucher, action) => {
        if (action === "edit") {
            setStockVouchers((prev) => prev.map((v) => (v.id === voucher.id ? voucher : v)));
            setIsEditVoucherOpen(false);
            setEditingVoucher(null);
            return;
        }
        setStockVouchers((prev) => [voucher, ...prev]);
        setIsAddVoucherOpen(false);
        if (voucher.stockType === "rolls") {
            navigate(`/manufacturing/stock-entry/${voucher.id}`);
        }
        else if (voucher.stockType === "ink/adhesive/chemical") {
            navigate(`/manufacturing/stock-entry/${voucher.id}/chem`);
        }
    };
    if (!partyId || Number.isNaN(vendorFilterId)) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("p", { className: "text-red-600 dark:text-red-400", children: "Missing or invalid party." }), _jsx(Button, { asChild: true, variant: "link", className: "mt-2 p-0 h-auto", children: _jsx(Link, { to: "/manufacturing/stock-entry", children: "Back to Stock Entry" }) })] }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("nav", { className: "flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4", children: [_jsx(Link, { to: "/manufacturing/stock-entry", className: "hover:text-gray-900 dark:hover:text-gray-100", children: "Stock Entry" }), _jsx(ChevronRight, { className: "h-4 w-4 shrink-0" }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: partyLabel || `Party #${partyId}` })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Stock vouchers" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Vouchers for this party." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: () => setIsAddVoucherOpen(true), size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Stock Voucher" })] })] })] })] }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock vouchers..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Stock Vouchers" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getStockVoucherColumns({
                        onEdit: handleEditVoucher,
                        onDelete: handleDeleteVoucher,
                    }), data: stockVouchers, onRowClick: (voucher) => {
                        if (voucher.stockType === "rolls") {
                            navigate(`/manufacturing/stock-entry/${voucher.id}`);
                        }
                        else if (voucher.stockType === "ink/adhesive/chemical") {
                            navigate(`/manufacturing/stock-entry/${voucher.id}/chem`);
                        }
                        else {
                            alert(`Stock type "${voucher.stockType}" is not yet supported.`);
                        }
                    } }) })), stockVouchers.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No stock vouchers for this party. Create one to get started." }) })), _jsx(StockVoucherFormDialog, { open: isAddVoucherOpen, onOpenChange: setIsAddVoucherOpen, mode: "add", initialVendorId: partyId, vendorSelectOptions: vendorSelectOptions, onSuccess: handleFormSuccess }), _jsx(StockVoucherFormDialog, { open: isEditVoucherOpen, onOpenChange: (open) => {
                    setIsEditVoucherOpen(open);
                    if (!open)
                        setEditingVoucher(null);
                }, mode: "edit", editingVoucher: editingVoucher ?? undefined, vendorSelectOptions: vendorSelectOptions, onSuccess: handleFormSuccess })] }));
}
