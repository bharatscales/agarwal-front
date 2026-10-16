import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import api from "@/lib/axios";
import { createItem } from "@/lib/item-api";
import { getAllParties } from "@/lib/party-api";
import { useAuth } from "@/contexts/AuthContext";
import { FgStageBomEditor, stageEditorsToPayload, validateBomStages, } from "@/components/fg-stage-bom-editor";
const fallbackItemGroups = [
    { value: "rm film", label: "RM Film" },
    { value: "rm ink/adhesive/chemicals", label: "RM Ink/Adhesive/Chemicals" },
    { value: "rm extrusion", label: "RM Extrusion" },
    { value: "fg variety", label: "FG Variety" },
    { value: "ink", label: "Ink" },
    { value: "adhesive", label: "Adhesive" },
    { value: "chemical", label: "Chemical" },
];
const parseDensity = (itemGroup, density) => {
    if (itemGroup !== "rm film")
        return null;
    const trimmed = density.trim();
    if (!trimmed)
        return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
};
export default function ItemNew() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canCreate = user?.role === "admin" || user?.role === "superuser";
    const [formData, setFormData] = useState({
        itemCode: "",
        itemName: "",
        abv: "",
        itemGroup: "",
        partyId: "",
        uom: "",
        density: "",
    });
    const [bomStages, setBomStages] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [itemGroupOptions, setItemGroupOptions] = useState(fallbackItemGroups);
    const [partyOptions, setPartyOptions] = useState([]);
    const [uomOptions, setUomOptions] = useState([{ value: "Nos", label: "Nos" }]);
    const [uomMap, setUomMap] = useState(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const firstFieldRef = useRef(null);
    useEffect(() => {
        if (!canCreate) {
            navigate("/masters/item", { replace: true });
        }
    }, [canCreate, navigate]);
    const fetchUomsWithIds = async () => {
        try {
            const response = await api.get("/meta/uoms-with-ids");
            const uoms = response.data;
            setUomMap(new Map(uoms.map((u) => [u.uom, u.id])));
            setUomOptions(uoms.map((u) => ({ value: u.uom, label: u.uom })));
        }
        catch {
            const uomsResponse = await api.get("/meta/uoms");
            setUomOptions(uomsResponse.data.map((u) => ({ value: u, label: u })));
        }
    };
    const fetchParties = async () => {
        try {
            const data = await getAllParties();
            setPartyOptions(data.map((p) => ({ value: p.id.toString(), label: p.partyCode })));
        }
        catch (err) {
            console.error("Failed to load parties:", err);
        }
    };
    useEffect(() => {
        const fetchItemGroups = async () => {
            try {
                const response = await api.get("/meta/item-groups");
                const labelMap = {
                    "rm film": "RM Film",
                    "rm ink/adhesive/chemicals": "RM Ink/Adhesive/Chemicals",
                    "rm extrusion": "RM Extrusion",
                    "fg variety": "FG Variety",
                };
                const options = response.data.map((value) => ({
                    value,
                    label: labelMap[value] || value.replace(/^rm\b/i, "RM").replace(/^fg\b/i, "FG"),
                }));
                if (options.length > 0)
                    setItemGroupOptions(options);
            }
            catch {
                setItemGroupOptions(fallbackItemGroups);
            }
        };
        fetchItemGroups();
        fetchUomsWithIds();
        fetchParties();
        requestAnimationFrame(() => firstFieldRef.current?.focus());
    }, []);
    const getUomId = (uomName) => {
        if (!uomName.trim())
            return undefined;
        return uomMap.get(uomName.trim());
    };
    const handleInputChange = (field, value) => {
        setFormData((prev) => {
            if (field === "itemCode") {
                const shouldSyncName = !prev.itemName.trim() || prev.itemName === prev.itemCode;
                return {
                    ...prev,
                    itemCode: value,
                    itemName: shouldSyncName ? value : prev.itemName,
                };
            }
            if (field === "itemGroup") {
                return {
                    ...prev,
                    itemGroup: value,
                    partyId: value === "fg variety" ? prev.partyId : "",
                    density: value === "rm film" ? prev.density : "",
                };
            }
            return { ...prev, [field]: value };
        });
        if (formErrors[field])
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    };
    const handleCreateUom = async (label) => {
        const trimmed = label.trim();
        if (!trimmed)
            return;
        try {
            const response = await api.post("/meta/uoms", { uom: trimmed });
            const value = response.data.uom;
            const id = response.data.id;
            if (id)
                setUomMap((prev) => new Map(prev).set(value, id));
            setUomOptions((prev) => prev.some((o) => o.value.toLowerCase() === value.toLowerCase())
                ? prev
                : [...prev, { value, label: value }]);
            handleInputChange("uom", value);
        }
        catch (e) {
            console.error("Failed to create UOM:", e);
        }
    };
    const validateForm = () => {
        const errors = {};
        if (!formData.itemCode.trim())
            errors.itemCode = "Item code is required";
        if (!formData.itemGroup.trim())
            errors.itemGroup = "Item group is required";
        if (!formData.uom.trim())
            errors.uom = "Default unit of measure is required";
        if (formData.itemGroup === "rm film" && formData.density.trim()) {
            const densityValue = Number(formData.density);
            if (!Number.isFinite(densityValue) || densityValue <= 0) {
                errors.density = "Enter a valid density";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        const group = formData.itemGroup.trim();
        if (group === "fg variety") {
            const bomError = validateBomStages(bomStages);
            if (bomError) {
                setError(bomError);
                return;
            }
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const uomId = getUomId(formData.uom);
            const payload = {
                itemCode: formData.itemCode.trim(),
                itemName: formData.itemName.trim() || formData.itemCode.trim(),
                abv: formData.abv.trim() || null,
                itemGroup: group,
                partyId: formData.partyId.trim() ? parseInt(formData.partyId, 10) : undefined,
                density: parseDensity(group, formData.density),
                uomId,
            };
            if (group === "fg variety") {
                payload.bomLines = stageEditorsToPayload(bomStages);
            }
            await createItem(payload);
            navigate("/masters/item", { replace: false });
        }
        catch (err) {
            const msg = err.response?.data?.detail || "Failed to create item. Please try again.";
            setError(typeof msg === "string" ? msg : "Failed to create item. Please try again.");
            if (err.response?.status === 400 && String(err.response?.data?.detail).includes("already exists")) {
                setFormErrors({ itemCode: "Item code already exists" });
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!canCreate)
        return null;
    return (_jsxs("div", { className: "mx-auto max-w-4xl px-6 pb-10 pt-2", children: [_jsxs("div", { className: "mb-6", children: [_jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "mb-4 gap-2", onClick: () => navigate("/masters/item"), children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back to items"] }), _jsx("h1", { className: "text-xl font-bold tracking-tight sm:text-2xl", children: "Add item" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Create item master data. For FG variety, add manufacturing stages, structure, and BOM." })] }), error && (_jsx("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20", children: _jsx("p", { className: "text-sm text-red-600 dark:text-red-300", children: error }) })), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Item details" }), _jsx(CardDescription, { children: "Fields marked * are required." })] }), _jsx("form", { onSubmit: handleSubmit, children: _jsxs(CardContent, { className: "space-y-8", children: [_jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "new-itemCode", children: "Item code *" }), _jsx(Input, { id: "new-itemCode", ref: firstFieldRef, value: formData.itemCode, onChange: (e) => handleInputChange("itemCode", e.target.value), placeholder: "Enter item code", className: formErrors.itemCode ? "border-red-500" : "" }), formErrors.itemCode && _jsx("p", { className: "text-sm text-red-500", children: formErrors.itemCode })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "new-itemName", children: "Item name" }), _jsx(Input, { id: "new-itemName", value: formData.itemName, onChange: (e) => handleInputChange("itemName", e.target.value), placeholder: "Enter item name" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "new-abv", children: "Abv" }), _jsx(Input, { id: "new-abv", value: formData.abv, onChange: (e) => handleInputChange("abv", e.target.value), placeholder: "Abbreviation" })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Item group *" }), _jsx(CreatableCombobox, { options: itemGroupOptions, value: formData.itemGroup || null, onValueChange: (value) => handleInputChange("itemGroup", value ?? ""), placeholder: "Select item group", searchPlaceholder: "Search item group..." }), formErrors.itemGroup && _jsx("p", { className: "text-sm text-red-500", children: formErrors.itemGroup })] }), formData.itemGroup === "fg variety" && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Party" }), _jsx(CreatableCombobox, { options: partyOptions, value: formData.partyId || null, onValueChange: (value) => handleInputChange("partyId", value ?? ""), placeholder: "Select party", searchPlaceholder: "Search party..." })] })), formData.itemGroup === "rm film" && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "new-density", children: "Density (g/cm\u00B3)" }), _jsx(Input, { id: "new-density", type: "number", step: "any", min: "0", value: formData.density, onChange: (e) => handleInputChange("density", e.target.value), placeholder: "e.g. 1.4", className: formErrors.density ? "border-red-500" : "" }), formErrors.density && _jsx("p", { className: "text-sm text-red-500", children: formErrors.density })] })), _jsxs("div", { className: "space-y-2 sm:col-span-2", children: [_jsx(Label, { children: "Default unit of measure *" }), _jsx(CreatableCombobox, { options: uomOptions, value: formData.uom || null, onValueChange: (value) => handleInputChange("uom", value ?? ""), onCreateOption: handleCreateUom, placeholder: "Select unit of measure", searchPlaceholder: "Search unit of measure...", createLabel: "Create a new UOM" }), formErrors.uom && _jsx("p", { className: "text-sm text-red-500", children: formErrors.uom })] })] }), formData.itemGroup === "fg variety" && (_jsxs("div", { className: "border-t pt-6 space-y-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold", children: "BOM, structure & routing" }), _jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Add a manufacturing stage (routing), then define RM items per layer (structure) for that stage." })] }), _jsx(FgStageBomEditor, { value: bomStages, onChange: setBomStages })] })), _jsxs("div", { className: "flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => navigate("/masters/item"), disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Saving…" : "Create item" })] })] }) })] })] }));
}
