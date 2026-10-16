import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getOperatorMasterColumns } from "@/components/columns/operator-master-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllMachines } from "@/lib/machine-api";
import { createOperator, deleteOperator, getAllOperators, updateOperator } from "@/lib/operator-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
export default function Operator() {
    const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
    const [isEditOperatorOpen, setIsEditOperatorOpen] = useState(false);
    const [editOperatorId, setEditOperatorId] = useState(null);
    const [machines, setMachines] = useState([]);
    const [formData, setFormData] = useState({
        operatorName: "",
        machineId: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [operators, setOperators] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        operatorName: "",
        machineId: "",
    });
    const [editErrors, setEditErrors] = useState({});
    const addFieldRefs = useRef([]);
    const handleRefresh = () => {
        fetchOperators();
    };
    const handleAddOperator = () => {
        setIsAddOperatorOpen(true);
    };
    const handleEditOperatorOpen = (operator) => {
        setEditOperatorId(operator.id);
        setEditFormData({
            operatorName: operator.operatorName,
            machineId: operator.machineId?.toString() || "",
        });
        setEditErrors({});
        setIsEditOperatorOpen(true);
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
        if (!formData.operatorName.trim()) {
            errors.operatorName = "Operator name is required";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.operatorName.trim()) {
            errors.operatorName = "Operator name is required";
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        createOperator({
            operatorName: formData.operatorName.trim(),
            machineId: formData.machineId ? parseInt(formData.machineId) : null,
        })
            .then((newOperator) => {
            setOperators(prev => [newOperator, ...prev]);
            setFormData({
                operatorName: "",
                machineId: "",
            });
            setFormErrors({});
            setIsAddOperatorOpen(false);
        })
            .catch((err) => {
            console.error("Error creating operator:", err);
            setFormErrors({ operatorName: "Failed to create operator. Please try again." });
            // Refetch so if the operator was actually created (e.g. 500 after commit), list stays in sync
            fetchOperators();
        });
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editOperatorId || !validateEditForm())
            return;
        updateOperator(editOperatorId, {
            operatorName: editFormData.operatorName.trim(),
            machineId: editFormData.machineId ? parseInt(editFormData.machineId) : null,
        })
            .then((updatedOperator) => {
            setOperators(prev => prev.map(operator => (operator.id === updatedOperator.id ? updatedOperator : operator)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating operator:", err);
            setEditErrors({ operatorName: "Failed to update operator. Please try again." });
        });
    };
    const handleDeleteOperator = (operator) => {
        if (!window.confirm(`Remove operator "${operator.operatorName}"? It will no longer appear in new entries.`)) {
            return;
        }
        deleteOperator(operator.id)
            .then(() => {
            setOperators(prev => prev.filter(row => row.id !== operator.id));
        })
            .catch((err) => {
            console.error("Error deleting operator:", err);
            setError("Failed to delete operator. Please try again.");
        });
    };
    const handleCloseModal = () => {
        setIsAddOperatorOpen(false);
        setFormData({
            operatorName: "",
            machineId: "",
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditOperatorOpen(false);
        setEditOperatorId(null);
        setEditFormData({
            operatorName: "",
            machineId: "",
        });
        setEditErrors({});
    };
    useEffect(() => {
        if (isAddOperatorOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddOperatorOpen]);
    const fetchMachines = async () => {
        try {
            const data = await getAllMachines();
            setMachines(data.map(m => ({
                id: m.id,
                machineCode: m.machineCode,
                machineName: m.machineName,
            })));
        }
        catch (error) {
            console.error("Failed to load machines:", error);
        }
    };
    const fetchOperators = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllOperators();
            setOperators(data);
        }
        catch (err) {
            console.error("Error fetching operators:", err);
            setError("Failed to fetch operators. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchMachines();
        fetchOperators();
    }, []);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Operator" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage operator master data." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: handleAddOperator, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Operator" })] })] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading operators..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Operators" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getOperatorMasterColumns({
                        onEdit: handleEditOperatorOpen,
                        onDelete: handleDeleteOperator,
                    }), data: operators }) })), operators.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No operators found. Create your first operator to get started." }) })), isAddOperatorOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add New Operator" }), _jsx(CardDescription, { children: "Create a new operator with basic details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(CardContent, { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "operatorName", children: "Operator Name *" }), _jsx(Input, { id: "operatorName", ref: (el) => {
                                                            addFieldRefs.current[0] = el;
                                                        }, value: formData.operatorName, onChange: (e) => handleInputChange("operatorName", e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter operator name", className: formErrors.operatorName ? "border-red-500" : "" }), formErrors.operatorName && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.operatorName }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "machineId", children: "Machine" }), _jsxs(Select, { value: formData.machineId || undefined, onValueChange: (value) => {
                                                            if (value === "__clear__") {
                                                                handleInputChange("machineId", "");
                                                            }
                                                            else {
                                                                handleInputChange("machineId", value);
                                                            }
                                                        }, children: [_jsx(SelectTrigger, { id: "machineId", ref: (el) => {
                                                                    addFieldRefs.current[1] = el;
                                                                }, onKeyDown: (e) => handleEnterKey(e, 1), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select machine (optional)" }) }), _jsxs(SelectContent, { children: [formData.machineId && (_jsx(SelectItem, { value: "__clear__", children: "Clear selection" })), machines.filter(m => m && m.id).map((machine) => (_jsxs(SelectItem, { value: String(machine.id), children: [machine.machineCode || "", " - ", machine.machineName || ""] }, machine.id)))] })] })] })] }) }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Operator" })] })] })] }) })), isEditOperatorOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Operator" }), _jsx(CardDescription, { children: "Update the operator details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsx(CardContent, { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-operatorName", children: "Operator Name *" }), _jsx(Input, { id: "edit-operatorName", value: editFormData.operatorName, onChange: (e) => handleEditInputChange("operatorName", e.target.value), placeholder: "Enter operator name", className: editErrors.operatorName ? "border-red-500" : "" }), editErrors.operatorName && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.operatorName }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-machineId", children: "Machine" }), _jsxs(Select, { value: editFormData.machineId || undefined, onValueChange: (value) => {
                                                            if (value === "__clear__") {
                                                                handleEditInputChange("machineId", "");
                                                            }
                                                            else {
                                                                handleEditInputChange("machineId", value);
                                                            }
                                                        }, children: [_jsx(SelectTrigger, { id: "edit-machineId", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select machine (optional)" }) }), _jsxs(SelectContent, { children: [editFormData.machineId && (_jsx(SelectItem, { value: "__clear__", children: "Clear selection" })), machines.filter(m => m && m.id).map((machine) => (_jsxs(SelectItem, { value: String(machine.id), children: [machine.machineCode || "", " - ", machine.machineName || ""] }, machine.id)))] })] })] })] }) }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Changes" })] })] })] }) }))] }));
}
