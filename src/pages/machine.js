import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getMachineMasterColumns } from "@/components/columns/machine-master-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/axios";
import { createMachine, deleteMachine, getAllMachines, updateMachine } from "@/lib/machine-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
export default function Machine() {
    const fallbackOperations = ["Printing", "Inspection", "Sliter", "ECL", "Lamination"];
    const [isAddMachineOpen, setIsAddMachineOpen] = useState(false);
    const [isEditMachineOpen, setIsEditMachineOpen] = useState(false);
    const [editMachineId, setEditMachineId] = useState(null);
    const [operations, setOperations] = useState(fallbackOperations);
    const [formData, setFormData] = useState({
        machineCode: "",
        machineName: "",
        operation: "",
        status: "active",
    });
    const [formErrors, setFormErrors] = useState({});
    const [machines, setMachines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        machineCode: "",
        machineName: "",
        operation: "",
        status: "active",
    });
    const [editErrors, setEditErrors] = useState({});
    const addFieldRefs = useRef([]);
    const handleRefresh = () => {
        fetchMachines();
    };
    const handleAddMachine = () => {
        setIsAddMachineOpen(true);
    };
    const handleEditMachineOpen = (machine) => {
        setEditMachineId(machine.id);
        setEditFormData({
            machineCode: machine.machineCode,
            machineName: machine.machineName,
            operation: machine.operation,
            status: machine.status,
        });
        setEditErrors({});
        setIsEditMachineOpen(true);
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => {
            if (field === "machineCode") {
                const shouldSyncName = !prev.machineName.trim() || prev.machineName === prev.machineCode;
                return {
                    ...prev,
                    machineCode: value,
                    machineName: shouldSyncName ? value : prev.machineName,
                };
            }
            return { ...prev, [field]: value };
        });
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleEditInputChange = (field, value) => {
        setEditFormData(prev => {
            if (field === "machineCode") {
                const shouldSyncName = !prev.machineName.trim() || prev.machineName === prev.machineCode;
                return {
                    ...prev,
                    machineCode: value,
                    machineName: shouldSyncName ? value : prev.machineName,
                };
            }
            return { ...prev, [field]: value };
        });
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
        if (!formData.machineCode.trim()) {
            errors.machineCode = "Machine code is required";
        }
        if (!formData.machineName.trim()) {
            errors.machineName = "Machine name is required";
        }
        if (!formData.operation.trim()) {
            errors.operation = "Operation is required";
        }
        if (machines.some(machine => machine.machineCode === formData.machineCode.trim())) {
            errors.machineCode = "Machine code already exists";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.machineCode.trim()) {
            errors.machineCode = "Machine code is required";
        }
        if (!editFormData.machineName.trim()) {
            errors.machineName = "Machine name is required";
        }
        if (!editFormData.operation.trim()) {
            errors.operation = "Operation is required";
        }
        if (machines.some(machine => machine.machineCode === editFormData.machineCode.trim() &&
            machine.id !== editMachineId)) {
            errors.machineCode = "Machine code already exists";
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        createMachine({
            machineCode: formData.machineCode.trim(),
            machineName: formData.machineName.trim(),
            operation: formData.operation.trim(),
            status: formData.status,
        })
            .then((newMachine) => {
            setMachines(prev => [newMachine, ...prev]);
            setFormData({
                machineCode: "",
                machineName: "",
                operation: "",
                status: "active",
            });
            setFormErrors({});
            setIsAddMachineOpen(false);
        })
            .catch((err) => {
            console.error("Error creating machine:", err);
            setFormErrors({ machineCode: "Failed to create machine. Please try again." });
        });
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editMachineId || !validateEditForm())
            return;
        updateMachine(editMachineId, {
            machineCode: editFormData.machineCode.trim(),
            machineName: editFormData.machineName.trim(),
            operation: editFormData.operation.trim(),
            status: editFormData.status,
        })
            .then((updatedMachine) => {
            setMachines(prev => prev.map(machine => (machine.id === updatedMachine.id ? updatedMachine : machine)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating machine:", err);
            setEditErrors({ machineCode: "Failed to update machine. Please try again." });
        });
    };
    const handleDeleteMachine = (machine) => {
        if (!window.confirm(`Remove machine "${machine.machineName}"? It will no longer appear in new entries. Existing records keep their link.`)) {
            return;
        }
        deleteMachine(machine.id)
            .then(() => {
            setMachines(prev => prev.filter(row => row.id !== machine.id));
        })
            .catch((err) => {
            console.error("Error deleting machine:", err);
            setError("Failed to delete machine. Please try again.");
        });
    };
    const handleCloseModal = () => {
        setIsAddMachineOpen(false);
        setFormData({
            machineCode: "",
            machineName: "",
            operation: "",
            status: "active",
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditMachineOpen(false);
        setEditMachineId(null);
        setEditFormData({
            machineCode: "",
            machineName: "",
            operation: "",
            status: "active",
        });
        setEditErrors({});
    };
    useEffect(() => {
        if (isAddMachineOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddMachineOpen]);
    useEffect(() => {
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
        fetchOperations();
    }, []);
    const fetchMachines = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllMachines();
            setMachines(data);
        }
        catch (err) {
            console.error("Error fetching machines:", err);
            setError("Failed to fetch machines. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchMachines();
    }, []);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Machine" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage machine master data." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: handleAddMachine, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Machine" })] })] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading machines..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Machines" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getMachineMasterColumns({
                        onEdit: handleEditMachineOpen,
                        onDelete: handleDeleteMachine,
                    }), data: machines }) })), machines.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No machines found. Create your first machine to get started." }) })), isAddMachineOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add New Machine" }), _jsx(CardDescription, { children: "Create a new machine with basic details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "machineCode", children: "Machine Code *" }), _jsx(Input, { id: "machineCode", ref: (el) => {
                                                                addFieldRefs.current[0] = el;
                                                            }, value: formData.machineCode, onChange: (e) => handleInputChange("machineCode", e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter machine code", className: formErrors.machineCode ? "border-red-500" : "" }), formErrors.machineCode && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.machineCode }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "machineName", children: "Machine Name *" }), _jsx(Input, { id: "machineName", ref: (el) => {
                                                                addFieldRefs.current[1] = el;
                                                            }, value: formData.machineName, onChange: (e) => handleInputChange("machineName", e.target.value), onKeyDown: (e) => handleEnterKey(e, 1), placeholder: "Enter machine name", className: formErrors.machineName ? "border-red-500" : "" }), formErrors.machineName && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.machineName }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "operation", children: "Operation *" }), _jsxs(Select, { value: formData.operation, onValueChange: (value) => handleInputChange("operation", value), children: [_jsx(SelectTrigger, { id: "operation", ref: (el) => {
                                                                        addFieldRefs.current[2] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 2), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select operation" }) }), _jsx(SelectContent, { children: operations.map((operation) => (_jsx(SelectItem, { value: operation, children: operation }, operation))) })] }), formErrors.operation && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.operation }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "status", children: "Status" }), _jsxs(Select, { value: formData.status, onValueChange: (value) => handleInputChange("status", value), children: [_jsx(SelectTrigger, { id: "status", ref: (el) => {
                                                                        addFieldRefs.current[3] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 3), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "active", children: "Active" }), _jsx(SelectItem, { value: "inactive", children: "Inactive" })] })] })] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Machine" })] })] })] }) })), isEditMachineOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Machine" }), _jsx(CardDescription, { children: "Update the machine details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-machineCode", children: "Machine Code *" }), _jsx(Input, { id: "edit-machineCode", value: editFormData.machineCode, onChange: (e) => handleEditInputChange("machineCode", e.target.value), placeholder: "Enter machine code", className: editErrors.machineCode ? "border-red-500" : "" }), editErrors.machineCode && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.machineCode }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-machineName", children: "Machine Name *" }), _jsx(Input, { id: "edit-machineName", value: editFormData.machineName, onChange: (e) => handleEditInputChange("machineName", e.target.value), placeholder: "Enter machine name", className: editErrors.machineName ? "border-red-500" : "" }), editErrors.machineName && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.machineName }))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-operation", children: "Operation *" }), _jsxs(Select, { value: editFormData.operation, onValueChange: (value) => handleEditInputChange("operation", value), children: [_jsx(SelectTrigger, { id: "edit-operation", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select operation" }) }), _jsx(SelectContent, { children: operations.map((operation) => (_jsx(SelectItem, { value: operation, children: operation }, operation))) })] }), editErrors.operation && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.operation }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-status", children: "Status" }), _jsxs(Select, { value: editFormData.status, onValueChange: (value) => handleEditInputChange("status", value), children: [_jsx(SelectTrigger, { id: "edit-status", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "active", children: "Active" }), _jsx(SelectItem, { value: "inactive", children: "Inactive" })] })] })] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Changes" })] })] })] }) }))] }));
}
