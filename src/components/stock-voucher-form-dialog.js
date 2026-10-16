import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { createStockVoucher, updateStockVoucher } from "@/lib/stock-voucher-api";
import { STOCK_TYPE_OPTIONS } from "@/lib/enums";
const emptyForm = (vendorId = "") => ({
    vendorId,
    invoiceNo: "",
    invoiceDate: "",
    stockType: "",
});
export function StockVoucherFormDialog({ open, onOpenChange, mode, initialVendorId = "", editingVoucher, vendorSelectOptions, onSuccess, }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyForm());
    const [formErrors, setFormErrors] = useState({});
    const addFieldRefs = useRef([]);
    useEffect(() => {
        if (!open)
            return;
        if (mode === "edit" && editingVoucher) {
            setFormData({
                vendorId: editingVoucher.vendorId.toString(),
                invoiceNo: editingVoucher.invoiceNo,
                invoiceDate: editingVoucher.invoiceDate,
                stockType: editingVoucher.stockType,
            });
        }
        else {
            setFormData(emptyForm(initialVendorId));
        }
        setFormErrors({});
    }, [open, mode, editingVoucher, initialVendorId]);
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [open]);
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
        if (!formData.vendorId.trim())
            errors.vendorId = "Vendor is required";
        if (!formData.invoiceNo.trim())
            errors.invoiceNo = "Invoice number is required";
        if (!formData.invoiceDate.trim())
            errors.invoiceDate = "Invoice date is required";
        if (!formData.stockType.trim())
            errors.stockType = "Stock type is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        setIsSubmitting(true);
        const payload = {
            vendorId: Number(formData.vendorId),
            invoiceNo: formData.invoiceNo.trim(),
            invoiceDate: formData.invoiceDate,
            stockType: formData.stockType.trim(),
        };
        const promise = mode === "edit" && editingVoucher
            ? updateStockVoucher(editingVoucher.id, payload)
            : createStockVoucher(payload);
        promise
            .then((voucher) => {
            onSuccess(voucher, mode === "edit" ? "edit" : "add");
            onOpenChange(false);
        })
            .catch((err) => {
            console.error("Error saving stock voucher:", err);
            setFormErrors({ invoiceNo: "Failed to save voucher. Please try again." });
        })
            .finally(() => setIsSubmitting(false));
    };
    const handleClose = () => {
        onOpenChange(false);
        setFormErrors({});
    };
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: mode === "edit" ? "Edit Stock Voucher" : "Add Stock Voucher" }), _jsx(CardDescription, { children: mode === "edit" ? "Update stock voucher entry." : "Create a new stock voucher entry." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleClose, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vendor", children: "Vendor *" }), _jsx(CreatableCombobox, { options: vendorSelectOptions, value: formData.vendorId || null, onValueChange: (value) => handleInputChange("vendorId", value ?? ""), placeholder: "Select vendor", searchPlaceholder: "Search vendor...", onInputKeyDown: (e) => handleEnterKey(e, 0), triggerRef: (el) => {
                                                        addFieldRefs.current[0] = el;
                                                    } }), formErrors.vendorId && _jsx("p", { className: "text-sm text-red-500", children: formErrors.vendorId })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "invoiceNo", children: "Invoice No *" }), _jsx(Input, { id: "invoiceNo", ref: (el) => {
                                                        addFieldRefs.current[1] = el;
                                                    }, value: formData.invoiceNo, onChange: (e) => handleInputChange("invoiceNo", e.target.value), onKeyDown: (e) => handleEnterKey(e, 1), placeholder: "Enter invoice number", className: formErrors.invoiceNo ? "border-red-500" : "" }), formErrors.invoiceNo && _jsx("p", { className: "text-sm text-red-500", children: formErrors.invoiceNo })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "invoiceDate", children: "Invoice Date *" }), _jsx(Input, { id: "invoiceDate", type: "date", ref: (el) => {
                                                        addFieldRefs.current[2] = el;
                                                    }, value: formData.invoiceDate, onChange: (e) => handleInputChange("invoiceDate", e.target.value), onKeyDown: (e) => handleEnterKey(e, 2), className: formErrors.invoiceDate ? "border-red-500" : "" }), formErrors.invoiceDate && _jsx("p", { className: "text-sm text-red-500", children: formErrors.invoiceDate })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "stockType", children: "Stock Type *" }), _jsxs(Select, { value: formData.stockType ? formData.stockType : undefined, onValueChange: (value) => handleInputChange("stockType", value || ""), children: [_jsx(SelectTrigger, { id: "stockType", ref: (el) => {
                                                                addFieldRefs.current[3] = el;
                                                            }, onKeyDown: (e) => handleEnterKey(e, 3), className: `w-full ${formErrors.stockType ? "border-red-500" : ""}`, children: _jsx(SelectValue, { placeholder: "Select stock type" }) }), _jsx(SelectContent, { children: STOCK_TYPE_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }), formErrors.stockType && _jsx("p", { className: "text-sm text-red-500", children: formErrors.stockType })] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleClose, className: "flex-1", disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSubmitting, children: mode === "edit" ? "Update Voucher" : "Create Voucher" })] })] })] }) }));
}
