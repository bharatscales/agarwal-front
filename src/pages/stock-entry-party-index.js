import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import {} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { ColumnHeader } from "@/components/column-header";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { getPartyStockSummaries } from "@/lib/stock-voucher-api";
import { StockVoucherFormDialog } from "@/components/stock-voucher-form-dialog";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
function getPartyColumns() {
    return [
        {
            accessorKey: "vendor_code",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY CODE", column: column, placeholder: "Filter code..." })),
        },
        {
            accessorKey: "vendor_name",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "PARTY NAME", column: column, placeholder: "Filter name..." })),
        },
        {
            accessorKey: "voucher_count",
            header: ({ column }) => _jsx(ColumnHeader, { title: "VOUCHERS", column: column, placeholder: "Filter..." }),
            cell: ({ row }) => _jsx("div", { className: "font-medium tabular-nums", children: row.getValue("voucher_count") }),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "rolls_count",
            header: ({ column }) => _jsx(ColumnHeader, { title: "ROLLS", column: column, placeholder: "Filter..." }),
            cell: ({ row }) => _jsx("div", { className: "font-medium tabular-nums", children: row.getValue("rolls_count") }),
            filterFn: includesStringFilterFn,
        },
    ];
}
export default function StockEntryPartyIndex() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [vendorSelectOptions, setVendorSelectOptions] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const fetchSummaries = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getPartyStockSummaries();
            setRows(data);
        }
        catch (err) {
            console.error(err);
            setError("Failed to load party summary. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const fetchVendors = async () => {
        try {
            const response = await api.get("/meta/party-vendors");
            setVendorSelectOptions(response.data.map((vendor) => ({
                value: vendor.id.toString(),
                label: vendor.party_code,
                description: `${vendor.party_name} (${vendor.party_type})`,
            })));
        }
        catch (e) {
            console.error("Failed to load vendors:", e);
            setVendorSelectOptions([]);
        }
    };
    useEffect(() => {
        fetchVendors();
        fetchSummaries();
    }, []);
    const handleVoucherCreated = (voucher) => {
        if (voucher.stockType === "rolls") {
            navigate(`/manufacturing/stock-entry/${voucher.id}`);
        }
        else if (voucher.stockType === "ink/adhesive/chemical") {
            navigate(`/manufacturing/stock-entry/${voucher.id}/chem`);
        }
    };
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Stock Entry" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Select a party to view vouchers and roll lines." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: () => {
                                        fetchVendors();
                                        fetchSummaries();
                                    }, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: () => setIsAddOpen(true), size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Stock Voucher" })] })] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading parties..." })] }) })) : error ? (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center", children: [_jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: fetchSummaries, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] })) : (_jsx(DataTable, { columns: getPartyColumns(), data: rows, onRowClick: (row) => navigate(`/manufacturing/stock-entry/party/${row.vendor_id}`) })), rows.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No parties with stock vouchers yet. Add a stock voucher to get started." }) })), _jsx(StockVoucherFormDialog, { open: isAddOpen, onOpenChange: setIsAddOpen, mode: "add", initialVendorId: "", vendorSelectOptions: vendorSelectOptions, onSuccess: (voucher, action) => {
                    if (action === "add") {
                        fetchSummaries();
                        handleVoucherCreated(voucher);
                    }
                } })] }));
}
