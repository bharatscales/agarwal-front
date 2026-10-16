import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, Trash2, Edit, X, Check, Printer, ChevronDown } from "lucide-react";
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import { getStockVoucher } from "@/lib/stock-voucher-api";
import { getRollsStockByVoucher, createRollsStock, updateRollsStock, deleteRollsStock } from "@/lib/rolls-stock-api";
import { getItems, createItem } from "@/lib/item-api";
import { applyFilmAutofill, meterFromNetWeight } from "@/lib/film-calc";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
const emptyEditingRow = () => ({
    itemId: 0,
    itemCode: "",
    itemName: "",
    gradeId: undefined,
    grade: "",
    rollno: "",
    size: 0,
    micron: 0,
    netweight: 0,
    meter: 0,
    grossweight: 0,
    isEditing: true,
});
export default function StockEntryItems() {
    const { voucherId } = useParams();
    const navigate = useNavigate();
    const { state: sidebarState, isMobile } = useSidebar();
    const [isLoading, setIsLoading] = useState(true);
    const [rollsStock, setRollsStock] = useState([emptyEditingRow()]);
    const [items, setItems] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [gradeOptions, setGradeOptions] = useState([]);
    const [uomMap, setUomMap] = useState(new Map()); // Map UOM name to ID
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
    const rollnoInputRefs = useRef([]);
    const sizeInputRefs = useRef([]);
    const micronInputRefs = useRef([]);
    const netWeightInputRefs = useRef([]);
    const meterInputRefs = useRef([]);
    const grossWeightInputRefs = useRef([]);
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
    const fetchRollsStock = async () => {
        if (!voucherId)
            return;
        try {
            const data = await getRollsStockByVoucher(Number(voucherId));
            const existingRows = data.map(rs => ({
                id: rs.id,
                itemId: rs.itemId,
                itemCode: rs.itemCode,
                itemName: rs.itemName,
                gradeId: rs.gradeId,
                grade: rs.grade ?? "",
                rollno: rs.rollno,
                size: rs.size,
                micron: rs.micron,
                netweight: rs.netweight,
                meter: rs.meter ? Math.round(rs.meter) : 0,
                grossweight: rs.grossweight,
                barcode: rs.barcode,
                isEditing: false,
            }));
            // Always add an empty editing row at the end
            setRollsStock([...existingRows, emptyEditingRow()]);
            // Clear selected rows when fetching new data
            setSelectedRows(new Set());
        }
        catch (err) {
            console.error("Error fetching rolls stock:", err);
            setError("Failed to load rolls stock");
            // On error, still show empty row
            setRollsStock([emptyEditingRow()]);
            // Clear selected rows on error too
            setSelectedRows(new Set());
        }
    };
    const fetchUomsWithIds = async () => {
        try {
            const response = await api.get("/meta/uoms-with-ids");
            const uoms = response.data;
            setUomMap(new Map(uoms.map(u => [u.uom, u.id])));
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
            setRollsStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: response.data.id, grade: response.data.grade } : r));
            setTimeout(() => gradeInputRefs.current[index]?.focus(), 100);
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
            const data = await getItems(0, 1000);
            // Filter items to only show those with item group "rm film"
            const filteredItems = data.filter(item => item.itemGroup === "rm film");
            setItems(filteredItems);
            // Convert filtered items to CreatableOption format for CreatableCombobox
            // Item code as label, item name as description
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
            // Find template with default_form = "stock_roll_stk"
            const rollStockTemplate = data.find(template => template.defaultForm === "stock_roll_stk");
            if (rollStockTemplate) {
                setDefaultTemplate(rollStockTemplate);
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
    const handlePrintClick = async (row) => {
        if (!row.id) {
            alert("Please save the row before printing");
            return;
        }
        if (!defaultTemplate) {
            alert("No default template found. Please create a template with default form 'Stock Roll STK'.");
            return;
        }
        setIsPrinting(true);
        try {
            const printData = {
                // Roll stock details
                itemCode: row.itemCode,
                itemName: row.itemName,
                rollno: row.rollno,
                size: row.size,
                micron: row.micron,
                netweight: row.netweight,
                meter: row.meter,
                grossweight: row.grossweight,
                barcode: row.barcode || "",
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
                name: `Roll Stock - ${row.rollno || row.itemCode}`,
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
    useEffect(() => {
        if (voucherId) {
            Promise.all([
                getStockVoucher(Number(voucherId)).then(voucher => {
                    setStockVoucher(voucher);
                    return voucher;
                }),
                fetchUomsWithIds(),
                fetchGradesWithIds(),
                fetchItems(),
                fetchRollsStock(),
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
    // Auto-focus on first field when page loads or when a new row is added
    useEffect(() => {
        if (!isLoading && rollsStock.length > 0) {
            const lastIndex = rollsStock.length - 1;
            const lastRow = rollsStock[lastIndex];
            if (lastRow.isEditing && lastRow.itemId === 0) {
                // Focus on the last row's item field (first field) if it's a new empty row
                setTimeout(() => {
                    itemInputRefs.current[lastIndex]?.focus();
                }, 200);
            }
        }
    }, [isLoading, rollsStock.length]);
    const autofillRmFilmRow = (row, previousRows, changedField) => {
        const selectedItem = items.find(it => it.id === row.itemId);
        if (!selectedItem || selectedItem.itemGroup !== "rm film")
            return row;
        const sameItemPrevious = [...previousRows].reverse().find(r => r.itemId === row.itemId);
        return {
            ...row,
            ...applyFilmAutofill(row, selectedItem.density, {
                changedField,
                inheritSize: sameItemPrevious?.size,
                inheritMicron: sameItemPrevious?.micron,
            }),
        };
    };
    const handleEditRow = (index) => {
        setRollsStock(prev => prev.map((row, i) => {
            if (i !== index)
                return row;
            return { ...autofillRmFilmRow(row, prev.slice(0, i)), isEditing: true };
        }));
    };
    const handleCancelEdit = (index) => {
        const row = rollsStock[index];
        if (row.id) {
            // Cancel editing existing row - revert to original
            setRollsStock(prev => prev.map((r, i) => i === index ? { ...r, isEditing: false } : r));
        }
        else {
            // Remove new row that wasn't saved, but ensure at least one empty row exists
            setRollsStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                // If no empty row exists, add one
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, emptyEditingRow()];
                }
                return filtered;
            });
        }
    };
    const handleSaveRow = async (index, overrideRow) => {
        if (!voucherId)
            return;
        const sourceRow = overrideRow || rollsStock[index];
        const row = autofillRmFilmRow(sourceRow, rollsStock.slice(0, index));
        if (!row.itemId) {
            setError("Please select an item");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                itemId: row.itemId,
                rollno: row.rollno || undefined,
                size: row.size !== 0 ? row.size : 0,
                micron: row.micron || undefined,
                netweight: row.netweight || undefined,
                meter: row.meter ? Math.round(row.meter) : undefined,
                grossweight: row.grossweight || undefined,
                gradeId: row.gradeId,
                stockVoucherId: Number(voucherId),
            };
            if (!row.id) {
                payload.stage = "virgin_rm";
            }
            if (row.id) {
                // Update existing
                const updated = await updateRollsStock(row.id, payload);
                setRollsStock(prev => {
                    const updatedRows = prev.map((r, i) => i === index ? {
                        id: updated.id,
                        itemId: updated.itemId,
                        itemCode: updated.itemCode,
                        itemName: updated.itemName,
                        gradeId: updated.gradeId,
                        grade: updated.grade ?? "",
                        rollno: updated.rollno,
                        size: updated.size,
                        micron: updated.micron,
                        netweight: updated.netweight,
                        meter: updated.meter ?? 0,
                        grossweight: updated.grossweight,
                        isEditing: false,
                    } : r);
                    const hasEmptyRow = updatedRows.some(r => !r.id && r.isEditing);
                    if (!hasEmptyRow) {
                        return [...updatedRows, emptyEditingRow()];
                    }
                    return updatedRows;
                });
            }
            else {
                // Create new
                const created = await createRollsStock(payload);
                setRollsStock(prev => {
                    const updatedRows = prev.map((r, i) => i === index ? {
                        id: created.id,
                        itemId: created.itemId,
                        itemCode: created.itemCode,
                        itemName: created.itemName,
                        gradeId: created.gradeId,
                        grade: created.grade ?? "",
                        rollno: created.rollno,
                        size: created.size,
                        micron: created.micron,
                        netweight: created.netweight,
                        meter: created.meter ?? 0,
                        grossweight: created.grossweight,
                        isEditing: false,
                    } : r);
                    return [...updatedRows, emptyEditingRow()];
                });
            }
        }
        catch (err) {
            console.error("Error saving rolls stock:", err);
            setError("Failed to save rolls stock");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDeleteRow = async (index) => {
        const row = rollsStock[index];
        if (!row.id) {
            // Just remove from local state if not saved, but ensure at least one empty row exists
            setRollsStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, emptyEditingRow()];
                }
                return filtered;
            });
            return;
        }
        if (!window.confirm("Delete this roll entry?"))
            return;
        setIsSubmitting(true);
        try {
            await deleteRollsStock(row.id);
            setRollsStock(prev => {
                const filtered = prev.filter((_, i) => i !== index);
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, emptyEditingRow()];
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
            console.error("Error deleting rolls stock:", err);
            setError("Failed to delete rolls stock");
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
        if (!window.confirm(`Delete ${selectedRows.size} selected roll entr${selectedRows.size === 1 ? 'y' : 'ies'}?`))
            return;
        setIsSubmitting(true);
        try {
            // Delete all selected rows
            const deletePromises = Array.from(selectedRows).map(id => deleteRollsStock(id));
            await Promise.all(deletePromises);
            // Remove deleted rows from state
            setRollsStock(prev => {
                const filtered = prev.filter(row => !row.id || !selectedRows.has(row.id));
                const hasEmptyRow = filtered.some(r => !r.id && r.isEditing);
                if (!hasEmptyRow) {
                    return [...filtered, emptyEditingRow()];
                }
                return filtered;
            });
            setSelectedRows(new Set());
        }
        catch (err) {
            console.error("Error deleting rolls stock:", err);
            setError("Failed to delete selected rolls stock");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleBulkPrint = async () => {
        if (selectedRows.size === 0) {
            alert("Please select at least one row to print");
            return;
        }
        if (!defaultTemplate) {
            alert("No default template found. Please create a template with default form 'Stock Roll STK'.");
            return;
        }
        if (!window.confirm(`Print ${selectedRows.size} selected roll entr${selectedRows.size === 1 ? 'y' : 'ies'}?`))
            return;
        setIsPrinting(true);
        try {
            // Get selected rows
            const selectedRowsData = rollsStock.filter(row => row.id && selectedRows.has(row.id));
            // Create print jobs for all selected rows
            const printPromises = selectedRowsData.map(row => {
                const printData = {
                    itemCode: row.itemCode,
                    itemName: row.itemName,
                    rollno: row.rollno,
                    size: row.size,
                    micron: row.micron,
                    netweight: row.netweight,
                    meter: row.meter,
                    grossweight: row.grossweight,
                    barcode: row.barcode || "",
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
                    name: `Roll Stock - ${row.rollno || row.itemCode}`,
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
            setError("Failed to print selected rolls stock");
            setPrintStatus("idle");
        }
        finally {
            setIsPrinting(false);
        }
    };
    const handleToggleRowSelection = (rowId) => {
        if (!rowId)
            return; // Don't allow selecting unsaved rows
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
        const savedRows = rollsStock.filter(row => row.id && !row.isEditing);
        const allSelected = savedRows.every(row => row.id && selectedRows.has(row.id));
        if (allSelected) {
            // Deselect all
            setSelectedRows(new Set());
        }
        else {
            // Select all saved rows
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
            // Get default UOM (prefer "Nos" or first available)
            const defaultUom = uomMap.has("Nos") ? "Nos" : Array.from(uomMap.keys())[0] || "Nos";
            const uomId = getUomId(defaultUom);
            // Create new item with "rm film" group
            const newItem = await createItem({
                itemCode: itemCode.trim(),
                itemName: itemCode.trim(), // Default to item code if no name provided
                itemGroup: "rm film",
                uomId: uomId,
            });
            // Add to items list
            setItems(prev => [...prev, newItem]);
            // Update options
            setItemOptions(prev => [...prev, {
                    value: newItem.id.toString(),
                    label: newItem.itemCode,
                    description: newItem.itemName,
                }]);
            // Update the row with the new item ID (this will override the label string set by CreatableCombobox)
            handleFieldChange(index, "itemId", newItem.id.toString());
            // Move focus to next field after item is created
            setTimeout(() => {
                rollnoInputRefs.current[index]?.focus();
            }, 100);
        }
        catch (err) {
            console.error("Error creating item:", err);
            const errorMsg = err.response?.data?.detail || "Failed to create item. Please try again.";
            setError(errorMsg);
            // Reset the value if creation failed
            setRollsStock(prev => prev.map((r, i) => i === index ? {
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
    const copyValueFromAbove = (index, field) => {
        if (index === 0)
            return; // Can't copy from above if it's the first row
        const aboveRow = rollsStock[index - 1];
        if (!aboveRow)
            return;
        // Grade: copy both gradeId and grade from above row
        if (field === "gradeId") {
            const aboveGradeId = aboveRow.gradeId;
            const aboveGrade = aboveRow.grade;
            if (aboveGradeId != null && aboveGrade != null && aboveGrade !== "") {
                setRollsStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: aboveGradeId, grade: aboveGrade } : r));
            }
            return;
        }
        const aboveValue = aboveRow[field];
        // For numeric fields, allow 0 as a valid value to copy
        // For string fields, only copy if not empty
        if (field === "size" || field === "micron" || field === "netweight" || field === "meter" || field === "grossweight") {
            // For numeric fields, copy if value is defined and not null (0 is valid)
            if (aboveValue !== undefined && aboveValue !== null) {
                handleFieldChange(index, field, aboveValue);
            }
        }
        else {
            // For string fields, only copy if not empty
            if (aboveValue !== undefined && aboveValue !== null && aboveValue !== "") {
                handleFieldChange(index, field, aboveValue);
            }
        }
    };
    const handleItemKeyDown = async (e, index) => {
        if (e.key !== "Enter")
            return;
        e.preventDefault();
        const input = e.currentTarget;
        const searchValue = input.value.trim();
        if (!searchValue) {
            // If empty and not first row, copy from above
            const currentRow = rollsStock[index];
            if (index > 0 && !currentRow?.itemId) {
                const aboveRow = rollsStock[index - 1];
                if (aboveRow?.itemId) {
                    handleFieldChange(index, "itemId", aboveRow.itemId.toString());
                    setTimeout(() => {
                        gradeInputRefs.current[index]?.focus();
                    }, 100);
                    return;
                }
            }
            // If empty, select first option if available
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
    const handleFieldChange = (index, field, value) => {
        setRollsStock(prev => prev.map((r, i) => {
            if (i !== index)
                return r;
            let next;
            if (field === "itemId") {
                const itemId = typeof value === "string" ? Number(value) : value;
                const item = items.find(it => it.id === itemId);
                next = {
                    ...r,
                    itemId,
                    itemCode: item?.itemCode || "",
                    itemName: item?.itemName || "",
                };
            }
            else {
                next = { ...r, [field]: value };
            }
            const filmField = field === "meter" || field === "netweight" || field === "size" || field === "micron" || field === "itemId"
                ? field
                : undefined;
            if (!filmField)
                return next;
            return autofillRmFilmRow(next, prev.slice(0, index), filmField);
        }));
    };
    // Calculate totals (only for saved rows, not the empty editing row)
    const savedRows = rollsStock.filter(row => row.id);
    const totalRolls = savedRows.length;
    const totalGrossWeight = savedRows.reduce((sum, row) => sum + (row.grossweight || 0), 0);
    const totalNetWeight = savedRows.reduce((sum, row) => sum + (row.netweight || 0), 0);
    const totalMeter = savedRows.reduce((sum, row) => {
        const density = items.find(item => item.id === row.itemId)?.density;
        const meter = row.meter || meterFromNetWeight(row.netweight, row.size, row.micron, density) || 0;
        return sum + meter;
    }, 0);
    const filterFn = (row, columnId, filterValue) => {
        if (row.original.isEditing)
            return true;
        const val = row.getValue(columnId);
        return String(val ?? "").toLowerCase().includes(String(filterValue ?? "").toLowerCase());
    };
    const rollStockColumns = [
        {
            id: "checkbox",
            header: () => (_jsx(Checkbox, { checked: (() => {
                    const saved = rollsStock.filter(row => row.id && !row.isEditing);
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
            accessorKey: "grade",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Grade", column: column, placeholder: "Filter grade..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "rollno",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Roll No", column: column, placeholder: "Filter roll no..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "size",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Size", column: column, placeholder: "Filter size..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "micron",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Micron", column: column, placeholder: "Filter micron..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "netweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Net Weight (kg)", column: column, placeholder: "Filter net weight..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "meter",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Meter", column: column, placeholder: "Filter meter..." })),
            cell: () => null,
            filterFn,
        },
        {
            accessorKey: "grossweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Gross Weight (kg)", column: column, placeholder: "Filter gross weight..." })),
            cell: () => null,
            filterFn,
        },
        { id: "actions", header: "Actions", cell: () => null, enableColumnFilter: false },
    ];
    const table = useReactTable({
        data: rollsStock,
        columns: rollStockColumns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnFiltersChange: setColumnFilters,
        state: { columnFilters },
    });
    const filteredRows = table.getRowModel().rows;
    if (isLoading) {
        return (_jsx("div", { className: "px-6 pt-2 pb-6", children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading..." })] }) }) }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-10", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("nav", { className: "flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-wrap", children: [_jsx(Link, { to: "/manufacturing/stock-entry", className: "hover:text-gray-900 dark:hover:text-gray-100", children: "Stock Entry" }), stockVoucher?.vendorId ? (_jsxs(_Fragment, { children: [_jsx(ChevronRight, { className: "h-4 w-4 shrink-0" }), _jsx(Link, { to: `/manufacturing/stock-entry/party/${stockVoucher.vendorId}`, className: "hover:text-gray-900 dark:hover:text-gray-100", children: stockVoucher.vendor || `Party #${stockVoucher.vendorId}` })] })) : null, _jsx(ChevronRight, { className: "h-4 w-4 shrink-0" }), _jsxs("span", { className: "text-gray-900 dark:text-gray-100", children: ["Voucher #", voucherId] })] }), _jsx("div", { children: _jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Rolls Stock Entry" }) })] }), error && (_jsx("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: _jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }) })), _jsxs("div", { className: "mb-4 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", disabled: selectedRows.size === 0 || isSubmitting, children: ["Bulk Actions", _jsx(ChevronDown, { className: "ml-2 h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "start", children: [_jsxs(DropdownMenuItem, { onClick: handleBulkPrint, disabled: selectedRows.size === 0 || isSubmitting || isPrinting || !defaultTemplate, children: [_jsx(Printer, { className: "mr-2 h-4 w-4" }), "Print Selected (", selectedRows.size, ")"] }), _jsxs(DropdownMenuItem, { onClick: handleBulkDelete, disabled: selectedRows.size === 0 || isSubmitting, variant: "destructive", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Selected (", selectedRows.size, ")"] })] })] }), selectedRows.size > 0 && (_jsxs("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: [selectedRows.size, " row", selectedRows.size === 1 ? '' : 's', " selected"] }))] }), _jsxs("div", { className: "flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300 text-right", children: [_jsxs("span", { children: ["Invoice No: ", _jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: stockVoucher?.invoiceNo || "-" })] }), _jsxs("span", { children: ["Invoice Date: ", _jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: formatVoucherDate(stockVoucher?.invoiceDate) })] })] })] }), _jsx("div", { className: "rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]", children: _jsx("div", { className: "overflow-y-auto flex-1 relative", children: _jsxs("table", { className: "w-full caption-bottom text-sm", children: [_jsx(TableHeader, { className: "sticky top-0 z-20 bg-background shadow-sm", children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { className: "h-auto", children: headerGroup.headers.map((header) => (_jsx(TableHead, { className: `bg-background py-1 px-2 ${header.id === "checkbox" ? "w-12" : ""} ${header.id === "sno" ? "w-16" : ""} ${header.id === "actions" ? "w-24" : ""}`, children: header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx(TableBody, { children: filteredRows.map((tableRow) => {
                                    const row = tableRow.original;
                                    const index = rollsStock.indexOf(row);
                                    return (_jsx(TableRow, { className: "h-auto", children: row.isEditing ? (_jsxs(_Fragment, { children: [_jsx(TableCell, { className: "py-1 px-2" }), _jsx(TableCell, { className: "text-center py-1 px-2", children: index + 1 }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx("div", { className: "[&_input]:h-8", children: _jsx(CreatableCombobox, { options: itemOptions, value: row.itemId ? row.itemId.toString() : null, onValueChange: (value) => handleFieldChange(index, "itemId", value), onCreateOption: (label) => handleCreateItem(label, index), placeholder: "Select item", searchPlaceholder: "Search item...", createLabel: "Create new item", triggerRef: (el) => {
                                                                itemInputRefs.current[index] = el;
                                                            }, onInputKeyDown: (e) => handleItemKeyDown(e, index) }) }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx("div", { className: "[&_input]:h-8", children: _jsx(CreatableCombobox, { options: gradeOptions.map((g) => ({ value: String(g.id), label: g.grade })), value: row.gradeId != null ? String(row.gradeId) : null, onValueChange: (val) => {
                                                                const id = val ? Number(val) : undefined;
                                                                const opt = gradeOptions.find((gr) => gr.id === id);
                                                                setRollsStock(prev => prev.map((r, i) => i === index ? { ...r, gradeId: id, grade: opt?.grade ?? "" } : r));
                                                            }, onCreateOption: (label) => handleCreateGrade(label, index), placeholder: "Grade", searchPlaceholder: "Search grade...", createLabel: "Create grade", triggerRef: (el) => {
                                                                gradeInputRefs.current[index] = el;
                                                            }, onInputKeyDown: (e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    // If empty and not first row, copy grade from above
                                                                    if ((row.gradeId == null || !row.grade) && index > 0) {
                                                                        copyValueFromAbove(index, "gradeId");
                                                                    }
                                                                    rollnoInputRefs.current[index]?.focus();
                                                                }
                                                            } }) }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            rollnoInputRefs.current[index] = el;
                                                        }, value: row.rollno, onChange: (e) => handleFieldChange(index, "rollno", e.target.value), placeholder: "Roll No", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // If empty and not first row, copy from above
                                                                if (!row.rollno && index > 0) {
                                                                    copyValueFromAbove(index, "rollno");
                                                                }
                                                                // Move to next field (Size)
                                                                const sizeInput = e.currentTarget.closest("tr")?.querySelector("input[placeholder='Size']");
                                                                sizeInput?.focus();
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            sizeInputRefs.current[index] = el;
                                                        }, type: "number", step: "0.01", value: row.size || "", onChange: (e) => handleFieldChange(index, "size", parseFloat(e.target.value) || 0), placeholder: "Size", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // If empty and not first row, copy from above
                                                                if ((!row.size || row.size === 0) && index > 0) {
                                                                    copyValueFromAbove(index, "size");
                                                                }
                                                                // Move to next field (Micron)
                                                                setTimeout(() => {
                                                                    micronInputRefs.current[index]?.focus();
                                                                }, 100);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            micronInputRefs.current[index] = el;
                                                        }, type: "number", step: "0.01", value: row.micron || "", onChange: (e) => handleFieldChange(index, "micron", parseFloat(e.target.value) || 0), placeholder: "Micron", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // If empty and not first row, copy from above
                                                                if ((!row.micron || row.micron === 0) && index > 0) {
                                                                    copyValueFromAbove(index, "micron");
                                                                }
                                                                setTimeout(() => {
                                                                    netWeightInputRefs.current[index]?.focus();
                                                                }, 100);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            netWeightInputRefs.current[index] = el;
                                                        }, type: "number", step: "0.01", value: row.netweight || "", onChange: (e) => handleFieldChange(index, "netweight", parseFloat(e.target.value) || 0), placeholder: "Net Weight", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // If empty and not first row, copy from above
                                                                if ((!row.netweight || row.netweight === 0) && index > 0) {
                                                                    copyValueFromAbove(index, "netweight");
                                                                }
                                                                setTimeout(() => {
                                                                    meterInputRefs.current[index]?.focus();
                                                                }, 100);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            meterInputRefs.current[index] = el;
                                                        }, type: "number", step: "1", value: row.meter || "", onChange: (e) => handleFieldChange(index, "meter", Math.round(parseFloat(e.target.value)) || 0), placeholder: "Meter", className: "w-full h-8", onKeyDown: (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                if ((!row.meter || row.meter === 0) && index > 0) {
                                                                    copyValueFromAbove(index, "meter");
                                                                }
                                                                setTimeout(() => {
                                                                    grossWeightInputRefs.current[index]?.focus();
                                                                }, 100);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsx(Input, { ref: (el) => {
                                                            grossWeightInputRefs.current[index] = el;
                                                        }, type: "number", step: "0.01", value: row.grossweight || "", onChange: (e) => handleFieldChange(index, "grossweight", parseFloat(e.target.value) || 0), placeholder: "Gross Weight", className: "w-full h-8", onKeyDown: async (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // If empty and not first row, copy from above
                                                                if ((!row.grossweight || row.grossweight === 0) && index > 0) {
                                                                    const aboveRow = rollsStock[index - 1];
                                                                    if (aboveRow?.grossweight !== undefined && aboveRow.grossweight !== null) {
                                                                        // Create updated row with copied grossweight
                                                                        const updatedRow = { ...row, grossweight: aboveRow.grossweight };
                                                                        // Update the state
                                                                        setRollsStock(prev => prev.map((r, i) => i === index ? updatedRow : r));
                                                                        // Save immediately with the updated row (pass it directly to avoid state timing issues)
                                                                        handleSaveRow(index, updatedRow);
                                                                        return;
                                                                    }
                                                                }
                                                                // Move to Save button or trigger save
                                                                handleSaveRow(index);
                                                            }
                                                        } }) }), _jsx(TableCell, { className: "py-1 px-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleSaveRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", children: _jsx(Check, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleCancelEdit(index), disabled: isSubmitting, className: "h-7 w-7 p-0", children: _jsx(X, { className: "h-3.5 w-3.5" }) })] }) })] })) : (_jsxs(_Fragment, { children: [_jsx(TableCell, { className: "py-1 px-2", children: _jsx(Checkbox, { checked: row.id ? selectedRows.has(row.id) : false, onCheckedChange: () => handleToggleRowSelection(row.id) }) }), _jsx(TableCell, { className: "text-center py-1 px-2", children: index + 1 }), _jsx(TableCell, { className: "py-1 px-2", children: row.itemCode }), _jsx(TableCell, { className: "py-1 px-2", children: row.grade || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.rollno || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.size || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.micron || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.netweight || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.meter
                                                        ? Math.round(row.meter)
                                                        : meterFromNetWeight(row.netweight, row.size, row.micron, items.find(item => item.id === row.itemId)?.density)
                                                            || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: row.grossweight || "-" }), _jsx(TableCell, { className: "py-1 px-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleEditRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", title: "Edit", children: _jsx(Edit, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handlePrintClick(row), disabled: isSubmitting || !row.id || isPrinting || !defaultTemplate, className: "h-7 w-7 p-0", title: "Print", children: _jsx(Printer, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDeleteRow(index), disabled: isSubmitting, className: "h-7 w-7 p-0", title: "Delete", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] })) }, row.id || `new-${index}`));
                                }) })] }) }) }), _jsxs("div", { className: "mt-4 flex items-center justify-end gap-6 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg", children: [_jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Rolls:" }), _jsx("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: totalRolls })] }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Net Weight:" }), _jsxs("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: [totalNetWeight.toFixed(2), " kg"] })] }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Meter:" }), _jsx("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: Math.round(totalMeter) })] }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400 font-medium", children: "Total Gross Weight:" }), _jsxs("span", { className: "ml-2 text-gray-900 dark:text-gray-100 font-semibold", children: [totalGrossWeight.toFixed(2), " kg"] })] })] }), _jsxs("div", { className: "fixed bottom-0 h-7 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 z-50 transition-all duration-200", style: {
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
