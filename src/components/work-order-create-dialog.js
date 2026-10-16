import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { getItemBom, getItemsFgVarietyByParty } from "@/lib/item-api";
import { getAllMachines } from "@/lib/machine-api";
import { getAllOperators } from "@/lib/operator-api";
import { getPartyCustomers } from "@/lib/party-api";
import { createWorkOrder } from "@/lib/work-order-api";
import { FgStageBomReadonly } from "@/components/fg-stage-bom-readonly";
const emptyForm = () => ({
    partyId: "",
    itemId: "",
    plannedQty: "",
    priority: "normal",
    machineId: "",
    operatorName: "",
    shift: "",
});
const fallbackPriorities = ["low", "normal", "high"];
const fallbackShifts = ["A", "B"];
export function WorkOrderCreateDialog({ open, onOpenChange, onCreated }) {
    const [formData, setFormData] = useState(emptyForm());
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [partyOptions, setPartyOptions] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [bomTemplateLines, setBomTemplateLines] = useState([]);
    const [bomTemplateLoading, setBomTemplateLoading] = useState(false);
    const addFieldRefs = useRef([]);
    useEffect(() => {
        if (!open)
            return;
        setFormData(emptyForm());
        setFormErrors({});
        setItemOptions([]);
        setBomTemplateLines([]);
        requestAnimationFrame(() => {
            addFieldRefs.current[0]?.focus();
        });
        const loadLookups = async () => {
            try {
                const [parties, machineRows, operatorRows] = await Promise.all([
                    getPartyCustomers(),
                    getAllMachines(),
                    getAllOperators(),
                ]);
                setPartyOptions(parties.map((p) => ({ value: p.id.toString(), label: p.partyCode })));
                setMachines(machineRows.map((m) => ({ value: m.id.toString(), label: m.machineCode })));
                setOperators(Array.from(new Set(operatorRows.map((op) => op.operatorName))));
            }
            catch (error) {
                console.error("Failed to load work order lookups:", error);
            }
        };
        void loadLookups();
    }, [open]);
    useEffect(() => {
        if (!open || !formData.partyId) {
            if (!formData.partyId)
                setItemOptions([]);
            return;
        }
        const loadItems = async () => {
            try {
                const data = await getItemsFgVarietyByParty(parseInt(formData.partyId, 10));
                setItemOptions(data.map((i) => ({ value: i.id.toString(), label: i.itemCode })));
            }
            catch (error) {
                console.error("Failed to load items for party:", error);
                setItemOptions([]);
            }
        };
        void loadItems();
    }, [open, formData.partyId]);
    useEffect(() => {
        if (!open)
            return;
        const itemId = formData.itemId.trim();
        if (!itemId) {
            setBomTemplateLines([]);
            setBomTemplateLoading(false);
            return;
        }
        let cancelled = false;
        setBomTemplateLoading(true);
        getItemBom(parseInt(itemId, 10))
            .then((lines) => {
            if (!cancelled)
                setBomTemplateLines(lines);
        })
            .catch(() => {
            if (!cancelled)
                setBomTemplateLines([]);
        })
            .finally(() => {
            if (!cancelled)
                setBomTemplateLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, formData.itemId]);
    const handleInputChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "partyId") {
                next.itemId = "";
            }
            return next;
        });
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
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
        if (!formData.partyId.trim())
            errors.partyId = "Party is required";
        if (!formData.itemId.trim())
            errors.itemId = "Item is required";
        if (formData.plannedQty.trim()) {
            const qty = parseFloat(formData.plannedQty);
            if (isNaN(qty) || qty <= 0) {
                errors.plannedQty = "Planned quantity must be a positive number";
            }
        }
        if (!formData.machineId.trim())
            errors.machineId = "Machine is required";
        if (!formData.operatorName.trim())
            errors.operatorName = "Operator name is required";
        if (!formData.shift.trim())
            errors.shift = "Shift is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleClose = () => {
        if (isSubmitting)
            return;
        onOpenChange(false);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        setIsSubmitting(true);
        createWorkOrder({
            woNumber: null,
            partyId: parseInt(formData.partyId),
            itemId: parseInt(formData.itemId),
            plannedQty: formData.plannedQty.trim() ? parseFloat(formData.plannedQty) : undefined,
            priority: formData.priority,
            status: "planned",
            machineId: parseInt(formData.machineId),
            operatorName: formData.operatorName,
            shift: formData.shift,
        })
            .then((newWorkOrder) => {
            onCreated(newWorkOrder);
            onOpenChange(false);
        })
            .catch((err) => {
            console.error("Error creating work order:", err);
            const errorMsg = err.response?.data?.detail || "Failed to create work order. Please try again.";
            setFormErrors({ partyId: errorMsg });
        })
            .finally(() => {
            setIsSubmitting(false);
        });
    };
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add New Work Order" }), _jsx(CardDescription, { children: "Create a new work order with production details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleClose, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "partyId", children: "Party (Customer/Both) *" }), _jsx(CreatableCombobox, { options: partyOptions, value: formData.partyId || null, onValueChange: (value) => handleInputChange("partyId", value ?? ""), placeholder: "Select party", searchPlaceholder: "Search party...", triggerRef: (el) => {
                                                        addFieldRefs.current[0] = el;
                                                    }, onInputKeyDown: (e) => handleEnterKey(e, 0) }), formErrors.partyId && _jsx("p", { className: "text-sm text-red-500", children: formErrors.partyId })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "itemId", children: "Item (FG Variety) *" }), _jsx(CreatableCombobox, { options: itemOptions, value: formData.itemId || null, onValueChange: (value) => handleInputChange("itemId", value ?? ""), placeholder: "Select item", searchPlaceholder: "Search item...", triggerRef: (el) => {
                                                        addFieldRefs.current[1] = el;
                                                    }, onInputKeyDown: (e) => handleEnterKey(e, 1) }), formErrors.itemId && _jsx("p", { className: "text-sm text-red-500", children: formErrors.itemId })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "plannedQty", children: "Planned Quantity (KG)" }), _jsx(Input, { id: "plannedQty", type: "number", step: "0.01", min: "0", ref: (el) => {
                                                        addFieldRefs.current[2] = el;
                                                    }, value: formData.plannedQty, onChange: (e) => handleInputChange("plannedQty", e.target.value), onKeyDown: (e) => handleEnterKey(e, 2), placeholder: "Enter planned quantity", className: formErrors.plannedQty ? "border-red-500" : "" }), formErrors.plannedQty && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.plannedQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "priority", children: "Priority" }), _jsxs(Select, { value: formData.priority, onValueChange: (value) => handleInputChange("priority", value), children: [_jsx(SelectTrigger, { id: "priority", ref: (el) => {
                                                                addFieldRefs.current[3] = el;
                                                            }, onKeyDown: (e) => handleEnterKey(e, 3), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select priority" }) }), _jsx(SelectContent, { children: fallbackPriorities.map((priority) => (_jsx(SelectItem, { value: priority, children: priority.charAt(0).toUpperCase() + priority.slice(1) }, priority))) })] })] })] }), _jsxs("div", { className: "border-t pt-6 mt-6", children: [_jsx("h3", { className: "text-sm font-semibold mb-4", children: "Job Card Details" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "machineId", children: ["Machine ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(CreatableCombobox, { options: machines, value: formData.machineId || null, onValueChange: (value) => handleInputChange("machineId", value ?? ""), placeholder: "Select machine", searchPlaceholder: "Search machine...", triggerRef: (el) => {
                                                                addFieldRefs.current[4] = el;
                                                            }, onInputKeyDown: (e) => handleEnterKey(e, 4) }), formErrors.machineId && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.machineId }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "operatorName", children: ["Operator Name ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(CreatableCombobox, { options: operators.map((op) => ({ value: op, label: op })), value: formData.operatorName || null, onValueChange: (value) => handleInputChange("operatorName", value ?? ""), placeholder: "Enter or select operator", searchPlaceholder: "Search operator...", triggerRef: (el) => {
                                                                addFieldRefs.current[5] = el;
                                                            }, onInputKeyDown: (e) => handleEnterKey(e, 5) }), formErrors.operatorName && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.operatorName }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "shift", children: ["Shift ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs(Select, { value: formData.shift, onValueChange: (value) => handleInputChange("shift", value), children: [_jsx(SelectTrigger, { id: "shift", ref: (el) => {
                                                                        addFieldRefs.current[6] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 6), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select shift" }) }), _jsx(SelectContent, { children: fallbackShifts.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }), formErrors.shift && _jsx("p", { className: "text-sm text-red-500", children: formErrors.shift })] })] })] }), _jsxs("div", { className: "border-t pt-6 mt-6", children: [_jsx("h3", { className: "text-sm font-semibold mb-1", children: "BOM & structure" }), _jsx("p", { className: "text-xs text-muted-foreground mb-3", children: "Loaded from the selected FG variety in Item Master (read-only)." }), !formData.itemId.trim() ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Select an FG variety to view BOM." })) : bomTemplateLoading ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading BOM\u2026" })) : (_jsx(FgStageBomReadonly, { lines: bomTemplateLines }))] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleClose, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSubmitting, children: isSubmitting ? "Saving…" : "Save Work Order" })] })] })] }) }));
}
