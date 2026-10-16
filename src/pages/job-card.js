import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getJobCardColumns } from "@/components/columns/job-card-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllWorkOrders } from "@/lib/work-order-api";
import { getAllMachines } from "@/lib/machine-api";
import { getAllOperators } from "@/lib/operator-api";
import { createJobCard, deleteJobCard, getAllJobCards, updateJobCard } from "@/lib/job-card-api";
import api from "@/lib/axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
export default function JobCard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const fallbackOperations = ["Printing", "Inspection", "Sliter", "ECL", "Lamination"];
    const fallbackShifts = ["A", "B"];
    const [isAddJobCardOpen, setIsAddJobCardOpen] = useState(false);
    const [isEditJobCardOpen, setIsEditJobCardOpen] = useState(false);
    const [editJobCardId, setEditJobCardId] = useState(null);
    const [workOrderOptions, setWorkOrderOptions] = useState([]);
    const [machineOptions, setMachineOptions] = useState([]);
    const [operators, setOperators] = useState([]);
    const [operations, setOperations] = useState(fallbackOperations);
    const [formData, setFormData] = useState({
        jobCardNumber: "",
        workOrderId: "",
        operation: "",
        machineId: "",
        operatorName: "",
        shift: "A",
        inputQty: "",
        outputQty: "",
        wastageQty: "",
        inputRollCount: "",
        outputRollCount: "",
        startedAt: "",
        finishedAt: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [jobCards, setJobCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        jobCardNumber: "",
        workOrderId: "",
        operation: "",
        machineId: "",
        operatorName: "",
        shift: "A",
        inputQty: "",
        outputQty: "",
        wastageQty: "",
        inputRollCount: "",
        outputRollCount: "",
        startedAt: "",
        finishedAt: "",
    });
    const [editErrors, setEditErrors] = useState({});
    const addFieldRefs = useRef([]);
    const handleRefresh = () => {
        fetchJobCards();
    };
    const handleAddJobCard = () => {
        setIsAddJobCardOpen(true);
    };
    const handleEditJobCardOpen = (jobCard) => {
        setEditJobCardId(jobCard.id);
        setEditFormData({
            jobCardNumber: jobCard.jobCardNumber,
            workOrderId: jobCard.workOrderId.toString(),
            operation: jobCard.operation,
            machineId: jobCard.machineId.toString(),
            operatorName: jobCard.operatorName,
            shift: jobCard.shift,
            inputQty: jobCard.inputQty?.toString() || "",
            outputQty: jobCard.outputQty?.toString() || "",
            wastageQty: jobCard.wastageQty?.toString() || "",
            inputRollCount: jobCard.inputRollCount?.toString() || "",
            outputRollCount: jobCard.outputRollCount?.toString() || "",
            startedAt: jobCard.startedAt ? new Date(jobCard.startedAt).toISOString().slice(0, 16) : "",
            finishedAt: jobCard.finishedAt ? new Date(jobCard.finishedAt).toISOString().slice(0, 16) : "",
        });
        setEditErrors({});
        setIsEditJobCardOpen(true);
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleEditInputChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
        if (editErrors[field]) {
            setEditErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleEnterKey = (event, index) => {
        if (event.key !== "Enter")
            return;
        const nextField = addFieldRefs.current[index + 1];
        if (nextField) {
            event.preventDefault();
            nextField.focus();
        }
    };
    const validateForm = () => {
        const errors = {};
        if (!formData.jobCardNumber.trim()) {
            errors.jobCardNumber = "Job card number is required";
        }
        if (!formData.workOrderId.trim()) {
            errors.workOrderId = "Work order is required";
        }
        if (!formData.operation.trim()) {
            errors.operation = "Operation is required";
        }
        if (!formData.machineId.trim()) {
            errors.machineId = "Machine is required";
        }
        if (!formData.operatorName.trim()) {
            errors.operatorName = "Operator name is required";
        }
        if (!formData.shift.trim()) {
            errors.shift = "Shift is required";
        }
        if (formData.inputQty && parseFloat(formData.inputQty) < 0) {
            errors.inputQty = "Input quantity must be a positive number";
        }
        if (formData.outputQty && parseFloat(formData.outputQty) < 0) {
            errors.outputQty = "Output quantity must be a positive number";
        }
        if (formData.wastageQty && parseFloat(formData.wastageQty) < 0) {
            errors.wastageQty = "Wastage quantity must be a positive number";
        }
        if (formData.inputRollCount && parseInt(formData.inputRollCount) < 0) {
            errors.inputRollCount = "Input roll count must be a positive number";
        }
        if (formData.outputRollCount && parseInt(formData.outputRollCount) < 0) {
            errors.outputRollCount = "Output roll count must be a positive number";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.jobCardNumber.trim()) {
            errors.jobCardNumber = "Job card number is required";
        }
        if (!editFormData.workOrderId.trim()) {
            errors.workOrderId = "Work order is required";
        }
        if (!editFormData.operation.trim()) {
            errors.operation = "Operation is required";
        }
        if (!editFormData.machineId.trim()) {
            errors.machineId = "Machine is required";
        }
        if (!editFormData.operatorName.trim()) {
            errors.operatorName = "Operator name is required";
        }
        if (!editFormData.shift.trim()) {
            errors.shift = "Shift is required";
        }
        if (editFormData.inputQty && parseFloat(editFormData.inputQty) < 0) {
            errors.inputQty = "Input quantity must be a positive number";
        }
        if (editFormData.outputQty && parseFloat(editFormData.outputQty) < 0) {
            errors.outputQty = "Output quantity must be a positive number";
        }
        if (editFormData.wastageQty && parseFloat(editFormData.wastageQty) < 0) {
            errors.wastageQty = "Wastage quantity must be a positive number";
        }
        if (editFormData.inputRollCount && parseInt(editFormData.inputRollCount) < 0) {
            errors.inputRollCount = "Input roll count must be a positive number";
        }
        if (editFormData.outputRollCount && parseInt(editFormData.outputRollCount) < 0) {
            errors.outputRollCount = "Output roll count must be a positive number";
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        createJobCard({
            jobCardNumber: formData.jobCardNumber,
            workOrderId: parseInt(formData.workOrderId),
            operation: formData.operation,
            machineId: parseInt(formData.machineId),
            operatorName: formData.operatorName,
            shift: formData.shift,
            inputQty: formData.inputQty ? parseFloat(formData.inputQty) : null,
            outputQty: formData.outputQty ? parseFloat(formData.outputQty) : null,
            wastageQty: formData.wastageQty ? parseFloat(formData.wastageQty) : null,
            inputRollCount: formData.inputRollCount ? parseInt(formData.inputRollCount) : null,
            outputRollCount: formData.outputRollCount ? parseInt(formData.outputRollCount) : null,
            startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : null,
            finishedAt: formData.finishedAt ? new Date(formData.finishedAt).toISOString() : null,
        })
            .then((newJobCard) => {
            setJobCards(prev => [newJobCard, ...prev]);
            handleCloseModal();
        })
            .catch((err) => {
            console.error("Error creating job card:", err);
            const errorMsg = err.response?.data?.detail || "Failed to create job card. Please try again.";
            setFormErrors({ jobCardNumber: errorMsg });
        });
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editJobCardId || !validateEditForm())
            return;
        updateJobCard(editJobCardId, {
            jobCardNumber: editFormData.jobCardNumber,
            workOrderId: parseInt(editFormData.workOrderId),
            operation: editFormData.operation,
            machineId: parseInt(editFormData.machineId),
            operatorName: editFormData.operatorName,
            shift: editFormData.shift,
            inputQty: editFormData.inputQty ? parseFloat(editFormData.inputQty) : null,
            outputQty: editFormData.outputQty ? parseFloat(editFormData.outputQty) : null,
            wastageQty: editFormData.wastageQty ? parseFloat(editFormData.wastageQty) : null,
            inputRollCount: editFormData.inputRollCount ? parseInt(editFormData.inputRollCount) : null,
            outputRollCount: editFormData.outputRollCount ? parseInt(editFormData.outputRollCount) : null,
            startedAt: editFormData.startedAt ? new Date(editFormData.startedAt).toISOString() : null,
            finishedAt: editFormData.finishedAt ? new Date(editFormData.finishedAt).toISOString() : null,
        })
            .then((updatedJobCard) => {
            setJobCards(prev => prev.map(jc => (jc.id === updatedJobCard.id ? updatedJobCard : jc)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating job card:", err);
            const errorMsg = err.response?.data?.detail || "Failed to update job card. Please try again.";
            setEditErrors({ jobCardNumber: errorMsg });
        });
    };
    const handleDeleteJobCard = (jobCard) => {
        if (!window.confirm(`Delete job card "${jobCard.jobCardNumber}"? This cannot be undone.`)) {
            return;
        }
        deleteJobCard(jobCard.id)
            .then(() => {
            setJobCards(prev => prev.filter(row => row.id !== jobCard.id));
        })
            .catch((err) => {
            console.error("Error deleting job card:", err);
            setError("Failed to delete job card. Please try again.");
        });
    };
    const handleCloseModal = () => {
        setIsAddJobCardOpen(false);
        setFormData({
            jobCardNumber: "",
            workOrderId: "",
            operation: "",
            machineId: "",
            operatorName: "",
            shift: "A",
            inputQty: "",
            outputQty: "",
            wastageQty: "",
            inputRollCount: "",
            outputRollCount: "",
            startedAt: "",
            finishedAt: "",
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditJobCardOpen(false);
        setEditJobCardId(null);
        setEditFormData({
            jobCardNumber: "",
            workOrderId: "",
            operation: "",
            machineId: "",
            operatorName: "",
            shift: "A",
            inputQty: "",
            outputQty: "",
            wastageQty: "",
            inputRollCount: "",
            outputRollCount: "",
            startedAt: "",
            finishedAt: "",
        });
        setEditErrors({});
    };
    useEffect(() => {
        if (isAddJobCardOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddJobCardOpen]);
    const fetchWorkOrders = async () => {
        try {
            const data = await getAllWorkOrders();
            setWorkOrderOptions(data.map(wo => ({
                value: wo.id.toString(),
                label: `${wo.woNumber || `WO-${wo.id}`} - ${wo.partyName || ""} - ${wo.itemName || ""}`,
            })));
        }
        catch (error) {
            console.error("Failed to load work orders:", error);
        }
    };
    const fetchMachines = async () => {
        try {
            const data = await getAllMachines();
            setMachineOptions(data.map(m => ({
                value: m.id.toString(),
                label: `${m.machineCode} - ${m.machineName} (${m.operation})`,
            })));
        }
        catch (error) {
            console.error("Failed to load machines:", error);
        }
    };
    const fetchOperators = async () => {
        try {
            const data = await getAllOperators();
            const uniqueNames = Array.from(new Set(data.map(op => op.operatorName)));
            setOperators(uniqueNames);
        }
        catch (error) {
            console.error("Failed to load operators:", error);
        }
    };
    const fetchOperations = async () => {
        try {
            const response = await api.get("/meta/machine-operations");
            if (response.data.length > 0) {
                setOperations(response.data);
            }
        }
        catch (error) {
            console.error("Failed to load machine operations:", error);
            setOperations(fallbackOperations);
        }
    };
    const fetchJobCards = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllJobCards();
            setJobCards(data);
        }
        catch (err) {
            console.error("Error fetching job cards:", err);
            setError("Failed to fetch job cards. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchWorkOrders();
        fetchMachines();
        fetchOperators();
        fetchOperations();
        fetchJobCards();
    }, []);
    // Open Add Job Card modal when navigated with ?openAdd=1 (e.g. from inspection barcode scan)
    useEffect(() => {
        if (searchParams.get("openAdd") === "1") {
            setIsAddJobCardOpen(true);
            searchParams.delete("openAdd");
            searchParams.delete("scannedBarcode");
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Job Card" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage job cards for production operations." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: handleAddJobCard, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Job Card" })] })] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading job cards..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Job Cards" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getJobCardColumns({
                        onEdit: handleEditJobCardOpen,
                        onDelete: handleDeleteJobCard,
                    }), data: jobCards }) })), jobCards.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No job cards found. Create your first job card to get started." }) })), isAddJobCardOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add New Job Card" }), _jsx(CardDescription, { children: "Create a new job card with production details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "jobCardNumber", children: "Job Card Number *" }), _jsx(Input, { id: "jobCardNumber", type: "text", ref: (el) => {
                                                                addFieldRefs.current[0] = el;
                                                            }, value: formData.jobCardNumber, onChange: (e) => handleInputChange("jobCardNumber", e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter job card number", className: formErrors.jobCardNumber ? "border-red-500" : "" }), formErrors.jobCardNumber && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.jobCardNumber }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "workOrderId", children: "Work Order *" }), _jsx(CreatableCombobox, { options: workOrderOptions, value: formData.workOrderId || null, onValueChange: (value) => handleInputChange("workOrderId", value ?? ""), placeholder: "Select work order", searchPlaceholder: "Search work order...", triggerRef: (el) => {
                                                                addFieldRefs.current[1] = el;
                                                            }, onInputKeyDown: (e) => handleEnterKey(e, 1) }), formErrors.workOrderId && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.workOrderId }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "operation", children: "Operation *" }), _jsxs(Select, { value: formData.operation, onValueChange: (value) => handleInputChange("operation", value), children: [_jsx(SelectTrigger, { id: "operation", ref: (el) => {
                                                                        addFieldRefs.current[2] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 2), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select operation" }) }), _jsx(SelectContent, { children: operations.map((op) => (_jsx(SelectItem, { value: op, children: op }, op))) })] }), formErrors.operation && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.operation }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "machineId", children: "Machine *" }), _jsx(CreatableCombobox, { options: machineOptions, value: formData.machineId || null, onValueChange: (value) => handleInputChange("machineId", value ?? ""), placeholder: "Select machine", searchPlaceholder: "Search machine...", triggerRef: (el) => {
                                                                addFieldRefs.current[3] = el;
                                                            }, onInputKeyDown: (e) => handleEnterKey(e, 3) }), formErrors.machineId && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.machineId }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "operatorName", children: "Operator Name *" }), _jsx(CreatableCombobox, { options: operators.map(op => ({ value: op, label: op })), value: formData.operatorName || null, onValueChange: (value) => handleInputChange("operatorName", value ?? ""), placeholder: "Enter or select operator name", searchPlaceholder: "Search operator...", triggerRef: (el) => {
                                                                addFieldRefs.current[4] = el;
                                                            }, onInputKeyDown: (e) => handleEnterKey(e, 4) }), formErrors.operatorName && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.operatorName }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "shift", children: "Shift *" }), _jsxs(Select, { value: formData.shift, onValueChange: (value) => handleInputChange("shift", value), children: [_jsx(SelectTrigger, { id: "shift", ref: (el) => {
                                                                        addFieldRefs.current[5] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 5), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select shift" }) }), _jsx(SelectContent, { children: fallbackShifts.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }), formErrors.shift && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.shift }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "inputQty", children: "Input Qty (KG)" }), _jsx(Input, { id: "inputQty", type: "number", step: "0.01", min: "0", ref: (el) => {
                                                                addFieldRefs.current[6] = el;
                                                            }, value: formData.inputQty, onChange: (e) => handleInputChange("inputQty", e.target.value), onKeyDown: (e) => handleEnterKey(e, 6), placeholder: "Enter input quantity", className: formErrors.inputQty ? "border-red-500" : "" }), formErrors.inputQty && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.inputQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "outputQty", children: "Output Qty (KG)" }), _jsx(Input, { id: "outputQty", type: "number", step: "0.01", min: "0", ref: (el) => {
                                                                addFieldRefs.current[7] = el;
                                                            }, value: formData.outputQty, onChange: (e) => handleInputChange("outputQty", e.target.value), onKeyDown: (e) => handleEnterKey(e, 7), placeholder: "Enter output quantity", className: formErrors.outputQty ? "border-red-500" : "" }), formErrors.outputQty && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.outputQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "wastageQty", children: "Wastage Qty (KG)" }), _jsx(Input, { id: "wastageQty", type: "number", step: "0.01", min: "0", ref: (el) => {
                                                                addFieldRefs.current[8] = el;
                                                            }, value: formData.wastageQty, onChange: (e) => handleInputChange("wastageQty", e.target.value), onKeyDown: (e) => handleEnterKey(e, 8), placeholder: "Enter wastage quantity", className: formErrors.wastageQty ? "border-red-500" : "" }), formErrors.wastageQty && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.wastageQty }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "inputRollCount", children: "Input Roll Count" }), _jsx(Input, { id: "inputRollCount", type: "number", min: "0", ref: (el) => {
                                                                addFieldRefs.current[9] = el;
                                                            }, value: formData.inputRollCount, onChange: (e) => handleInputChange("inputRollCount", e.target.value), onKeyDown: (e) => handleEnterKey(e, 9), placeholder: "Enter input roll count", className: formErrors.inputRollCount ? "border-red-500" : "" }), formErrors.inputRollCount && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.inputRollCount }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "outputRollCount", children: "Output Roll Count" }), _jsx(Input, { id: "outputRollCount", type: "number", min: "0", ref: (el) => {
                                                                addFieldRefs.current[10] = el;
                                                            }, value: formData.outputRollCount, onChange: (e) => handleInputChange("outputRollCount", e.target.value), onKeyDown: (e) => handleEnterKey(e, 10), placeholder: "Enter output roll count", className: formErrors.outputRollCount ? "border-red-500" : "" }), formErrors.outputRollCount && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.outputRollCount }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "startedAt", children: "Started At" }), _jsx(Input, { id: "startedAt", type: "datetime-local", ref: (el) => {
                                                                addFieldRefs.current[11] = el;
                                                            }, value: formData.startedAt, onChange: (e) => handleInputChange("startedAt", e.target.value), onKeyDown: (e) => handleEnterKey(e, 11), className: formErrors.startedAt ? "border-red-500" : "" }), formErrors.startedAt && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.startedAt }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "finishedAt", children: "Finished At" }), _jsx(Input, { id: "finishedAt", type: "datetime-local", ref: (el) => {
                                                                addFieldRefs.current[12] = el;
                                                            }, value: formData.finishedAt, onChange: (e) => handleInputChange("finishedAt", e.target.value), onKeyDown: (e) => handleEnterKey(e, 12), className: formErrors.finishedAt ? "border-red-500" : "" }), formErrors.finishedAt && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.finishedAt }))] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Job Card" })] })] })] }) })), isEditJobCardOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Job Card" }), _jsx(CardDescription, { children: "Update the job card details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-jobCardNumber", children: "Job Card Number *" }), _jsx(Input, { id: "edit-jobCardNumber", type: "text", value: editFormData.jobCardNumber, onChange: (e) => handleEditInputChange("jobCardNumber", e.target.value), placeholder: "Enter job card number", className: editErrors.jobCardNumber ? "border-red-500" : "" }), editErrors.jobCardNumber && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.jobCardNumber }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-workOrderId", children: "Work Order *" }), _jsx(CreatableCombobox, { options: workOrderOptions, value: editFormData.workOrderId || null, onValueChange: (value) => handleEditInputChange("workOrderId", value ?? ""), placeholder: "Select work order", searchPlaceholder: "Search work order..." }), editErrors.workOrderId && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.workOrderId }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-operation", children: "Operation *" }), _jsxs(Select, { value: editFormData.operation, onValueChange: (value) => handleEditInputChange("operation", value), children: [_jsx(SelectTrigger, { id: "edit-operation", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select operation" }) }), _jsx(SelectContent, { children: operations.map((op) => (_jsx(SelectItem, { value: op, children: op }, op))) })] }), editErrors.operation && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.operation }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-machineId", children: "Machine *" }), _jsx(CreatableCombobox, { options: machineOptions, value: editFormData.machineId || null, onValueChange: (value) => handleEditInputChange("machineId", value ?? ""), placeholder: "Select machine", searchPlaceholder: "Search machine..." }), editErrors.machineId && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.machineId }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-operatorName", children: "Operator Name *" }), _jsx(CreatableCombobox, { options: operators.map(op => ({ value: op, label: op })), value: editFormData.operatorName || null, onValueChange: (value) => handleEditInputChange("operatorName", value ?? ""), placeholder: "Enter or select operator name", searchPlaceholder: "Search operator..." }), editErrors.operatorName && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.operatorName }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-shift", children: "Shift *" }), _jsxs(Select, { value: editFormData.shift, onValueChange: (value) => handleEditInputChange("shift", value), children: [_jsx(SelectTrigger, { id: "edit-shift", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select shift" }) }), _jsx(SelectContent, { children: fallbackShifts.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }), editErrors.shift && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.shift }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-inputQty", children: "Input Qty (KG)" }), _jsx(Input, { id: "edit-inputQty", type: "number", step: "0.01", min: "0", value: editFormData.inputQty, onChange: (e) => handleEditInputChange("inputQty", e.target.value), placeholder: "Enter input quantity", className: editErrors.inputQty ? "border-red-500" : "" }), editErrors.inputQty && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.inputQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-outputQty", children: "Output Qty (KG)" }), _jsx(Input, { id: "edit-outputQty", type: "number", step: "0.01", min: "0", value: editFormData.outputQty, onChange: (e) => handleEditInputChange("outputQty", e.target.value), placeholder: "Enter output quantity", className: editErrors.outputQty ? "border-red-500" : "" }), editErrors.outputQty && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.outputQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-wastageQty", children: "Wastage Qty (KG)" }), _jsx(Input, { id: "edit-wastageQty", type: "number", step: "0.01", min: "0", value: editFormData.wastageQty, onChange: (e) => handleEditInputChange("wastageQty", e.target.value), placeholder: "Enter wastage quantity", className: editErrors.wastageQty ? "border-red-500" : "" }), editErrors.wastageQty && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.wastageQty }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-inputRollCount", children: "Input Roll Count" }), _jsx(Input, { id: "edit-inputRollCount", type: "number", min: "0", value: editFormData.inputRollCount, onChange: (e) => handleEditInputChange("inputRollCount", e.target.value), placeholder: "Enter input roll count", className: editErrors.inputRollCount ? "border-red-500" : "" }), editErrors.inputRollCount && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.inputRollCount }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-outputRollCount", children: "Output Roll Count" }), _jsx(Input, { id: "edit-outputRollCount", type: "number", min: "0", value: editFormData.outputRollCount, onChange: (e) => handleEditInputChange("outputRollCount", e.target.value), placeholder: "Enter output roll count", className: editErrors.outputRollCount ? "border-red-500" : "" }), editErrors.outputRollCount && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.outputRollCount }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-startedAt", children: "Started At" }), _jsx(Input, { id: "edit-startedAt", type: "datetime-local", value: editFormData.startedAt, onChange: (e) => handleEditInputChange("startedAt", e.target.value), className: editErrors.startedAt ? "border-red-500" : "" }), editErrors.startedAt && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.startedAt }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-finishedAt", children: "Finished At" }), _jsx(Input, { id: "edit-finishedAt", type: "datetime-local", value: editFormData.finishedAt, onChange: (e) => handleEditInputChange("finishedAt", e.target.value), className: editErrors.finishedAt ? "border-red-500" : "" }), editErrors.finishedAt && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.finishedAt }))] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Update Job Card" })] })] })] }) }))] }));
}
