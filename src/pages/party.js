import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getPartyMasterColumns } from "@/components/columns/party-master-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/axios";
import { createParty, deleteParty, getAllParties, updateParty } from "@/lib/party-api";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const PARTY_LABEL = {
    supplier: "Supplier",
    customer: "Customer",
};
function matchesPartyKind(partyType, partyKind) {
    const normalized = partyType.trim().toLowerCase();
    return normalized === partyKind || normalized === "both";
}
export default function Party({ partyKind }) {
    const partyLabel = PARTY_LABEL[partyKind];
    const { user } = useAuth();
    const canEdit = user?.role === "admin" || user?.role === "superuser";
    const fallbackPartyTypes = ["customer", "supplier", "both"];
    const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
    const [isEditPartyOpen, setIsEditPartyOpen] = useState(false);
    const [editPartyId, setEditPartyId] = useState(null);
    const [partyTypes, setPartyTypes] = useState(fallbackPartyTypes);
    const [formData, setFormData] = useState({
        partyCode: "",
        partyName: "",
        partyType: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [parties, setParties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        partyCode: "",
        partyName: "",
        partyType: "",
    });
    const [editErrors, setEditErrors] = useState({});
    const addFieldRefs = useRef([]);
    const visibleParties = parties.filter((party) => matchesPartyKind(party.partyType, partyKind));
    const handleRefresh = () => {
        fetchParties();
    };
    const handleAddParty = () => {
        setFormData({
            partyCode: "",
            partyName: "",
            partyType: partyKind,
        });
        setFormErrors({});
        setIsAddPartyOpen(true);
    };
    const handleEditPartyOpen = (party) => {
        setEditPartyId(party.id);
        setEditFormData({
            partyCode: party.partyCode,
            partyName: party.partyName,
            partyType: party.partyType,
        });
        setEditErrors({});
        setIsEditPartyOpen(true);
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => {
            if (field === "partyCode") {
                const shouldSyncName = !prev.partyName.trim() || prev.partyName === prev.partyCode;
                return {
                    ...prev,
                    partyCode: value,
                    partyName: shouldSyncName ? value : prev.partyName,
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
            if (field === "partyCode") {
                const shouldSyncName = !prev.partyName.trim() || prev.partyName === prev.partyCode;
                return {
                    ...prev,
                    partyCode: value,
                    partyName: shouldSyncName ? value : prev.partyName,
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
        if (!formData.partyCode.trim()) {
            errors.partyCode = "Party code is required";
        }
        if (!formData.partyName.trim()) {
            errors.partyName = "Party name is required";
        }
        if (!formData.partyType.trim()) {
            errors.partyType = "Party type is required";
        }
        if (parties.some(party => party.partyCode === formData.partyCode.trim())) {
            errors.partyCode = "Party code already exists";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.partyCode.trim()) {
            errors.partyCode = "Party code is required";
        }
        if (!editFormData.partyName.trim()) {
            errors.partyName = "Party name is required";
        }
        if (!editFormData.partyType.trim()) {
            errors.partyType = "Party type is required";
        }
        if (parties.some(party => party.partyCode === editFormData.partyCode.trim() &&
            party.id !== editPartyId)) {
            errors.partyCode = "Party code already exists";
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        createParty({
            partyCode: formData.partyCode.trim(),
            partyName: formData.partyName.trim(),
            partyType: partyKind,
        })
            .then((newParty) => {
            setParties(prev => [newParty, ...prev]);
            setFormData({
                partyCode: "",
                partyName: "",
                partyType: partyKind,
            });
            setFormErrors({});
            setIsAddPartyOpen(false);
        })
            .catch((err) => {
            console.error("Error creating party:", err);
            setFormErrors({ partyCode: "Failed to create party. Please try again." });
        });
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editPartyId || !validateEditForm())
            return;
        updateParty(editPartyId, {
            partyCode: editFormData.partyCode.trim(),
            partyName: editFormData.partyName.trim(),
            partyType: editFormData.partyType.trim(),
        })
            .then((updatedParty) => {
            setParties(prev => prev.map(party => (party.id === updatedParty.id ? updatedParty : party)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating party:", err);
            setEditErrors({ partyCode: "Failed to update party. Please try again." });
        });
    };
    const handleDeleteParty = (party) => {
        if (!window.confirm(`Remove party "${party.partyName}"? It will no longer appear in new entries. Existing records keep their link.`)) {
            return;
        }
        deleteParty(party.id)
            .then(() => {
            setParties(prev => prev.filter(row => row.id !== party.id));
        })
            .catch((err) => {
            console.error("Error deleting party:", err);
            const msg = err.response?.data?.detail ?? "Failed to delete party. Please try again.";
            setError(typeof msg === "string" ? msg : "Failed to delete party. Please try again.");
        });
    };
    const handleCloseModal = () => {
        setIsAddPartyOpen(false);
        setFormData({
            partyCode: "",
            partyName: "",
            partyType: partyKind,
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditPartyOpen(false);
        setEditPartyId(null);
        setEditFormData({
            partyCode: "",
            partyName: "",
            partyType: "",
        });
        setEditErrors({});
    };
    useEffect(() => {
        if (isAddPartyOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddPartyOpen]);
    useEffect(() => {
        const fetchPartyTypes = async () => {
            try {
                const response = await api.get("/meta/party-types");
                if (response.data.length > 0) {
                    setPartyTypes(response.data);
                }
            }
            catch (error) {
                console.error("Failed to load party types:", error);
                setPartyTypes(fallbackPartyTypes);
            }
        };
        fetchPartyTypes();
    }, []);
    const fetchParties = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllParties();
            setParties(data);
        }
        catch (err) {
            console.error("Error fetching parties:", err);
            setError("Failed to fetch parties. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchParties();
    }, []);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: partyLabel }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: ["Manage ", partyLabel.toLowerCase(), " master data."] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), canEdit && (_jsxs(Button, { onClick: handleAddParty, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsxs("span", { className: "hidden sm:inline", children: ["Add ", partyLabel] })] }))] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading parties..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Parties" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getPartyMasterColumns({
                        onEdit: handleEditPartyOpen,
                        onDelete: handleDeleteParty,
                        canEdit,
                    }), data: visibleParties }) })), visibleParties.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsxs("p", { className: "text-gray-500 dark:text-gray-400", children: ["No ", partyLabel.toLowerCase(), "s found. Create your first ", partyLabel.toLowerCase(), " to get started."] }) })), isAddPartyOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsxs(CardTitle, { children: ["Add New ", partyLabel] }), _jsxs(CardDescription, { children: ["Create a new ", partyLabel.toLowerCase(), " with basic details."] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(CardContent, { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "partyCode", children: "Party Code *" }), _jsx(Input, { id: "partyCode", ref: (el) => {
                                                            addFieldRefs.current[0] = el;
                                                        }, value: formData.partyCode, onChange: (e) => handleInputChange("partyCode", e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter party code", className: formErrors.partyCode ? "border-red-500" : "" }), formErrors.partyCode && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.partyCode }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "partyName", children: "Party Name *" }), _jsx(Input, { id: "partyName", ref: (el) => {
                                                            addFieldRefs.current[1] = el;
                                                        }, value: formData.partyName, onChange: (e) => handleInputChange("partyName", e.target.value), onKeyDown: (e) => handleEnterKey(e, 1), placeholder: "Enter party name", className: formErrors.partyName ? "border-red-500" : "" }), formErrors.partyName && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.partyName }))] })] }) }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", children: "Cancel" }), _jsxs(Button, { type: "submit", className: "flex-1", children: ["Save ", partyLabel] })] })] })] }) })), isEditPartyOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Party" }), _jsx(CardDescription, { children: "Update the party details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-partyCode", children: "Party Code *" }), _jsx(Input, { id: "edit-partyCode", value: editFormData.partyCode, onChange: (e) => handleEditInputChange("partyCode", e.target.value), placeholder: "Enter party code", className: editErrors.partyCode ? "border-red-500" : "" }), editErrors.partyCode && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.partyCode }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-partyName", children: "Party Name *" }), _jsx(Input, { id: "edit-partyName", value: editFormData.partyName, onChange: (e) => handleEditInputChange("partyName", e.target.value), placeholder: "Enter party name", className: editErrors.partyName ? "border-red-500" : "" }), editErrors.partyName && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.partyName }))] })] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-partyType", children: "Party Type *" }), _jsxs(Select, { value: editFormData.partyType, onValueChange: (value) => handleEditInputChange("partyType", value), children: [_jsx(SelectTrigger, { id: "edit-partyType", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select party type" }) }), _jsx(SelectContent, { children: partyTypes.map((partyType) => (_jsx(SelectItem, { value: partyType, children: partyType }, partyType))) })] }), editErrors.partyType && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.partyType }))] }) })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Changes" })] })] })] }) }))] }));
}
