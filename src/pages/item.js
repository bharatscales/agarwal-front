import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getItemColumns } from "@/components/columns/item-columns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import api from "@/lib/axios";
import { getItems, updateItem, deleteItem, getItemBom } from "@/lib/item-api";
import { getAllParties } from "@/lib/party-api";
import { useAuth } from "@/contexts/AuthContext";
import { FgStageBomEditor, bomLinesToStageEditors, stageEditorsToPayload, validateBomStages, } from "@/components/fg-stage-bom-editor";
const emptyItemForm = () => ({
    itemCode: "",
    itemName: "",
    abv: "",
    itemGroup: "",
    partyId: "",
    uom: "",
    density: "",
});
const parseDensity = (itemGroup, density) => {
    if (itemGroup !== "rm film")
        return null;
    const trimmed = density.trim();
    if (!trimmed)
        return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
};
export default function Item() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canEdit = user?.role === "admin" || user?.role === "superuser";
    const fallbackItemGroups = [
        { value: "rm film", label: "RM Film" },
        { value: "rm ink/adhesive/chemicals", label: "RM Ink/Adhesive/Chemicals" },
        { value: "rm extrusion", label: "RM Extrusion" },
        { value: "fg variety", label: "FG Variety" },
        { value: "ink", label: "Ink" },
        { value: "adhesive", label: "Adhesive" },
        { value: "chemical", label: "Chemical" },
    ];
    const fallbackUoms = [{ value: "Nos", label: "Nos" }];
    const [isEditItemOpen, setIsEditItemOpen] = useState(false);
    const [editItemId, setEditItemId] = useState(null);
    const [items, setItems] = useState([]);
    const [editFormData, setEditFormData] = useState(emptyItemForm());
    const [editErrors, setEditErrors] = useState({});
    const [editBomStages, setEditBomStages] = useState([]);
    const [itemGroupOptions, setItemGroupOptions] = useState(fallbackItemGroups);
    const [partyOptions, setPartyOptions] = useState([]);
    const [uomOptions, setUomOptions] = useState(fallbackUoms);
    const [uomMap, setUomMap] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [itemGroupFilter, setItemGroupFilter] = useState("all");
    const fetchItems = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getItems();
            setItems(data);
        }
        catch (err) {
            console.error("Error fetching items:", err);
            setError("Failed to load items. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const fetchUomsWithIds = async () => {
        try {
            const response = await api.get("/meta/uoms-with-ids");
            const uoms = response.data;
            setUomMap(new Map(uoms.map(u => [u.uom, u.id])));
            setUomOptions(uoms.map(u => ({ value: u.uom, label: u.uom })));
        }
        catch (error) {
            console.error("Failed to load UOMs:", error);
            const uomsResponse = await api.get("/meta/uoms");
            setUomOptions(uomsResponse.data.map(u => ({ value: u, label: u })));
        }
    };
    const getUomId = (uomName) => {
        if (!uomName.trim())
            return undefined;
        return uomMap.get(uomName.trim());
    };
    const handleRefresh = () => {
        fetchItems();
    };
    const handleAddItem = () => {
        navigate("/masters/item/new");
    };
    const handleEditItemOpen = (item) => {
        setEditItemId(item.id);
        setEditFormData({
            itemCode: item.itemCode,
            itemName: item.itemName,
            abv: item.abv ?? "",
            itemGroup: item.itemGroup,
            partyId: item.partyId != null ? String(item.partyId) : "",
            uom: item.uom,
            density: item.itemGroup === "rm film" && item.density != null ? String(item.density) : "",
        });
        setEditErrors({});
        setEditBomStages([]);
        setIsEditItemOpen(true);
        if (item.itemGroup === "fg variety") {
            getItemBom(item.id)
                .then((lines) => {
                setEditBomStages(lines.length > 0 ? bomLinesToStageEditors(lines) : []);
            })
                .catch(() => setEditBomStages([]));
        }
    };
    const handleEditInputChange = (field, value) => {
        setEditFormData(prev => {
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
        if (editErrors[field]) {
            setEditErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleCreateUom = async (label) => {
        const trimmed = label.trim();
        if (!trimmed)
            return;
        try {
            const response = await api.post("/meta/uoms", { uom: trimmed });
            const value = response.data.uom;
            const id = response.data.id;
            if (id) {
                setUomMap(prev => new Map(prev).set(value, id));
            }
            setUomOptions(prev => {
                if (prev.some(option => option.value.toLowerCase() === value.toLowerCase())) {
                    return prev;
                }
                return [...prev, { value, label: value }];
            });
            handleEditInputChange("uom", value);
        }
        catch (error) {
            console.error("Failed to create UOM:", error);
        }
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.itemCode.trim()) {
            errors.itemCode = "Item code is required";
        }
        if (!editFormData.itemGroup.trim()) {
            errors.itemGroup = "Item group is required";
        }
        if (!editFormData.uom.trim()) {
            errors.uom = "Default unit of measure is required";
        }
        if (editFormData.itemGroup === "rm film" && editFormData.density.trim()) {
            const densityValue = Number(editFormData.density);
            if (!Number.isFinite(densityValue) || densityValue <= 0) {
                errors.density = "Enter a valid density";
            }
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editItemId || !validateEditForm())
            return;
        if (editFormData.itemGroup.trim() === "fg variety") {
            const bomError = validateBomStages(editBomStages);
            if (bomError) {
                setError(bomError);
                return;
            }
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const uomId = getUomId(editFormData.uom);
            const payload = {
                itemCode: editFormData.itemCode.trim(),
                itemName: editFormData.itemName.trim() || editFormData.itemCode.trim(),
                abv: editFormData.abv.trim() || null,
                itemGroup: editFormData.itemGroup.trim(),
                partyId: editFormData.partyId.trim() ? parseInt(editFormData.partyId, 10) : null,
                density: parseDensity(editFormData.itemGroup, editFormData.density),
                uomId: uomId,
            };
            if (editFormData.itemGroup.trim() === "fg variety") {
                payload.bomLines = stageEditorsToPayload(editBomStages);
            }
            const updatedItem = await updateItem(editItemId, payload);
            setItems(prev => prev.map(item => item.id === editItemId ? updatedItem : item));
            handleCloseEditModal();
        }
        catch (err) {
            console.error("Error updating item:", err);
            const errorMsg = err.response?.data?.detail || "Failed to update item. Please try again.";
            setError(typeof errorMsg === "string" ? errorMsg : "Failed to update item. Please try again.");
            if (err.response?.status === 400 && err.response?.data?.detail?.includes("already exists")) {
                setEditErrors({ itemCode: "Item code already exists" });
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDeleteItem = async (item) => {
        if (!window.confirm(`Remove item "${item.itemCode}"? It will no longer appear in new entries. Existing records keep their link.`)) {
            return;
        }
        setIsSubmitting(true);
        try {
            await deleteItem(item.id);
            setItems(prev => prev.filter(row => row.id !== item.id));
            setError(null);
        }
        catch (err) {
            console.error("Error deleting item:", err);
            const msg = err.response?.data?.detail ?? "Failed to delete item. Please try again.";
            setError(typeof msg === "string" ? msg : "Failed to delete item. Please try again.");
        }
        finally {
            setIsSubmitting(false);
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
                if (options.length > 0) {
                    setItemGroupOptions(options);
                }
            }
            catch (error) {
                console.error("Failed to load item groups:", error);
                setItemGroupOptions(fallbackItemGroups);
            }
        };
        fetchItemGroups();
    }, []);
    const fetchParties = async () => {
        try {
            const data = await getAllParties();
            setPartyOptions(data.map(p => ({ value: p.id.toString(), label: p.partyCode })));
        }
        catch (err) {
            console.error("Failed to load parties:", err);
        }
    };
    useEffect(() => {
        fetchItems();
        fetchUomsWithIds();
        fetchParties();
    }, []);
    const handleCloseEditModal = () => {
        setIsEditItemOpen(false);
        setEditItemId(null);
        setEditFormData(emptyItemForm());
        setEditErrors({});
        setEditBomStages([]);
    };
    const itemGroupFilterBadges = useMemo(() => {
        const seen = new Set(itemGroupOptions.map(option => option.value.toLowerCase()));
        const extraGroups = items
            .map(item => item.itemGroup)
            .filter(group => group && !seen.has(group.toLowerCase()))
            .filter((group, index, all) => all.findIndex(g => g.toLowerCase() === group.toLowerCase()) === index)
            .map(value => ({
            value,
            label: value.replace(/^rm\b/i, "RM").replace(/^fg\b/i, "FG"),
        }));
        return [...itemGroupOptions, ...extraGroups];
    }, [itemGroupOptions, items]);
    const filteredItems = useMemo(() => {
        if (itemGroupFilter === "all")
            return items;
        return items.filter(item => item.itemGroup === itemGroupFilter);
    }, [items, itemGroupFilter]);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Item" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage item master data." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), canEdit && (_jsxs(Button, { onClick: handleAddItem, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Item" })] }))] })] }) }), error && (_jsx("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4", children: _jsx("p", { className: "text-red-600 dark:text-red-300 text-sm", children: error }) })), _jsxs("div", { className: "flex flex-wrap gap-2 mb-4", children: [_jsx(Badge, { asChild: true, variant: itemGroupFilter === "all" ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setItemGroupFilter("all"), children: "All" }) }), itemGroupFilterBadges.map((group) => (_jsx(Badge, { asChild: true, variant: itemGroupFilter === group.value ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setItemGroupFilter(group.value), children: group.label }) }, group.value)))] }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading items..." })] }) })) : (_jsx("div", { children: _jsx(DataTable, { columns: getItemColumns({
                        onEdit: handleEditItemOpen,
                        onDelete: handleDeleteItem,
                        canEdit,
                    }), data: filteredItems }, `item-list-${itemGroupFilter}`) })), items.length === 0 && !isLoading && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No items found. Create your first item to get started." }) })), isEditItemOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Item" }), _jsx(CardDescription, { children: "Update the item details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-itemCode", children: "Item Code *" }), _jsx(Input, { id: "edit-itemCode", value: editFormData.itemCode, onChange: (e) => handleEditInputChange("itemCode", e.target.value), placeholder: "Enter item code", className: editErrors.itemCode ? "border-red-500" : "" }), editErrors.itemCode && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.itemCode }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-itemName", children: "Item Name" }), _jsx(Input, { id: "edit-itemName", value: editFormData.itemName, onChange: (e) => handleEditInputChange("itemName", e.target.value), placeholder: "Enter item name" }), editErrors.itemName && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.itemName }))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-abv", children: "Abv" }), _jsx(Input, { id: "edit-abv", value: editFormData.abv, onChange: (e) => handleEditInputChange("abv", e.target.value), placeholder: "Abbreviation" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-itemGroup", children: "Item Group *" }), _jsx(CreatableCombobox, { options: itemGroupOptions, value: editFormData.itemGroup || null, onValueChange: (value) => handleEditInputChange("itemGroup", value ?? ""), placeholder: "Select item group", searchPlaceholder: "Search item group..." }), editErrors.itemGroup && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.itemGroup }))] }), editFormData.itemGroup === "fg variety" && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-partyId", children: "Party" }), _jsx(CreatableCombobox, { options: partyOptions, value: editFormData.partyId || null, onValueChange: (value) => handleEditInputChange("partyId", value ?? ""), placeholder: "Select party", searchPlaceholder: "Search party..." })] })), editFormData.itemGroup === "rm film" && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-density", children: "Density (g/cm\u00B3)" }), _jsx(Input, { id: "edit-density", type: "number", step: "any", min: "0", value: editFormData.density, onChange: (e) => handleEditInputChange("density", e.target.value), placeholder: "e.g. 1.4", className: editErrors.density ? "border-red-500" : "" }), editErrors.density && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.density }))] })), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-uom", children: "Default Unit of Measure *" }), _jsx(CreatableCombobox, { options: uomOptions, value: editFormData.uom || null, onValueChange: (value) => handleEditInputChange("uom", value ?? ""), onCreateOption: handleCreateUom, placeholder: "Select unit of measure", searchPlaceholder: "Search unit of measure...", createLabel: "Create a new UOM" }), editErrors.uom && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.uom }))] })] }), editFormData.itemGroup === "fg variety" && (_jsxs("div", { className: "border-t pt-4 space-y-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold", children: "BOM, structure & routing" }), _jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Add a manufacturing stage (routing), then define RM items per layer (structure) for that stage." })] }), _jsx(FgStageBomEditor, { value: editBomStages, onChange: setEditBomStages })] }))] }), _jsxs(CardContent, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSubmitting, children: isSubmitting ? "Saving..." : "Save Changes" })] })] })] }) }))] }));
}
