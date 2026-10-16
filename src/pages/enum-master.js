import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getEnumMasterColumns } from "@/components/columns/enum-master-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { createEnumMasterValue, deleteEnumMasterValue, getEnumMasterTypes, getEnumMasterValues, updateEnumMasterValue, } from "@/lib/enum-master-api";
const DEFAULT_ENUM_KEY = "reason_of_wastage";
export default function EnumMaster() {
    const [enumTypes, setEnumTypes] = useState([]);
    const [selectedEnumKey, setSelectedEnumKey] = useState(DEFAULT_ENUM_KEY);
    const [values, setValues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addValue, setAddValue] = useState("");
    const [addError, setAddError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [editError, setEditError] = useState(null);
    const fetchSeq = useRef(0);
    const enumOptions = enumTypes.map((item) => ({
        value: item.key,
        label: item.label,
    }));
    const selectedLabel = enumTypes.find((item) => item.key === selectedEnumKey)?.label || "Select enum";
    const fetchTypes = async () => {
        try {
            const types = await getEnumMasterTypes();
            setEnumTypes(types);
            if (types.length > 0 && !types.some((t) => t.key === selectedEnumKey)) {
                setSelectedEnumKey(types[0].key);
            }
        }
        catch (err) {
            console.error("Failed to load enum types:", err);
            setEnumTypes([{ key: DEFAULT_ENUM_KEY, label: "Reason of Wastage" }]);
        }
    };
    const fetchValues = async (enumKey = selectedEnumKey) => {
        const seq = ++fetchSeq.current;
        if (!enumKey) {
            setValues([]);
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const data = await getEnumMasterValues(enumKey);
            if (seq !== fetchSeq.current)
                return;
            setValues(data);
        }
        catch (err) {
            if (seq !== fetchSeq.current)
                return;
            console.error("Failed to load enum values:", err);
            setError("Failed to fetch enum values. Please try again.");
        }
        finally {
            if (seq === fetchSeq.current)
                setIsLoading(false);
        }
    };
    useEffect(() => {
        void fetchTypes();
    }, []);
    useEffect(() => {
        void fetchValues(selectedEnumKey);
    }, [selectedEnumKey]);
    const handleAdd = (e) => {
        e.preventDefault();
        const trimmed = addValue.trim();
        if (!trimmed) {
            setAddError("Value is required");
            return;
        }
        setIsSaving(true);
        createEnumMasterValue(selectedEnumKey, trimmed)
            .then((created) => {
            setValues((prev) => [...prev.filter((row) => row.id !== created.id), created].sort((a, b) => a.value.localeCompare(b.value)));
            setIsAddOpen(false);
            setAddValue("");
            setAddError(null);
        })
            .catch((err) => {
            setAddError(err.response?.data?.detail || "Failed to add value.");
        })
            .finally(() => {
            setIsSaving(false);
        });
    };
    const handleEdit = (e) => {
        e.preventDefault();
        if (!editRow)
            return;
        const trimmed = editValue.trim();
        if (!trimmed) {
            setEditError("Value is required");
            return;
        }
        setIsSaving(true);
        updateEnumMasterValue(editRow.id, trimmed)
            .then((updated) => {
            setValues((prev) => prev
                .map((row) => (row.id === updated.id ? updated : row))
                .sort((a, b) => a.value.localeCompare(b.value)));
            setEditRow(null);
            setEditValue("");
            setEditError(null);
        })
            .catch((err) => {
            setEditError(err.response?.data?.detail || "Failed to update value.");
        })
            .finally(() => {
            setIsSaving(false);
        });
    };
    const handleDelete = (row) => {
        if (!window.confirm(`Delete "${row.value}"? This cannot be undone.`))
            return;
        deleteEnumMasterValue(row.id)
            .then(() => {
            setValues((prev) => prev.filter((item) => item.id !== row.id));
        })
            .catch((err) => {
            console.error("Failed to delete enum value:", err);
            setError(err.response?.data?.detail || "Failed to delete value.");
        });
    };
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Enum Master" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Add, edit, and remove values for dropdowns used across the floor." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: () => void fetchValues(), variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: () => { setAddValue(""); setAddError(null); setIsAddOpen(true); }, size: "sm", disabled: !selectedEnumKey, children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Value" })] })] })] }) }), _jsxs("div", { className: "mb-4 max-w-md space-y-2", children: [_jsx(Label, { children: "Enum" }), _jsx(CreatableCombobox, { options: enumOptions, value: selectedEnumKey || null, onValueChange: (value) => {
                            if (value && enumOptions.some((option) => option.value === value)) {
                                setSelectedEnumKey(value);
                            }
                        }, placeholder: "Select enum", searchPlaceholder: "Search enum...", emptyMessage: "No enums found." })] }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading values..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Values" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: () => void fetchValues(), variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : values.length === 0 ? (_jsx("div", { className: "text-center py-8", children: _jsxs("p", { className: "text-gray-500 dark:text-gray-400", children: ["No values for ", selectedLabel, ". Add the first value to get started."] }) })) : (_jsx(DataTable, { columns: getEnumMasterColumns({
                    onEdit: (row) => {
                        setEditRow(row);
                        setEditValue(row.value);
                        setEditError(null);
                    },
                    onDelete: handleDelete,
                }), data: values })), isAddOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add Value" }), _jsxs(CardDescription, { children: ["New value for ", selectedLabel, "."] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setIsAddOpen(false), className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleAdd, children: [_jsx(CardContent, { className: "space-y-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "enum-value", children: "Value *" }), _jsx(Input, { id: "enum-value", autoFocus: true, value: addValue, onChange: (e) => {
                                                    setAddValue(e.target.value);
                                                    if (addError)
                                                        setAddError(null);
                                                }, placeholder: "Enter value", className: addError ? "border-red-500" : "" }), addError && _jsx("p", { className: "text-sm text-red-500", children: addError })] }) }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", className: "flex-1", onClick: () => setIsAddOpen(false), children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSaving, children: isSaving ? "Saving…" : "Save" })] })] })] }) })), editRow && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Value" }), _jsxs(CardDescription, { children: ["Update this ", selectedLabel, " value."] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setEditRow(null), className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEdit, children: [_jsx(CardContent, { className: "space-y-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-enum-value", children: "Value *" }), _jsx(Input, { id: "edit-enum-value", autoFocus: true, value: editValue, onChange: (e) => {
                                                    setEditValue(e.target.value);
                                                    if (editError)
                                                        setEditError(null);
                                                }, placeholder: "Enter value", className: editError ? "border-red-500" : "" }), editError && _jsx("p", { className: "text-sm text-red-500", children: editError })] }) }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", className: "flex-1", onClick: () => setEditRow(null), children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSaving, children: isSaving ? "Saving…" : "Save Changes" })] })] })] }) }))] }));
}
