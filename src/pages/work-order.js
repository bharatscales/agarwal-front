import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Plus, RefreshCw, ScanBarcode, Search, X } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { getWorkOrderColumns } from "@/components/columns/work-order-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getPartyCustomers } from "@/lib/party-api";
import { getItemsFgVarietyByParty } from "@/lib/item-api";
import { getAllMachines } from "@/lib/machine-api";
import { getAllOperators } from "@/lib/operator-api";
import { createJobCard, scanRoll } from "@/lib/job-card-api";
import { getRollByBarcode, getWorkOrderByRollBarcode } from "@/lib/rolls-stock-api";
import { deleteWorkOrder, getAllWorkOrders, updateWorkOrder } from "@/lib/work-order-api";
import { WorkOrderCreateDialog } from "@/components/work-order-create-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
export default function WorkOrder() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPrintingUser = user?.role === "user" &&
        (user?.department?.toLowerCase() === "printing" || user?.department === "Printing");
    const isInspectionUser = user?.role === "user" &&
        (user?.department?.toLowerCase() === "inspection" || user?.department === "Inspection");
    const isFloorUser = user?.role === "user" &&
        (user?.department?.toLowerCase() === "floor" || user?.department === "Floor");
    const canManageWorkOrders = !isInspectionUser && !isFloorUser;
    const fallbackPriorities = ["low", "normal", "high"];
    const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
    const [isEditWorkOrderOpen, setIsEditWorkOrderOpen] = useState(false);
    const [editWorkOrderId, setEditWorkOrderId] = useState(null);
    const [partyOptions, setPartyOptions] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const fallbackShifts = ["A", "B"];
    const [workOrders, setWorkOrders] = useState([]);
    const [woNumberSearch, setWoNumberSearch] = useState("");
    const [inspectionBarcode, setInspectionBarcode] = useState("");
    const [barcodeScanError, setBarcodeScanError] = useState(null);
    const [isBarcodeChecking, setIsBarcodeChecking] = useState(false);
    const [inspectionAddJobCardOpen, setInspectionAddJobCardOpen] = useState(false);
    const [inspectionJobCardPayload, setInspectionJobCardPayload] = useState(null);
    const [inspectionJobCardError, setInspectionJobCardError] = useState(null);
    const [inspectionJobCardSubmitting, setInspectionJobCardSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editFormData, setEditFormData] = useState({
        partyId: "",
        itemId: "",
        plannedQty: "",
        priority: "normal",
        machineId: "",
        operatorName: "",
        shift: "",
    });
    const [editErrors, setEditErrors] = useState({});
    const handleRefresh = () => {
        fetchWorkOrders();
    };
    /** Inspection job cards get number from backend (JBI/1, JBI/2, …); we show a placeholder until created. */
    const INSPECTION_JOB_CARD_NUMBER_PLACEHOLDER = "Auto (from inspection series)";
    const handleBarcodeScan = async () => {
        const barcode = inspectionBarcode.trim();
        if (!barcode)
            return;
        setBarcodeScanError(null);
        setIsBarcodeChecking(true);
        try {
            const roll = await getRollByBarcode(barcode);
            if (!roll) {
                setBarcodeScanError("Roll not found for this barcode.");
                return;
            }
            if (roll.consumed) {
                setBarcodeScanError("This roll is already consumed.");
                return;
            }
            if (roll.issued) {
                setBarcodeScanError("This roll is already issued.");
                return;
            }
            const stage = (roll.stage ?? "").toLowerCase();
            const isWipPrinting = stage === "wip-printing" || stage === "wip_printed";
            if (!isWipPrinting) {
                setBarcodeScanError("Roll must be in WIP Printing stage. Current stage: " + (roll.stage || "—"));
                return;
            }
            const woInfo = await getWorkOrderByRollBarcode(barcode);
            if (!woInfo) {
                setBarcodeScanError("No work order linked to this roll (roll must come from a printing job card).");
                return;
            }
            const [operatorsList, machinesList] = await Promise.all([
                getAllOperators(0, 500),
                getAllMachines(0, 500),
            ]);
            const inspectionOperators = operatorsList
                .filter((op) => (op.operation ?? "").toLowerCase() === "inspection")
                .map((op) => ({ value: op.operatorName, label: op.operatorName }));
            const inspectionMachine = machinesList.find((m) => (m.operation ?? "").toLowerCase() === "inspection");
            if (!inspectionMachine) {
                setBarcodeScanError("No machine configured for Inspection operation.");
                return;
            }
            if (inspectionOperators.length === 0) {
                setBarcodeScanError("No operators configured for Inspection operation.");
                return;
            }
            setInspectionBarcode("");
            setInspectionJobCardError(null);
            setInspectionJobCardPayload({
                barcode,
                jobCardNumber: "", // Backend assigns from job_card_inspection series (JBI/1, JBI/2, …)
                workOrderId: woInfo.workOrderId,
                woNumber: woInfo.woNumber,
                operation: "Inspection",
                shift: "",
                machineId: inspectionMachine.id,
                operatorName: "",
                inspectionOperators,
            });
            setInspectionAddJobCardOpen(true);
        }
        catch {
            setBarcodeScanError("Could not look up roll. Try again.");
        }
        finally {
            setIsBarcodeChecking(false);
        }
    };
    const handleInspectionJobCardSubmit = async () => {
        if (!inspectionJobCardPayload)
            return;
        if (!inspectionJobCardPayload.operatorName.trim()) {
            setInspectionJobCardError("Operator name is required.");
            return;
        }
        if (!inspectionJobCardPayload.shift.trim()) {
            setInspectionJobCardError("Shift is required.");
            return;
        }
        setInspectionJobCardError(null);
        setInspectionJobCardSubmitting(true);
        const barcode = inspectionJobCardPayload.barcode;
        const workOrderId = inspectionJobCardPayload.workOrderId;
        try {
            const newJobCard = await createJobCard({
                jobCardNumber: inspectionJobCardPayload.jobCardNumber, // Empty for Inspection; backend assigns from job_card_inspection series (JBI/n)
                workOrderId: inspectionJobCardPayload.workOrderId,
                operation: inspectionJobCardPayload.operation,
                machineId: inspectionJobCardPayload.machineId,
                operatorName: inspectionJobCardPayload.operatorName.trim(),
                shift: inspectionJobCardPayload.shift,
            });
            await scanRoll(newJobCard.id, barcode);
            setInspectionAddJobCardOpen(false);
            setInspectionJobCardPayload(null);
            fetchWorkOrders();
            navigate(`/manufacturing/work-order/${workOrderId}`);
        }
        catch (err) {
            const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Failed to create job card or load roll.";
            setInspectionJobCardError(msg);
        }
        finally {
            setInspectionJobCardSubmitting(false);
        }
    };
    const handleAddWorkOrder = () => {
        setIsAddWorkOrderOpen(true);
    };
    const handleEditWorkOrderOpen = (workOrder) => {
        setEditWorkOrderId(workOrder.id);
        setEditFormData({
            partyId: workOrder.partyId?.toString() || "",
            itemId: workOrder.itemId?.toString() || "",
            plannedQty: workOrder.plannedQty != null ? String(workOrder.plannedQty) : "",
            priority: workOrder.priority || "normal",
            machineId: "",
            operatorName: "",
            shift: "",
        });
        setEditErrors({});
        setIsEditWorkOrderOpen(true);
    };
    const handleEditInputChange = (field, value) => {
        setEditFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === "partyId") {
                next.itemId = ""; // Clear item when party changes
            }
            return next;
        });
        if (editErrors[field]) {
            setEditErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.partyId.trim()) {
            errors.partyId = "Party is required";
        }
        if (!editFormData.itemId.trim()) {
            errors.itemId = "Item is required";
        }
        if (!editFormData.plannedQty.trim()) {
            errors.plannedQty = "Planned quantity is required";
        }
        else {
            const qty = parseFloat(editFormData.plannedQty);
            if (isNaN(qty) || qty <= 0) {
                errors.plannedQty = "Planned quantity must be a positive number";
            }
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editWorkOrderId || !validateEditForm())
            return;
        updateWorkOrder(editWorkOrderId, {
            partyId: parseInt(editFormData.partyId),
            itemId: parseInt(editFormData.itemId),
            plannedQty: parseFloat(editFormData.plannedQty),
            priority: editFormData.priority,
        })
            .then((updatedWorkOrder) => {
            setWorkOrders(prev => prev.map(wo => (wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo)));
            handleCloseEditModal();
        })
            .catch((err) => {
            console.error("Error updating work order:", err);
            const errorMsg = err.response?.data?.detail || "Failed to update work order. Please try again.";
            setEditErrors({ partyId: errorMsg });
        });
    };
    const handleDeleteWorkOrder = (workOrder) => {
        if (!window.confirm(`Delete work order "${workOrder.woNumber || workOrder.id}"? This cannot be undone.`)) {
            return;
        }
        deleteWorkOrder(workOrder.id)
            .then(() => {
            setWorkOrders(prev => prev.filter(row => row.id !== workOrder.id));
        })
            .catch((err) => {
            console.error("Error deleting work order:", err);
            setError("Failed to delete work order. Please try again.");
        });
    };
    const handleCloseEditModal = () => {
        setIsEditWorkOrderOpen(false);
        setEditWorkOrderId(null);
        setEditFormData({
            partyId: "",
            itemId: "",
            plannedQty: "",
            priority: "normal",
            machineId: "",
            operatorName: "",
            shift: "",
        });
        setEditErrors({});
    };
    const fetchParties = async () => {
        try {
            const data = await getPartyCustomers();
            setPartyOptions(data.map(p => ({
                value: p.id.toString(),
                label: p.partyCode,
            })));
        }
        catch (error) {
            console.error("Failed to load parties:", error);
        }
    };
    const fetchItemsForParty = async (partyId) => {
        try {
            const data = await getItemsFgVarietyByParty(partyId);
            setItemOptions(data.map(i => ({
                value: i.id.toString(),
                label: i.itemCode,
            })));
        }
        catch (error) {
            console.error("Failed to load items for party:", error);
            setItemOptions([]);
        }
    };
    const fetchWorkOrders = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllWorkOrders();
            setWorkOrders(data);
        }
        catch (err) {
            console.error("Error fetching work orders:", err);
            setError("Failed to fetch work orders. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchParties();
        fetchWorkOrders();
    }, []);
    // When party changes in edit form, load items for that party
    useEffect(() => {
        if (isEditWorkOrderOpen && editFormData.partyId) {
            fetchItemsForParty(parseInt(editFormData.partyId, 10));
        }
    }, [isEditWorkOrderOpen, editFormData.partyId]);
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Work Order" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage work orders for production planning." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), !isInspectionUser && (_jsxs(Button, { onClick: handleAddWorkOrder, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Work Order" })] }))] })] }) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading work orders..." })] }) })) : error ? (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Work Orders" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })) : (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2", children: [isInspectionUser && (_jsxs("div", { className: "relative max-w-xs w-full sm:w-auto space-y-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { type: "text", placeholder: "Scan barcode", value: inspectionBarcode, onChange: (e) => {
                                            setInspectionBarcode(e.target.value);
                                            setBarcodeScanError(null);
                                        }, onKeyDown: (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleBarcodeScan();
                                            }
                                        }, disabled: isBarcodeChecking, className: "pl-9" }), barcodeScanError && (_jsx("p", { className: "text-sm text-red-500", children: barcodeScanError }))] })), _jsxs("div", { className: `relative flex-1 max-w-xs ${isInspectionUser ? "sm:ml-auto" : ""}`, children: [_jsx(Search, { className: `absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isInspectionUser ? "right-3" : "left-3"}` }), _jsx(Input, { type: "text", placeholder: "Work order number", value: woNumberSearch, onChange: (e) => setWoNumberSearch(e.target.value), className: isInspectionUser ? "pr-9 text-right" : "pl-9" })] })] }), _jsx(DataTable, { columns: getWorkOrderColumns({
                            ...(canManageWorkOrders ? { onEdit: handleEditWorkOrderOpen, onDelete: handleDeleteWorkOrder } : {}),
                        }), data: workOrders.filter((wo) => {
                            if ((isPrintingUser || isFloorUser) && wo.status !== "planned" && wo.status !== "in_progress")
                                return false;
                            if (!woNumberSearch.trim())
                                return true;
                            const woNum = (wo.woNumber ?? "").toString();
                            return woNum.toLowerCase().includes(woNumberSearch.trim().toLowerCase());
                        }), onRowClick: (workOrder) => {
                            navigate(`/manufacturing/work-order/${workOrder.id}`);
                        } })] })), workOrders.length === 0 && !isLoading && !error && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "No work orders found. Create your first work order to get started." }) })), inspectionAddJobCardOpen && inspectionJobCardPayload && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add Inspection Job Card" }), _jsxs(CardDescription, { children: ["Scanned barcode: ", inspectionJobCardPayload.barcode, ". Select operator to create job card and load this roll."] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                        setInspectionAddJobCardOpen(false);
                                        setInspectionJobCardPayload(null);
                                        setInspectionJobCardError(null);
                                    }, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: "Job card number" }), _jsx("p", { className: "font-medium", children: inspectionJobCardPayload.jobCardNumber || INSPECTION_JOB_CARD_NUMBER_PLACEHOLDER })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: "Work order" }), _jsx("p", { className: "font-medium", children: inspectionJobCardPayload.woNumber ?? `WO ${inspectionJobCardPayload.workOrderId}` })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: "Operation" }), _jsx("p", { className: "font-medium", children: inspectionJobCardPayload.operation })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "inspection-shift", children: "Shift *" }), _jsxs(Select, { value: inspectionJobCardPayload.shift || undefined, onValueChange: (value) => setInspectionJobCardPayload((prev) => prev ? { ...prev, shift: value } : null), children: [_jsx(SelectTrigger, { id: "inspection-shift", className: "w-full", children: _jsx(SelectValue, { placeholder: "Select shift" }) }), _jsx(SelectContent, { children: fallbackShifts.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "inspection-operator", children: "Operator name *" }), _jsxs(Select, { value: inspectionJobCardPayload.operatorName || undefined, onValueChange: (value) => setInspectionJobCardPayload((prev) => prev ? { ...prev, operatorName: value } : null), children: [_jsx(SelectTrigger, { id: "inspection-operator", className: "w-full", children: _jsx(SelectValue, { placeholder: "Select operator" }) }), _jsx(SelectContent, { children: inspectionJobCardPayload.inspectionOperators.map((op) => (_jsx(SelectItem, { value: op.value, children: op.label }, op.value))) })] })] }), inspectionJobCardError && (_jsx("p", { className: "text-sm text-red-500", children: inspectionJobCardError }))] }), _jsx(CardFooter, { children: _jsx(Button, { onClick: handleInspectionJobCardSubmit, disabled: inspectionJobCardSubmitting, children: inspectionJobCardSubmitting ? "Creating…" : "Create Job Card and Load Roll" }) })] }) })), _jsx(WorkOrderCreateDialog, { open: isAddWorkOrderOpen, onOpenChange: setIsAddWorkOrderOpen, onCreated: (newWorkOrder) => {
                    setWorkOrders((prev) => [newWorkOrder, ...prev]);
                } }), isEditWorkOrderOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-3xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit Work Order" }), _jsx(CardDescription, { children: "Update the work order details." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-partyId", children: "Party (Customer/Both) *" }), _jsx(CreatableCombobox, { options: partyOptions, value: editFormData.partyId || null, onValueChange: (value) => handleEditInputChange("partyId", value ?? ""), placeholder: "Select party", searchPlaceholder: "Search party..." }), editErrors.partyId && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.partyId }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-itemId", children: "Item (FG Variety) *" }), _jsx(CreatableCombobox, { options: itemOptions, value: editFormData.itemId || null, onValueChange: (value) => handleEditInputChange("itemId", value ?? ""), placeholder: "Select item", searchPlaceholder: "Search item..." }), editErrors.itemId && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.itemId }))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-plannedQty", children: "Planned Quantity (KG)" }), _jsx(Input, { id: "edit-plannedQty", type: "number", step: "0.01", min: "0", value: editFormData.plannedQty, onChange: (e) => handleEditInputChange("plannedQty", e.target.value), placeholder: "Enter planned quantity", className: editErrors.plannedQty ? "border-red-500" : "" }), editErrors.plannedQty && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.plannedQty }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-priority", children: "Priority" }), _jsxs(Select, { value: editFormData.priority, onValueChange: (value) => handleEditInputChange("priority", value), children: [_jsx(SelectTrigger, { id: "edit-priority", className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select priority" }) }), _jsx(SelectContent, { children: fallbackPriorities.map((priority) => (_jsx(SelectItem, { value: priority, children: priority.charAt(0).toUpperCase() + priority.slice(1) }, priority))) })] })] })] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", children: "Save Changes" })] })] })] }) }))] }));
}
