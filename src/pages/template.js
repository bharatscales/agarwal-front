import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, RefreshCw, X, Trash2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getTemplateMasterColumns } from "@/components/columns/template-master-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { createTemplate, deleteTemplate, getAllTemplates, updateTemplate } from "@/lib/template-api";
import { useAuth } from "@/contexts/AuthContext";
const fileTypeOptions = [
    { value: "ZPL", label: "ZPL" },
    { value: "PDF", label: "PDF" },
];
const defaultFormOptions = [
    { value: "stock_roll_stk", label: "Stock Roll STK" },
    { value: "stock_ink_stk", label: "Stock Ink STK" },
    { value: "wip-printing", label: "WIP Printing" },
    { value: "wip-lamination", label: "WIP Lamination" },
    { value: "wip-slitting", label: "WIP Slitting" },
    { value: "wip-ecl", label: "WIP ECL" },
];
// Variables available for each default form type
const formVariables = {
    stock_roll_stk: [
        "itemCode",
        "itemName",
        "rollno",
        "size",
        "micron",
        "netweight",
        "grossweight",
        "barcode",
        "stockVoucher.id",
        "stockVoucher.vendor",
        "stockVoucher.vendorName",
        "stockVoucher.vendorCode",
        "stockVoucher.vendorId",
        "stockVoucher.invoiceNo",
        "stockVoucher.invoiceDate",
        "stockVoucher.stockType",
    ],
    stock_ink_stk: [
        "itemCode",
        "itemName",
        "barcode",
        "quantity",
        "unit",
        "stockVoucher.id",
        "stockVoucher.vendor",
        "stockVoucher.vendorName",
        "stockVoucher.vendorCode",
        "stockVoucher.vendorId",
        "stockVoucher.invoiceNo",
        "stockVoucher.invoiceDate",
        "stockVoucher.stockType",
    ],
    "wip-printing": [
        "workOrder.id",
        "workOrder.woNumber",
        "workOrder.partyName",
        "workOrder.partyCode",
        "workOrder.itemName",
        "workOrder.itemCode",
        "workOrder.plannedQty",
        "workOrder.producedQty",
        "workOrder.status",
        "workOrder.priority",
        "workOrder.createdAt",
        "workOrder.startedAt",
        "workOrder.completedAt",
        "jobCard.id",
        "jobCard.jobCardNumber",
        "roll.id",
        "roll.barcode",
        "roll.size",
        "roll.micron",
        "roll.netweight",
        "roll.grossweight",
        "roll.itemName",
    ],
    "wip-lamination": [],
    "wip-slitting": [],
    "wip-ecl": [],
};
// Helper function to generate JSON template based on type
const generateJsonTemplate = (type, fileType) => {
    if (fileType === "ZPL") {
        switch (type) {
            case "simple_text":
                return JSON.stringify({
                    type: "Normal",
                    x: 50,
                    y: 50,
                    font_size: 60,
                    data: "your data"
                }, null, 2);
            case "field_block":
                return JSON.stringify({
                    type: "FB",
                    x: 50,
                    y: 50,
                    width: 700,
                    font_size: 60,
                    align: "C",
                    data: "your data"
                }, null, 2);
            case "qr_code":
                return JSON.stringify({
                    type: "BC",
                    x: 50,
                    y: 50,
                    magnification: 5,
                    data: "your data"
                }, null, 2);
            case "image":
                return JSON.stringify({
                    type: "GF",
                    x: 50,
                    y: 50,
                    data: "your image code"
                }, null, 2);
            default:
                return "";
        }
    }
    else if (fileType === "PDF") {
        // PDF templates will be designed later
        switch (type) {
            case "text":
                return JSON.stringify({
                    type: "text",
                    // Will be designed later
                }, null, 2);
            case "table":
                return JSON.stringify({
                    type: "table",
                    // Will be designed later
                }, null, 2);
            case "total":
                return JSON.stringify({
                    type: "total",
                    // Will be designed later
                }, null, 2);
            default:
                return "";
        }
    }
    return "";
};
export default function Template() {
    const { user } = useAuth();
    const isSuperUser = user?.role === "superuser";
    const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
    const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
    const [editTemplateId, setEditTemplateId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        fileType: "",
        templateJsonArray: [],
        defaultForm: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        fileType: "",
        templateJsonArray: [],
        defaultForm: "",
    });
    const [editErrors, setEditErrors] = useState({});
    const [templateSelectValue, setTemplateSelectValue] = useState("");
    const [editTemplateSelectValue, setEditTemplateSelectValue] = useState("");
    const [draggedVariable, setDraggedVariable] = useState("");
    const [dragOverTextareaIndex, setDragOverTextareaIndex] = useState(null);
    const [dragOverEditTextareaIndex, setDragOverEditTextareaIndex] = useState(null);
    const addFieldRefs = useRef([]);
    const handleRefresh = () => {
        fetchTemplates();
    };
    const handleAddTemplate = () => {
        setIsAddTemplateOpen(true);
    };
    const handleEditTemplateOpen = (template) => {
        setEditTemplateId(template.id);
        setEditFormData({
            name: template.name,
            fileType: template.fileType,
            templateJsonArray: template.template && Array.isArray(template.template)
                ? template.template.map(item => JSON.stringify(item, null, 2))
                : template.template
                    ? [JSON.stringify(template.template, null, 2)]
                    : [],
            defaultForm: template.defaultForm || "",
        });
        setEditErrors({});
        setIsEditTemplateOpen(true);
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
        if (!formData.name.trim()) {
            errors.name = "Name is required";
        }
        if (templates.some(template => template.name === formData.name.trim())) {
            errors.name = "Template name already exists";
        }
        if (!formData.fileType.trim()) {
            errors.fileType = "File type is required";
        }
        // Validate each JSON object in the array
        formData.templateJsonArray.forEach((jsonStr, index) => {
            if (jsonStr.trim()) {
                try {
                    JSON.parse(jsonStr.trim());
                }
                catch (e) {
                    errors.templateJsonArray = `Invalid JSON format at item ${index + 1}`;
                }
            }
        });
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.name.trim()) {
            errors.name = "Name is required";
        }
        if (templates.some(template => template.name === editFormData.name.trim() &&
            template.id !== editTemplateId)) {
            errors.name = "Template name already exists";
        }
        if (!editFormData.fileType.trim()) {
            errors.fileType = "File type is required";
        }
        // Validate each JSON object in the array
        editFormData.templateJsonArray.forEach((jsonStr, index) => {
            if (jsonStr.trim()) {
                try {
                    JSON.parse(jsonStr.trim());
                }
                catch (e) {
                    errors.templateJsonArray = `Invalid JSON format at item ${index + 1}`;
                }
            }
        });
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        // Parse all JSON objects in the array
        const templateDataArray = [];
        for (const jsonStr of formData.templateJsonArray) {
            if (jsonStr.trim()) {
                try {
                    templateDataArray.push(JSON.parse(jsonStr.trim()));
                }
                catch (e) {
                    setFormErrors({ templateJsonArray: "Invalid JSON format" });
                    return;
                }
            }
        }
        createTemplate({
            name: formData.name.trim(),
            file_type: formData.fileType.trim(),
            template: templateDataArray.length > 0 ? templateDataArray : null,
            default_form: formData.defaultForm.trim() || null,
        })
            .then((newTemplate) => {
            setTemplates(prev => [newTemplate, ...prev]);
            setFormData({
                name: "",
                fileType: "",
                templateJsonArray: [],
                defaultForm: "",
            });
            setFormErrors({});
            setIsAddTemplateOpen(false);
        })
            .catch((err) => {
            console.error("Error creating template:", err);
            const errorMessage = err.response?.data?.detail || "Failed to create template. Please try again.";
            setFormErrors({ name: errorMessage });
        });
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editTemplateId || !validateEditForm())
            return;
        // Parse all JSON objects in the array
        const templateDataArray = [];
        for (const jsonStr of editFormData.templateJsonArray) {
            if (jsonStr.trim()) {
                try {
                    templateDataArray.push(JSON.parse(jsonStr.trim()));
                }
                catch (e) {
                    setEditErrors({ templateJsonArray: "Invalid JSON format" });
                    return;
                }
            }
        }
        updateTemplate(editTemplateId, {
            name: editFormData.name.trim(),
            file_type: editFormData.fileType.trim(),
            template: templateDataArray.length > 0 ? templateDataArray : null,
            default_form: editFormData.defaultForm.trim() || null,
        })
            .then((updatedTemplate) => {
            setTemplates(prev => prev.map(template => (template.id === updatedTemplate.id ? updatedTemplate : template)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating template:", err);
            const errorMessage = err.response?.data?.detail || "Failed to update template. Please try again.";
            setEditErrors({ name: errorMessage });
        });
    };
    const handleDeleteTemplate = (template) => {
        if (!window.confirm(`Remove template "${template.name}"? It will no longer appear in new entries. Existing print jobs keep their link.`)) {
            return;
        }
        deleteTemplate(template.id)
            .then(() => {
            setTemplates(prev => prev.filter(row => row.id !== template.id));
        })
            .catch((err) => {
            console.error("Error deleting template:", err);
            setError("Failed to delete template. Please try again.");
        });
    };
    const handleCloseModal = () => {
        setIsAddTemplateOpen(false);
        setFormData({
            name: "",
            fileType: "",
            templateJsonArray: [],
            defaultForm: "",
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditTemplateOpen(false);
        setEditTemplateId(null);
        setEditFormData({
            name: "",
            fileType: "",
            templateJsonArray: [],
            defaultForm: "",
        });
        setEditErrors({});
    };
    const handleRemoveJsonField = (index) => {
        setFormData(prev => ({
            ...prev,
            templateJsonArray: prev.templateJsonArray.filter((_, i) => i !== index)
        }));
    };
    const handleJsonFieldChange = (index, value) => {
        setFormData(prev => ({
            ...prev,
            templateJsonArray: prev.templateJsonArray.map((item, i) => i === index ? value : item)
        }));
        if (formErrors.templateJsonArray) {
            setFormErrors(prev => ({ ...prev, templateJsonArray: undefined }));
        }
    };
    const handleEditRemoveJsonField = (index) => {
        setEditFormData(prev => ({
            ...prev,
            templateJsonArray: prev.templateJsonArray.filter((_, i) => i !== index)
        }));
    };
    const handleEditJsonFieldChange = (index, value) => {
        setEditFormData(prev => ({
            ...prev,
            templateJsonArray: prev.templateJsonArray.map((item, i) => i === index ? value : item)
        }));
        if (editErrors.templateJsonArray) {
            setEditErrors(prev => ({ ...prev, templateJsonArray: undefined }));
        }
    };
    const handleDragStart = (variable) => {
        setDraggedVariable(variable);
    };
    const handleDragEnd = () => {
        setDraggedVariable("");
        setDragOverTextareaIndex(null);
        setDragOverEditTextareaIndex(null);
    };
    const handleDragOver = (e, index, isEdit = false) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (isEdit) {
            setDragOverEditTextareaIndex(index);
        }
        else {
            setDragOverTextareaIndex(index);
        }
        // Calculate and set cursor position in real-time
        if (draggedVariable) {
            const textarea = e.currentTarget;
            const insertPosition = getTextPositionFromCoordinates(textarea, e.clientX, e.clientY);
            // Set cursor position to show where it will be inserted
            textarea.focus();
            textarea.setSelectionRange(insertPosition, insertPosition);
        }
    };
    const handleDragLeave = (e) => {
        // Only clear if we're actually leaving the textarea (not just moving to a child element)
        const relatedTarget = e.relatedTarget;
        const textarea = e.currentTarget;
        if (!textarea.contains(relatedTarget)) {
            setDragOverTextareaIndex(null);
            setDragOverEditTextareaIndex(null);
            // Clear selection when leaving
            textarea.setSelectionRange(textarea.selectionStart, textarea.selectionStart);
        }
    };
    // Helper function to calculate text position from mouse coordinates
    const getTextPositionFromCoordinates = (textarea, x, y) => {
        const rect = textarea.getBoundingClientRect();
        const relativeX = x - rect.left;
        const relativeY = y - rect.top;
        // Account for padding and border
        const style = window.getComputedStyle(textarea);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const borderTop = parseFloat(style.borderTopWidth) || 0;
        // Account for scroll position
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;
        // Adjust coordinates for scroll and padding/border
        const adjustedX = Math.max(0, relativeX - paddingLeft - borderLeft + scrollLeft);
        const adjustedY = Math.max(0, relativeY - paddingTop - borderTop + scrollTop);
        // Get textarea properties
        const text = textarea.value;
        const lines = text.split('\n');
        // Create a temporary div to measure line height accurately
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.whiteSpace = 'pre';
        tempDiv.style.font = style.font;
        tempDiv.style.fontSize = style.fontSize;
        tempDiv.style.fontFamily = style.fontFamily;
        tempDiv.style.padding = '0';
        tempDiv.style.margin = '0';
        tempDiv.style.width = '1px';
        tempDiv.style.height = 'auto';
        tempDiv.textContent = 'M';
        document.body.appendChild(tempDiv);
        // Get actual line height
        const lineHeight = tempDiv.offsetHeight || parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
        document.body.removeChild(tempDiv);
        // Calculate which line we're on (accounting for scroll)
        const lineIndex = Math.max(0, Math.min(Math.floor(adjustedY / lineHeight), lines.length - 1));
        // Get the line text
        const lineText = lines[lineIndex] || '';
        // Create a temporary span to measure character widths
        const tempSpan = document.createElement('span');
        tempSpan.style.position = 'absolute';
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.style.font = style.font;
        tempSpan.style.fontSize = style.fontSize;
        tempSpan.style.fontFamily = style.fontFamily;
        tempSpan.style.padding = '0';
        tempSpan.style.margin = '0';
        document.body.appendChild(tempSpan);
        // Find the character position in the line (accounting for scroll)
        let charPosition = 0;
        for (let i = 0; i <= lineText.length; i++) {
            tempSpan.textContent = lineText.substring(0, i);
            const width = tempSpan.offsetWidth;
            if (width > adjustedX) {
                // Find the closest character
                if (i > 0) {
                    const prevWidth = (() => {
                        tempSpan.textContent = lineText.substring(0, i - 1);
                        return tempSpan.offsetWidth;
                    })();
                    const midPoint = prevWidth + (width - prevWidth) / 2;
                    charPosition = adjustedX < midPoint ? i - 1 : i;
                }
                else {
                    charPosition = i;
                }
                break;
            }
            charPosition = i;
        }
        document.body.removeChild(tempSpan);
        // Calculate the absolute position in the text
        let absolutePosition = 0;
        for (let i = 0; i < lineIndex; i++) {
            absolutePosition += lines[i].length + 1; // +1 for newline
        }
        absolutePosition += charPosition;
        return Math.max(0, Math.min(absolutePosition, text.length));
    };
    const handleDrop = (e, index, isEdit = false) => {
        e.preventDefault();
        if (!draggedVariable)
            return;
        const variableText = `{{${draggedVariable}}}`;
        const textarea = e.currentTarget;
        // Calculate position based on mouse coordinates
        const insertPosition = getTextPositionFromCoordinates(textarea, e.clientX, e.clientY);
        const currentValue = isEdit ? editFormData.templateJsonArray[index] : formData.templateJsonArray[index];
        const newValue = currentValue.substring(0, insertPosition) + variableText + currentValue.substring(insertPosition);
        if (isEdit) {
            handleEditJsonFieldChange(index, newValue);
        }
        else {
            handleJsonFieldChange(index, newValue);
        }
        // Set cursor position after inserted text
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(insertPosition + variableText.length, insertPosition + variableText.length);
        }, 0);
        handleDragEnd();
    };
    const handleAddJsonFromTemplate = (templateType) => {
        if (!formData.fileType) {
            setFormErrors(prev => ({ ...prev, fileType: "Please select file type first" }));
            return;
        }
        const jsonTemplate = generateJsonTemplate(templateType, formData.fileType);
        if (jsonTemplate) {
            setFormData(prev => ({
                ...prev,
                templateJsonArray: [...prev.templateJsonArray, jsonTemplate]
            }));
            // Reset select after adding
            setTemplateSelectValue("");
        }
    };
    const handleEditAddJsonFromTemplate = (templateType) => {
        if (!editFormData.fileType) {
            setEditErrors(prev => ({ ...prev, fileType: "Please select file type first" }));
            return;
        }
        const jsonTemplate = generateJsonTemplate(templateType, editFormData.fileType);
        if (jsonTemplate) {
            setEditFormData(prev => ({
                ...prev,
                templateJsonArray: [...prev.templateJsonArray, jsonTemplate]
            }));
            // Reset select after adding
            setEditTemplateSelectValue("");
        }
    };
    useEffect(() => {
        if (isAddTemplateOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddTemplateOpen]);
    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllTemplates();
            setTemplates(data);
        }
        catch (err) {
            console.error("Error fetching templates:", err);
            setError("Failed to fetch templates. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchTemplates();
    }, []);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Template" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage template master data." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), isSuperUser && (_jsxs(Button, { onClick: handleAddTemplate, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Template" })] }))] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading templates..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Templates" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getTemplateMasterColumns({
                        onEdit: handleEditTemplateOpen,
                        onDelete: handleDeleteTemplate,
                        isSuperUser: isSuperUser,
                    }), data: templates }) })), templates.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No templates found. Create your first template to get started." }) })), isAddTemplateOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg", children: [_jsxs("div", { className: "flex flex-row items-center justify-between p-6 border-b flex-shrink-0", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Add New Template" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Create a new template with basic details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex flex-1 min-h-0 overflow-hidden", children: [formData.defaultForm && formVariables[formData.defaultForm] && (_jsxs("div", { className: "w-80 border-r bg-gray-50 dark:bg-gray-800/50 flex flex-col flex-shrink-0", children: [_jsxs("div", { className: "p-4 border-b", children: [_jsx(Label, { className: "text-sm font-semibold", children: "Available Variables" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: "Drag variables into JSON fields" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("div", { className: "flex flex-wrap gap-2", children: formVariables[formData.defaultForm].map((variable) => (_jsx(Badge, { variant: "outline", className: "text-xs cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors", draggable: true, onDragStart: () => handleDragStart(variable), onDragEnd: handleDragEnd, children: `{{${variable}}}` }, variable))) }) })] })), _jsx("div", { className: "flex-1 flex flex-col min-w-0", children: _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col flex-1 min-h-0", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name *" }), _jsx(Input, { id: "name", ref: (el) => {
                                                                            addFieldRefs.current[0] = el;
                                                                        }, value: formData.name, onChange: (e) => handleInputChange("name", e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter template name", className: formErrors.name ? "border-red-500" : "" }), formErrors.name && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.name }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "fileType", children: "File Type *" }), _jsxs(Select, { value: formData.fileType, onValueChange: (value) => handleInputChange("fileType", value), children: [_jsx(SelectTrigger, { id: "fileType", ref: (el) => {
                                                                                    addFieldRefs.current[1] = el;
                                                                                }, onKeyDown: (e) => handleEnterKey(e, 1), className: formErrors.fileType ? "border-red-500" : "", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select file type" }) }), _jsx(SelectContent, { children: fileTypeOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }), formErrors.fileType && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.fileType }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "defaultForm", children: "Default Form (Optional)" }), _jsxs(Select, { value: formData.defaultForm || undefined, onValueChange: (value) => {
                                                                    // Handle clearing: if value is "__clear__", set to empty string
                                                                    handleInputChange("defaultForm", value === "__clear__" ? "" : value);
                                                                }, children: [_jsx(SelectTrigger, { id: "defaultForm", className: formErrors.defaultForm ? "border-red-500" : "", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select default form" }) }), _jsxs(SelectContent, { children: [formData.defaultForm && (_jsx(SelectItem, { value: "__clear__", children: "Clear selection" })), defaultFormOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value)))] })] }), formErrors.defaultForm && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.defaultForm }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx(Label, { children: "Template (Optional)" }), formData.fileType && (_jsxs(Select, { value: templateSelectValue, onValueChange: (value) => {
                                                                            setTemplateSelectValue(value);
                                                                            handleAddJsonFromTemplate(value);
                                                                        }, children: [_jsx(SelectTrigger, { className: "h-8 w-40", children: _jsx(SelectValue, { placeholder: "Add template" }) }), _jsx(SelectContent, { children: formData.fileType === "ZPL" ? (_jsxs(_Fragment, { children: [_jsx(SelectItem, { value: "simple_text", children: "Simple Text" }), _jsx(SelectItem, { value: "field_block", children: "Field Block" }), _jsx(SelectItem, { value: "qr_code", children: "QR Code" }), _jsx(SelectItem, { value: "image", children: "Image" })] })) : formData.fileType === "PDF" ? (_jsxs(_Fragment, { children: [_jsx(SelectItem, { value: "text", children: "Text" }), _jsx(SelectItem, { value: "table", children: "Table" }), _jsx(SelectItem, { value: "total", children: "Total" })] })) : null })] }))] }), _jsx("div", { className: "max-h-96 overflow-y-auto space-y-2 pr-2", children: formData.templateJsonArray.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 py-4 text-center", children: "No templates added. Use the dropdown above to add templates." })) : (formData.templateJsonArray.map((jsonStr, index) => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Label, { htmlFor: `templateJson-${index}`, className: "text-sm", children: ["Template ", index + 1] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => handleRemoveJsonField(index), className: "h-6 w-6 p-0 text-red-500 hover:text-red-700", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), _jsx(Textarea, { id: `templateJson-${index}`, value: jsonStr, onChange: (e) => handleJsonFieldChange(index, e.target.value), onDragOver: (e) => handleDragOver(e, index, false), onDragLeave: handleDragLeave, onDrop: (e) => handleDrop(e, index, false), onDragEnter: (e) => {
                                                                                e.preventDefault();
                                                                                const textarea = e.currentTarget;
                                                                                textarea.focus();
                                                                            }, placeholder: 'Enter JSON object, e.g., {"key": "value"}', className: `${formErrors.templateJsonArray ? "border-red-500" : ""} ${dragOverTextareaIndex === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`, rows: 4 })] }, index)))) }), formErrors.templateJsonArray && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.templateJsonArray })), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Enter valid JSON objects. Each field represents one JSON object in the array. Leave empty if not needed." })] })] }), _jsxs("div", { className: "flex gap-2 p-6 border-t flex-shrink-0", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Template" })] })] }) })] })] }) })), isEditTemplateOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg", children: [_jsxs("div", { className: "flex flex-row items-center justify-between p-6 border-b flex-shrink-0", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Edit Template" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Update the template details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex flex-1 min-h-0 overflow-hidden", children: [editFormData.defaultForm && formVariables[editFormData.defaultForm] && (_jsxs("div", { className: "w-80 border-r bg-gray-50 dark:bg-gray-800/50 flex flex-col flex-shrink-0", children: [_jsxs("div", { className: "p-4 border-b", children: [_jsx(Label, { className: "text-sm font-semibold", children: "Available Variables" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: "Drag variables into JSON fields" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("div", { className: "flex flex-wrap gap-2", children: formVariables[editFormData.defaultForm].map((variable) => (_jsx(Badge, { variant: "outline", className: "text-xs cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors", draggable: true, onDragStart: () => handleDragStart(variable), onDragEnd: handleDragEnd, children: `{{${variable}}}` }, variable))) }) })] })), _jsx("div", { className: "flex-1 flex flex-col min-w-0", children: _jsxs("form", { onSubmit: handleEditSubmit, className: "flex flex-col flex-1 min-h-0", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-name", children: "Name *" }), _jsx(Input, { id: "edit-name", value: editFormData.name, onChange: (e) => handleEditInputChange("name", e.target.value), placeholder: "Enter template name", className: editErrors.name ? "border-red-500" : "" }), editErrors.name && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.name }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-fileType", children: "File Type *" }), _jsxs(Select, { value: editFormData.fileType, onValueChange: (value) => handleEditInputChange("fileType", value), children: [_jsx(SelectTrigger, { id: "edit-fileType", className: editErrors.fileType ? "border-red-500" : "", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select file type" }) }), _jsx(SelectContent, { children: fileTypeOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }), editErrors.fileType && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.fileType }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-defaultForm", children: "Default Form (Optional)" }), _jsxs(Select, { value: editFormData.defaultForm || undefined, onValueChange: (value) => {
                                                                    // Handle clearing: if value is "__clear__", set to empty string
                                                                    handleEditInputChange("defaultForm", value === "__clear__" ? "" : value);
                                                                }, children: [_jsx(SelectTrigger, { id: "edit-defaultForm", className: editErrors.defaultForm ? "border-red-500" : "", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select default form" }) }), _jsxs(SelectContent, { children: [editFormData.defaultForm && (_jsx(SelectItem, { value: "__clear__", children: "Clear selection" })), defaultFormOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value)))] })] }), editErrors.defaultForm && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.defaultForm }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx(Label, { children: "Template (Optional)" }), editFormData.fileType && (_jsxs(Select, { value: editTemplateSelectValue, onValueChange: (value) => {
                                                                            setEditTemplateSelectValue(value);
                                                                            handleEditAddJsonFromTemplate(value);
                                                                        }, children: [_jsx(SelectTrigger, { className: "h-8 w-40", children: _jsx(SelectValue, { placeholder: "Add template" }) }), _jsx(SelectContent, { children: editFormData.fileType === "ZPL" ? (_jsxs(_Fragment, { children: [_jsx(SelectItem, { value: "simple_text", children: "Simple Text" }), _jsx(SelectItem, { value: "field_block", children: "Field Block" }), _jsx(SelectItem, { value: "qr_code", children: "QR Code" }), _jsx(SelectItem, { value: "image", children: "Image" })] })) : editFormData.fileType === "PDF" ? (_jsxs(_Fragment, { children: [_jsx(SelectItem, { value: "text", children: "Text" }), _jsx(SelectItem, { value: "table", children: "Table" }), _jsx(SelectItem, { value: "total", children: "Total" })] })) : null })] }))] }), _jsx("div", { className: "max-h-96 overflow-y-auto space-y-2 pr-2", children: editFormData.templateJsonArray.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 py-4 text-center", children: "No templates added. Use the dropdown above to add templates." })) : (editFormData.templateJsonArray.map((jsonStr, index) => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Label, { htmlFor: `edit-templateJson-${index}`, className: "text-sm", children: ["Object ", index + 1] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => handleEditRemoveJsonField(index), className: "h-6 w-6 p-0 text-red-500 hover:text-red-700", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), _jsx(Textarea, { id: `edit-templateJson-${index}`, value: jsonStr, onChange: (e) => handleEditJsonFieldChange(index, e.target.value), onDragOver: (e) => handleDragOver(e, index, true), onDragLeave: handleDragLeave, onDrop: (e) => handleDrop(e, index, true), onDragEnter: (e) => {
                                                                                e.preventDefault();
                                                                                const textarea = e.currentTarget;
                                                                                textarea.focus();
                                                                            }, placeholder: 'Enter JSON object, e.g., {"key": "value"}', className: `${editErrors.templateJsonArray ? "border-red-500" : ""} ${dragOverEditTextareaIndex === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`, rows: 4 })] }, index)))) }), editErrors.templateJsonArray && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.templateJsonArray })), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Enter valid JSON objects. Each field represents one JSON object in the array. Leave empty if not needed." })] })] }), _jsxs("div", { className: "flex gap-2 p-6 border-t flex-shrink-0", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Changes" })] })] }) })] })] }) }))] }));
}
