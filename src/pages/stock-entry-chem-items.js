import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronRight, Trash2, Edit, X, Check, ChevronDown, Printer } from "lucide-react";
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import { getStockVoucher } from "@/lib/stock-voucher-api";
import { getChemStockByVoucher, createChemStock, updateChemStock, deleteChemStock } from "@/lib/chem-stock-api";
import { getItems, createItem } from "@/lib/item-api";
import { getAllTemplates } from "@/lib/template-api";
import { createPrintJob, getPrintJob } from "@/lib/print-job-api";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ColumnHeader } from "@/components/column-header";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSidebar } from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
export default function StockEntryChemItems() {
    const location = useLocation();
    // Extract voucher ID from URL path like /manufacturing/stock-entry/123/chem
    const pathParts = location.pathname.split('/').filter(Boolean);
    const stockEntryIndex = pathParts.indexOf('stock-entry');
    const voucherId = stockEntryIndex >= 0 && pathParts[stockEntryIndex + 1] ? pathParts[stockEntryIndex + 1] : null;
    const navigate = useNavigate();
    const { state: sidebarState, isMobile } = useSidebar();
    const [isLoading, setIsLoading] = useState(true);
    const [chemStock, setChemStock] = useState([{
            itemId: 0,
            itemCode: "",
            itemName: "",
            color: "",
            qty: 0,
            uomId: 0,
            uom: "",
            gradeId: undefined,
            grade: "",
            isEditing: true,
        }]);
    const [items, setItems] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [uomMap, setUomMap] = useState(new Map());
    const [uomOptions, setUomOptions] = useState([]);
    const [gradeOptions, setGradeOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [defaultTemplate, setDefaultTemplate] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [stockVoucher, setStockVoucher] = useState(null);
    const [printerName, setPrinterName] = useState("");
    const [printerAvailable, setPrinterAvailable] = useState(false);
    const [websocketConnected, setWebsocketConnected] = useState(false);
    const [printStatus, setPrintStatus] = useState("idle");
    const [_currentJobId, setCurrentJobId] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [columnFilters, setColumnFilters] = useState([]);
    const itemInputRefs = useRef([]);
    const gradeInputRefs = useRef([]);
    const colorInputRefs = useRef([]);
    const qtyInputRefs = useRef([]);
    const formatVoucherDate = (dateValue) => {
        if (!dateValue)
            return "-";
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime()))
            return dateValue;
        return date.toLocaleDateString("en-GB");
    };
    const formatVoucherDateForPrint = (dateValue) => {
        if (!dateValue)
            return "";
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime()))
            return dateValue;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    const fetchChemStock = async () => {
        if (!voucherId)
            return;
        try {
            const data = await getChemStockByVoucher(Number(voucherId));
            const existingRows = data.map(cs => ({
                id: cs.id,
                itemId: cs.itemId,
                itemCode: cs.itemCode,
                itemName: cs.itemName,
                color: cs.color || "",
                qty: cs.qty || 0,
                uomId: cs.uomId || 0,
                uom: cs.uom || "",
                gradeId: cs.gradeId,
                grade: cs.grade ?? "",
                isEditing: false,
            }));
            setChemStock([...existingRows, {
                    itemId: 0,
                    itemCode: "",
                    itemName: "",
                    color: "",
                    qty: 0,
                    uomId: 0,
                    uom: "",
                    gradeId: undefined,
                    grade: "",
                    isEditing: true,
                }]);
            setSelectedRows(new Set());
        }
        catch (err) {
            console.error("Error fetching chem stock:", err);
            const errorMsg = err.response?.data?.detail || err.message || "Failed to load chem stock";
            setError(errorMsg);
            setChemStock([{
                    itemId: 0,
                    itemCode: "",
                    itemName: "",
                    color: "",
                    qty: 0,
                    uomId: 0,
                    uom: "",
                    gradeId: undefined,
                    grade: "",
                    isEditing: true,
                }]);
            setSelectedRows(new Set());
        }
    };
    const fetchUomsWithIds = async () => {
        try {
            const response = await api.get("/meta/uoms-with-ids");
            const uoms = response.data;
            setUomMap(new Map(uoms.map(u => [u.uom, u.id])));
            setUomOptions(uoms.map(u => ({ value: u.uom, label: u.uom })));
        }
        catch (error) {
            console.error("Failed to load UOMs:", error);
        }
    };
    const fetchGradesWithIds = async () => {
        try {
            const response = await api.get("/meta/grades-with-ids");
            setGradeOptions(response.data ?? []);
        }
        catch (error) {
            console.error("Failed to load grades:", error);
        }
    };
    const handleCreateGrade = async (label, index) => {
        const value = label.trim();
        if (!value)
            return;
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await api.post("/meta/grades", { grade: value });
            await fetchGradesWithIds();
            setChemStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: response.data.id, grade: response.data.grade } : r));
            setTimeout(() => colorInputRefs.current[index]?.focus(), 100);
        }
        catch (err) {
            console.error("Failed to create grade:", err);
            setError(err.response?.data?.detail ?? "Failed to create grade");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const getUomId = (uomName) => {
        if (!uomName.trim())
            return undefined;
        return uomMap.get(uomName.trim());
    };
    const fetchItems = async () => {
        try {
            const data = await getItems();
            const chemItemGroups = ["rm ink/adhesive/chemicals", "ink", "adhesive", "chemical"];
            const filteredItems = data.filter(item => chemItemGroups.includes(item.itemGroup));
            setItems(filteredItems);
            const options = filteredItems.map(item => ({
                value: item.id.toString(),
                label: item.itemCode,
                description: item.itemName,
            }));
            setItemOptions(options);
        }
        catch (err) {
            console.error("Error fetching items:", err);
        }
    };
    const fetchTemplates = async () => {
        try {
            const data = await getAllTemplates();
            // Find template with default_form = "stock_ink_stk"
            const inkStockTemplate = data.find(template => template.defaultForm === "stock_ink_stk");
            if (inkStockTemplate) {
                setDefaultTemplate(inkStockTemplate);
            }
        }
        catch (err) {
            console.error("Error fetching templates:", err);
        }
    };
    const fetchDefaultPrinter = async () => {
        try {
            const response = await api.get("/printer/default/zpl/status");
            if (response.data.available && response.data.name) {
                setPrinterName(response.data.name);
                setPrinterAvailable(true);
                setWebsocketConnected(response.data.websocket_connected);
            }
            else {
                setPrinterName("Not available");
                setPrinterAvailable(false);
                setWebsocketConnected(false);
            }
        }
        catch (err) {
            console.error("Error fetching default printer status:", err);
            setPrinterName("Not available");
            setPrinterAvailable(false);
            setWebsocketConnected(false);
        }
    };
    useEffect(() => {
        if (voucherId) {
            Promise.all([
                getStockVoucher(Number(voucherId)).then(voucher => {
                    setStockVoucher(voucher);
                    if (voucher.stockType && voucher.stockType !== "ink/adhesive/chemical") {
                        setError(`This page only handles "Ink/Adhesive/Chemical" stock type. This voucher is for "${voucher.stockType}".`);
                        setIsLoading(false);
                        return voucher;
                    }
                    return voucher;
                }),
                fetchUomsWithIds(),
                fetchGradesWithIds(),
                fetchItems(),
                fetchChemStock(),
                fetchTemplates(),
                fetchDefaultPrinter(),
            ])
                .catch((err) => {
                console.error("Error fetching data:", err);
                navigate("/manufacturing/stock-entry");
            })
                .finally(() => setIsLoading(false));
        }
    }, [voucherId, navigate]);
    // Poll for printer and websocket status periodically
    useEffect(() => {
        if (!voucherId)
            return;
        // Initial fetch
        fetchDefaultPrinter();
        // Poll every 5 seconds
        const interval = setInterval(() => {
            fetchDefaultPrinter();
        }, 5000);
        return () => clearInterval(interval);
    }, [voucherId]);
    useEffect(() => {
        if (!isLoading && chemStock.length > 0) {
            const lastIndex = chemStock.length - 1;
            const lastRow = chemStock[lastIndex];
            if (lastRow.isEditing && lastRow.itemId === 0) {
                setTimeout(() => {
                    itemInputRefs.current[lastIndex]?.focus();
                }, 200);
            }
        }
    }, [isLoading, chemStock.length]);
    const handleEditRow = (index) => {
        setChemStock(prev => prev.map((row, i) => i === index ? { ...row, isEditing: true } : row));
    };
    const handleCancelEdit = (index) => {
        const row = chemStock[index];
        if (row.id) {
            setChemStock(prev => prev.map((r, i) => i === index ? { ...r, isEditing: false } : r));
        }
        else {
            setChemStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, {
                            itemId: 0,
                            itemCode: "",
                            itemName: "",
                            color: "",
                            qty: 0,
                            uomId: 0,
                            uom: "",
                            gradeId: undefined,
                            grade: "",
                            isEditing: true,
                        }];
                }
                return filtered;
            });
        }
    };
    const handleSaveRow = async (index, overrideRow) => {
        if (!voucherId)
            return;
        const row = overrideRow || chemStock[index];
        if (!row.itemId) {
            setError("Please select an item");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                itemId: row.itemId,
                color: row.color || undefined,
                qty: row.qty !== 0 ? row.qty : undefined,
                uomId: row.uomId || undefined,
                gradeId: row.gradeId,
                stockVoucherId: Number(voucherId),
            };
            if (row.id) {
                const updated = await updateChemStock(row.id, payload);
                setChemStock(prev => {
                    const updatedRows = prev.map((r, i) => i === index ? {
                        id: updated.id,
                        itemId: updated.itemId,
                        itemCode: updated.itemCode,
                        itemName: updated.itemName,
                        color: updated.color,
                        qty: updated.qty,
                        uomId: updated.uomId,
                        uom: updated.uom,
                        gradeId: updated.gradeId,
                        grade: updated.grade ?? "",
                        isEditing: false,
                    } : r);
                    const hasEmptyRow = updatedRows.some(r => !r.id && r.isEditing);
                    if (!hasEmptyRow) {
                        return [...updatedRows, {
                                itemId: 0,
                                itemCode: "",
                                itemName: "",
                                color: "",
                                qty: 0,
                                uomId: 0,
                                uom: "",
                                gradeId: undefined,
                                grade: "",
                                isEditing: true,
                            }];
                    }
                    return updatedRows;
                });
            }
            else {
                const created = await createChemStock(payload);
                setChemStock(prev => {
                    const updatedRows = prev.map((r, i) => i === index ? {
                        id: created.id,
                        itemId: created.itemId,
                        itemCode: created.itemCode,
                        itemName: created.itemName,
                        color: created.color,
                        qty: created.qty,
                        uomId: created.uomId,
                        uom: created.uom,
                        gradeId: created.gradeId,
                        grade: created.grade ?? "",
                        isEditing: false,
                    } : r);
                    return [...updatedRows, {
                            itemId: 0,
                            itemCode: "",
                            itemName: "",
                            color: "",
                            qty: 0,
                            uomId: 0,
                            uom: "",
                            gradeId: undefined,
                            grade: "",
                            isEditing: true,
                        }];
                });
            }
        }
        catch (err) {
            console.error("Error saving chem stock:", err);
            setError("Failed to save chem stock");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDeleteRow = async (index) => {
        const row = chemStock[index];
        if (!row.id) {
            setChemStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, {
                            itemId: 0,
                            itemCode: "",
                            itemName: "",
                            color: "",
                            qty: 0,
                            uomId: 0,
                            uom: "",
                            gradeId: undefined,
                            grade: "",
                            isEditing: true,
                        }];
                }
                return filtered;
            });
            return;
        }
        if (!window.confirm("Delete this entry?"))
            return;
        setIsSubmitting(true);
        try {
            await deleteChemStock(row.id);
            setChemStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, {
                            itemId: 0,
                            itemCode: "",
                            itemName: "",
                            color: "",
                            qty: 0,
                            uomId: 0,
                            uom: "",
                            gradeId: undefined,
                            grade: "",
                            isEditing: true,
                        }];
                }
                return filtered;
            });
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(row.id);
                return newSet;
            });
        }
        catch (err) {
            console.error("Error deleting chem stock:", err);
            setError("Failed to delete chem stock");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) {
            alert("Please select at least one row to delete");
            return;
        }
        if (!window.confirm(`Delete ${selectedRows.size} selected entr${selectedRows.size === 1 ? 'y' : 'ies'}?`))
            return;
        setIsSubmitting(true);
        try {
            const deletePromises = Array.from(selectedRows).map(id => deleteChemStock(id));
            await Promise.all(deletePromises);
            setChemStock(prev => {
                const filtered = prev.filter(row => !row.id || !selectedRows.has(row.id));
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, {
                            itemId: 0,
                            itemCode: "",
                            itemName: "",
                            color: "",
                            qty: 0,
                            uomId: 0,
                            uom: "",
                            gradeId: undefined,
                            grade: "",
                            isEditing: true,
                        }];
                }
                return filtered;
            });
            setSelectedRows(new Set());
        }
        catch (err) {
            console.error("Error deleting chem stock:", err);
            setError("Failed to delete selected chem stock");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handlePrintClick = async (row) => {
        if (!row.id) {
            alert("Please save the row before printing");
            return;
        }
        if (!defaultTemplate) {
            alert("No default template found. Please create a template with default form 'Stock Ink STK'.");
            return;
        }
        setIsPrinting(true);
        try {
            const printData = {
                // Chem stock details (barcode for template / print agent)
                itemCode: row.itemCode,
                itemName: row.itemName,
                barcode: row.barcode ?? "",
                quantity: row.qty,
                unit: row.uom || "",
                color: row.color || "",
                qty: row.qty,
                uom: row.uom || "",
                // Stock voucher details
                stockVoucher: stockVoucher ? {
                    id: stockVoucher.id,
                    vendorCode: stockVoucher.vendorCode,
                    vendorName: stockVoucher.vendorName,
                    vendor: stockVoucher.vendor,
                    vendorId: stockVoucher.vendorId,
                    invoiceNo: stockVoucher.invoiceNo,
                    invoiceDate: formatVoucherDateForPrint(stockVoucher.invoiceDate),
                    stockType: stockVoucher.stockType,
                } : null,
            };
            const job = await createPrintJob({
                name: `Chem Stock - ${row.itemCode || row.itemName}`,
                template_id: defaultTemplate.id,
                data: printData,
                copies: 1,
            });
            // Set status to printing and start polling
            setCurrentJobId(job.id);
            setPrintStatus("printing");
            // Poll for job status
            let pollCount = 0;
            const maxPolls = 30; // 30 seconds max
            const pollInterval = setInterval(async () => {
                pollCount++;
                try {
                    const updatedJob = await getPrintJob(job.id);
                    if (updatedJob.status === "done") {
                        clearInterval(pollInterval);
                        setPrintStatus("done");
                        // Show "done" for 3 seconds, then set to "idle"
                        setTimeout(() => {
                            setPrintStatus("idle");
                            setCurrentJobId(null);
                        }, 3000);
                    }
                    else if (updatedJob.status === "failed") {
                        clearInterval(pollInterval);
                        setPrintStatus("idle");
                        setCurrentJobId(null);
                    }
                    else if (pollCount >= maxPolls) {
                        // Timeout after 30 seconds
                        clearInterval(pollInterval);
                        setPrintStatus("idle");
                        setCurrentJobId(null);
                    }
                }
                catch (err) {
                    console.error("Error polling print job status:", err);
                    clearInterval(pollInterval);
                    setPrintStatus("idle");
                    setCurrentJobId(null);
                }
            }, 1000); // Poll every second
        }
        catch (err) {
            console.error("Error creating print job:", err);
            setPrintStatus("idle");
            setCurrentJobId(null);
        }
        finally {
            setIsPrinting(false);
        }
    };
    const handleBulkPrint = async () => {
        if (selectedRows.size === 0) {
            alert("Please select at least one row to print");
            return;
        }
        if (!defaultTemplate) {
            alert("No default template found. Please create a template with default form 'Stock Ink STK'.");
            return;
        }
        if (!window.confirm(`Print ${selectedRows.size} selected entr${selectedRows.size === 1 ? 'y' : 'ies'}?`))
            return;
        setIsPrinting(true);
        try {
            // Get selected rows
            const selectedRowsData = chemStock.filter(row => row.id && selectedRows.has(row.id));
            // Create print jobs for all selected rows
            const printPromises = selectedRowsData.map(row => {
                const printData = {
                    itemCode: row.itemCode,
                    itemName: row.itemName,
                    barcode: row.barcode ?? "",
                    quantity: row.qty,
                    unit: row.uom || "",
                    color: row.color || "",
                    qty: row.qty,
                    uom: row.uom || "",
                    stockVoucher: stockVoucher ? {
                        id: stockVoucher.id,
                        vendorCode: stockVoucher.vendorCode,
                        vendorName: stockVoucher.vendorName,
                        vendor: stockVoucher.vendor,
                        vendorId: stockVoucher.vendorId,
                        invoiceNo: stockVoucher.invoiceNo,
                        invoiceDate: formatVoucherDateForPrint(stockVoucher.invoiceDate),
                        stockType: stockVoucher.stockType,
                    } : null,
                };
                return createPrintJob({
                    name: `Chem Stock - ${row.itemCode || row.itemName}`,
                    template_id: defaultTemplate.id,
                    data: printData,
                    copies: 1,
                });
            });
            await Promise.all(printPromises);
            setPrintStatus("printing");
            // Poll for job status (simplified - just show printing status)
            setTimeout(() => {
                setPrintStatus("done");
                setTimeout(() => {
                    setPrintStatus("idle");
                }, 3000);
            }, 2000);
        }
        catch (err) {
            console.error("Error creating print jobs:", err);
            setError("Failed to print selected chem stock");
            setPrintStatus("idle");
        }
        finally {
            setIsPrinting(false);
        }
    };
    const handleToggleRowSelection = (rowId) => {
        if (!rowId)
            return;
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            }
            else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };
    const handleSelectAll = () => {
        const savedRows = chemStock.filter(row => row.id && !row.isEditing);
        const allSelected = savedRows.every(row => row.id && selectedRows.has(row.id));
        if (allSelected) {
            setSelectedRows(new Set());
        }
        else {
            const allIds = new Set(savedRows.map(row => row.id).filter(id => id !== undefined));
            setSelectedRows(allIds);
        }
    };
    const handleCreateItem = async (itemCode, index) => {
        if (!itemCode.trim())
            return;
        setIsSubmitting(true);
        setError(null);
        try {
            const defaultUom = uomMap.has("Nos") ? "Nos" : Array.from(uomMap.keys())[0] || "Nos";
            const uomId = getUomId(defaultUom);
            const newItem = await createItem({
                itemCode: itemCode.trim(),
                itemName: itemCode.trim(),
                itemGroup: "rm ink/adhesive/chemicals",
                uomId: uomId,
            });
            setItems(prev => [...prev, newItem]);
            setItemOptions(prev => [...prev, {
                    value: newItem.id.toString(),
                    label: newItem.itemCode,
                    description: newItem.itemName,
                }]);
            handleFieldChange(index, "itemId", newItem.id.toString());
            setTimeout(() => {
                gradeInputRefs.current[index]?.focus();
            }, 100);
        }
        catch (err) {
            console.error("Error creating item:", err);
            const errorMsg = err.response?.data?.detail || "Failed to create item. Please try again.";
            setError(errorMsg);
            setChemStock(prev => prev.map((r, i) => i === index ? {
                ...r,
                itemId: 0,
                itemCode: "",
                itemName: "",
            } : r));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleFieldChange = (index, field, value) => {
        if (field === "itemId") {
            const itemId = typeof value === "string" ? Number(value) : value;
            const item = items.find(i => i.id === itemId);
            const itemUom = item?.uom?.trim() || "";
            const itemUomId = itemUom ? (getUomId(itemUom) || 0) : 0;
            setChemStock(prev => prev.map((r, i) => i === index ? {
                ...r,
                itemId: itemId,
                itemCode: item?.itemCode || "",
                itemName: item?.itemName || "",
                uom: itemUom,
                uomId: itemUomId,
            } : r));
        }
        else if (field === "uom") {
            const uomId = getUomId(value) || 0;
            setChemStock(prev => prev.map((r, i) => i === index ? { ...r, uom: value, uomId: uomId } : r));
        }
        else {
            setChemStock(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
        }
    };
    const copyGradeFromAbove = (index) => {
        if (index === 0)
            return;
        const aboveRow = chemStock[index - 1];
        if (aboveRow?.gradeId != null && aboveRow?.grade) {
            setChemStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: aboveRow.gradeId, grade: aboveRow.grade ?? "" } : r));
        }
    };
    const handleItemKeyDown = async (e, index) => {
        if (e.key !== "Enter")
            return;
        e.preventDefault();
        const input = e.currentTarget;
        const searchValue = input.value.trim();
        if (!searchValue) {
            const currentRow = chemStock[index];
            if (index > 0 && !currentRow?.itemId) {
                const aboveRow = chemStock[index - 1];
                if (aboveRow?.itemId) {
                    handleFieldChange(index, "itemId", aboveRow.itemId.toString());
                    setTimeout(() => {
                        gradeInputRefs.current[index]?.focus();
                    }, 100);
                    return;
                }
            }
            if (itemOptions.length > 0) {
                handleFieldChange(index, "itemId", itemOptions[0].value);
                setTimeout(() => {
                    gradeInputRefs.current[index]?.focus();
                }, 100);
            }
            return;
        }
        const filtered = itemOptions.filter(option => option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
            option.description?.toLowerCase().includes(searchValue.toLowerCase()));
        if (filtered.length > 0) {
            handleFieldChange(index, "itemId", filtered[0].value);
            setTimeout(() => {
                gradeInputRefs.current[index]?.focus();
            }, 100);
        }
        else {
            await handleCreateItem(searchValue, index);
            setTimeout(() => {
                gradeInputRefs.current[index]?.focus();
            }, 200);
        }
    };
    const savedRows = chemStock.filter(row => row.id);
    const totalItems = savedRows.length;
    const totalQty = savedRows.reduce((sum, row) => sum + (row.qty || 0), 0);
    const filterFn = (row, columnId, filterValue) => {
        if (row.original.isEditing)
            return true;
        const val = row.getValue(columnId);
        return String(val ?? "").toLowerCase().includes(String(filterValue ?? "").toLowerCase());
    };
    const chemStockColumns = [
        {
            id: "checkbox",
            header: () => (_jsx(Checkbox, { checked: (() => {
                    const saved = chemStock.filter(row => row.id && !row.isEditing);
                    return saved.length > 0 && saved.every(row => row.id && selectedRows.has(row.id));
                })(), onCheckedChange: handleSelectAll })),
            cell: () => null,
            enableColumnFilter: false,
        },
        { id: "sno", header: "S.No", cell: () => null, enableColumnFilter: false },
        {
            id: "item",
            accessorFn: (row) => row.itemCode ?? "",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Item", column: column, placeholder: "Filter item..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "barcode",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Barcode", column: column, placeholder: "Filter barcode..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "color",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Color", column: column, placeholder: "Filter color..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "grade",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Grade", column: column, placeholder: "Filter grade..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "qty",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Quantity", column: column, placeholder: "Filter quantity..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "uom",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "UOM", column: column, placeholder: "Filter UOM..." })),
            cell: () => null,
            filterFn,
        },
        { id: "actions", header: "Actions", cell: () => null, enableColumnFilter: false },
    ];
    const table = useReactTable({
        data: chemStock,
        columns: chemStockColumns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnFiltersChange: setColumnFilters,
        state: { columnFilters },
    });
    const filteredRows = table.getRowModel().rows;
    if (isLoading) {
        return (_jsx("div", { className: "px-6 pt-2 pb-6", children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading..." })] }) }) }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-10", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("nav", { className: "flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-wrap", children: [_jsx(Link, { to: "/manufacturing/stock-entry", className: "hover:text-gray-900 dark:hover:text-gray-100", children: "Stock Entry" }), stockVoucher?.vendorId ? (_jsxs(_Fragment, { children: [_jsx(ChevronRight, { className: "h-4 w-4 shrink-0" }), _jsx(Link, { to: `/manufacturing/stock-entry/party/${stockVoucher.vendorId}`, className: "hover:text-gray-900 dark:hover:text-gray-100", children: stockVoucher.vendor || `Party #${stockVoucher.vendorId}` })] })) : null, _jsx(ChevronRight, { className: "h-4 w-4 shrink-0" }), _jsxs("span", { className: "text-gray-900 dark:text-gray-100", children: ["Voucher #", voucherId] })] }), _jsx("div", { children: _jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Ink/Adhesive/Chemical Stock Entry" }) })] }), error && (_jsx("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: _jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }) })), _jsxs("div", { className: "mb-4 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", disabled: selectedRows.size === 0 || isSubmitting, children: ["Bulk Actions", _jsx(ChevronDown, { className: "ml-2 h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "start", children: [_jsxs(DropdownMenuItem, { onClick: handleBulkPrint, disabled: selectedRows.size === 0 || isSubmitting || isPrinting || !defaultTemplate, children: [_jsx(Printer, { className: "mr-2 h-4 w-4" }), "Print Selected (", selectedRows.size, ")"] }), _jsxs(DropdownMenuItem, { onClick: handleBulkDelete, disabled: selectedRows.size === 0 || isSubmitting, variant: "destructive", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Selected (", selectedRows.size, ")"] })] })] }), selectedRows.size > 0 && (_jsxs("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: [selectedRows.size, " row", selectedRows.size === 1 ? '' : 's', " selected"] }))] }), _jsxs("div", { className: "flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300 text-right", children: [_jsxs("span", { children: ["Invoice No: ", _jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: stockVoucher?.invoiceNo || "-" })] }), _jsxs("span", { children: ["Invoice Date: ", _jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: formatVoucherDate(stockVoucher?.invoiceDate) })] })] })] }), _jsx("div", { className: "rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]", children: _jsx("div", { className: "overflow-y-auto flex-1 relative", children: _jsxs("table", { className: "w-full caption-bottom text-sm", children: [_jsx(TableHeader, { className: "sticky top-0 z-20 bg-background shadow-sm", children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { className: "h-auto", children: headerGroup.headers.map((header) => (_jsx(TableHead, { className: `bg-background py-1 px-2 ${header.id === "checkbox" ? "w-12" : ""} ${header.id === "sno" ? "w-16" : ""} ${header.id === "actions" ? "w-24" : ""}`, children: header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx(TableBody, { children: filteredRows.map((tableRow) => {
                                    const row = tableRow.original;
                                    const index = chemStock.indexOf(row);
                                    return (_jsx(TableRow, { className: "h-auto", children: row.isEditing ? (_jsxs(_Fragment, { children: [_jsx(TableCell, { className: "py-1 px-2" }), _jsx(TableCell, { className: "text-center py-1 px-2", children: index + 1 }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx("div", { className: "[&_input]:h-8", children: _jsx(CreatableCombobox, { options: itemOptions, value: row.itemId ? row.itemId.toString() : null, onValueChange: (value) => handleFieldChange(index, "itemId", value), onCreateOption: (label) => handleCreateItem(label, index), placeholder: "Select item", searchPlaceholder: "Search item...", createLabel: "Create new item", triggerRef: (el) => {
                                                                itemInputRefs.current[index] = el;
                                                            }, onInputKeyDown: (e) => handleItemKeyDown(e, index) }) }) }), _jsx(TableCell, { className: "py-1 px-2 font-mono text-sm", children: row.barcode ?? "-" }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            colorInputRefs.current[index] = el;
                                                        }, value: row.color, onChange: (e) => handleFieldChange(index, "color", e.target.value), placeholder: "Color", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                qtyInputRefs.current[index]?.focus();
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx("div", { className: "[&_input]:h-8", children: _jsx(CreatableCombobox, { options: gradeOptions.map((g) => ({ value: String(g.id), label: g.grade })), value: row.gradeId != null ? String(row.gradeId) : null, onValueChange: (val) => {
                                                                const id = val ? Number(val) : undefined;
                                                                const opt = gradeOptions.find((gr) => gr.id === id);
                                                                setChemStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: id, grade: opt?.grade ?? "" } : r));
                                                            }, onCreateOption: (label) => handleCreateGrade(label, index), placeholder: "Grade", searchPlaceholder: "Search grade...", createLabel: "Create grade", triggerRef: (el) => {
                                                                gradeInputRefs.current[index] = el;
                                                            }, onInputKeyDown: (e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    // If empty and not first row, copy grade from above
                                                                    if ((row.gradeId == null || !row.grade) && index > 0) {
                                                                        copyGradeFromAbove(index);
                                                                    }
                                                                    colorInputRefs.current[index]?.focus();
                                                                }
                                                            } }) }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            qtyInputRefs.current[index] = el;
                                                        }, type: "number", step: "0.01", value: row.qty || "", onChange: (e) => handleFieldChange(index, "qty", parseFloat(e.target.value) || 0), placeholder: "Quantity", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleSaveRow(index);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsxs(Select, { value: row.uom || undefined, onValueChange: (value) => handleFieldChange(index, "uom", value), children: [_jsx(SelectTrigger, { className: "w-full h-8", children: _jsx(SelectValue, { placeholder: "Select UOM" }) }), _jsx(SelectContent, { children: uomOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleSaveRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", children: _jsx(Check, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleCancelEdit(index), disabled: isSubmitting, className: "h-7 w-7 p-0", children: _jsx(X, { className: "h-3.5 w-3.5" }) })] }) })] })) : (_jsxs(_Fragment, { children: [_jsx(TableCell, { className: "py-1 px-2", children: _jsx(Checkbox, { checked: row.id ? selectedRows.has(row.id) : false, onCheckedChange: () => handleToggleRowSelection(row.id) }) }), _jsx(TableCell, { className: "text-center py-1 px-2", children: index + 1 }), _jsx(TableCell, { className: "py-1 px-2", children: row.itemCode }), _jsx(TableCell, { className: "py-1 px-2 font-mono text-sm", children: row.barcode ?? "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.color || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.grade || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.qty || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.uom || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleEditRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", title: "Edit", children: _jsx(Edit, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handlePrintClick(row), disabled: isSubmitting || !row.id || isPrinting || !defaultTemplate, className: "h-7 w-7 p-0", title: "Print", children: _jsx(Printer, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDeleteRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", title: "Delete", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] })) }, row.id || `new-${index}`));
                                }) })] }) }) }), _jsxs("div", { className: "mt-4 flex items-center justify-end gap-6 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg", children: [_jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Items:" }), _jsx("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: totalItems })] }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Quantity:" }), _jsx("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: totalQty.toFixed(2) })] })] }), _jsxs("div", { className: "fixed bottom-0 h-7 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 z-50 transition-all duration-200", style: {
                    left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
                    right: 0,
                }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-xs text-gray-600 dark:text-gray-400 font-medium", children: "Printer:" }), _jsx("span", { className: "text-xs text-gray-900 dark:text-gray-100 font-semibold", children: printerName || "Loading..." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-600 dark:text-gray-400 font-medium", children: "Status:" }), _jsx("span", { className: `text-xs font-semibold ${!printerAvailable
                                    ? "text-red-600 dark:text-red-400"
                                    : printStatus === "printing"
                                        ? "text-blue-600 dark:text-blue-400"
                                        : printStatus === "done"
                                            ? "text-green-600 dark:text-green-400"
                                            : websocketConnected
                                                ? "text-gray-600 dark:text-gray-400"
                                                : "text-yellow-600 dark:text-yellow-400"}`, children: !printerAvailable
                                    ? "Not available"
                                    : printStatus === "printing"
                                        ? "Printing..."
                                        : printStatus === "done"
                                            ? "Done"
                                            : websocketConnected
                                                ? "Idle"
                                                : "Poll" })] })] })] }));
}
