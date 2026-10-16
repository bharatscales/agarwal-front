import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CheckCircle, Plus, Printer, ScanBarcode, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkOrderCreateDialog } from "@/components/work-order-create-dialog";
import { formatWeightWithMeter, inkGsmByInkWt } from "@/lib/film-calc";
import { getItemsByGroupForMenu } from "@/lib/item-api";
import { closeRollWithoutOutput, getAllJobCards, getClosedWithoutOutput, undoCloseWithoutOutput, jobCardApiErrorMessage, updateProducedRoll, } from "@/lib/job-card-api";
import { hasSemiConsumeChoice, NonNegativeDecimalInput, parseNonNegativeDecimal, parseOptionalNumber, } from "@/lib/non-negative-decimal-input";
import { getProducedRollParentGroupKey } from "@/lib/table-filter-utils";
import { getFloorWorkOrderColumns } from "../floor-work-order-columns";
import { ClosedWithoutOutputList, CloseWithoutOutputDialog, } from "../close-without-output";
import { ProducedRollEditField, producedRollEditDialogClassName, producedRollEditInputClassName, } from "../produced-roll-actions";
const RM_FILM_GROUP = "rm film";
function loadedRollBalance(roll) {
    const value = roll?.balanceWeight ?? roll?.balance_weight;
    if (value == null || Number.isNaN(Number(value)) || Number(value) < 0)
        return null;
    return Number(value);
}
export function PrintingPanel(props) {
    const { printingSelectedWo, printingRollsLoading, printingLoadedRolls, setPrintingLoadedRolls, printingCreateChildLoading, setPrintingCreateChildLoading, setPrintingCreateChildMessage, getRollsStockById, setPrintingAddRollEditingField, setPrintingAddRollForm, printingAddRollForm, printingChildRollsLoading, printingProducedTotals, printingChildRollsFromDb, printingProducedRollColumns, printingProducedEditRoll, setPrintingProducedEditRoll, refreshPrintingProducedRolls, printingFormCommittedForRollId, wipPrintingTemplate, createPrintJob, getPrintJob, setPrintingPrintStatus, addPrintedRoll, setPrintingFormCommittedForRollId, getRollsStockByWorkOrder, setPrintingChildRollsFromDb, updateRollsStock, setPrintingSelectedWo, updateWorkOrder, setPrintingWorkOrders, printingTracks, setPrintingTracks, printingCreateChildMessage, printingLoading, printingError, printingWorkOrders, unloadFloorLoadedRoll, floorPrintingBarcode, setFloorPrintingBarcode, floorPrintingBarcodeError, setFloorPrintingBarcodeError, floorPrintingBarcodeChecking, handleFloorPrintingBarcodeSubmit, floorPrintingRmPickerOpen, floorPrintingRmRolls, floorPrintingRmRollsLoading, floorPrintingRmRollsError, floorPrintingRmStockColumns, openFloorPrintingRmPicker, closeFloorPrintingRmPicker, applyFloorPrintingFromBarcode, setPrintingRollsRefreshKey, } = props;
    const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
    const [printingEditForm, setPrintingEditForm] = useState({
        size: "",
        micron: "",
        netweight: "",
        meter: "",
        plainWastage: "",
        printedWastage: "",
        inkGsm: "",
        balanceweight: "",
    });
    const [printingEditSaving, setPrintingEditSaving] = useState(false);
    const [printingConsumeTarget, setPrintingConsumeTarget] = useState(null);
    const [printingConsumedRolls, setPrintingConsumedRolls] = useState([]);
    const [printingConsumedRefreshKey, setPrintingConsumedRefreshKey] = useState(0);
    const [rmFilmItemFilter, setRmFilmItemFilter] = useState("all");
    const [rmFilmWarehouseFilter, setRmFilmWarehouseFilter] = useState("all");
    const [rmFilmItems, setRmFilmItems] = useState([]);
    const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns({
        showTrack: true,
        tracks: (printingTracks ?? {}),
    }), [printingTracks]);
    useEffect(() => {
        if (!floorPrintingRmPickerOpen) {
            setRmFilmItemFilter("all");
            setRmFilmWarehouseFilter("all");
            return;
        }
        let cancelled = false;
        getItemsByGroupForMenu(RM_FILM_GROUP)
            .then((items) => {
            if (!cancelled)
                setRmFilmItems(items);
        })
            .catch(() => {
            if (!cancelled)
                setRmFilmItems([]);
        });
        return () => {
            cancelled = true;
        };
    }, [floorPrintingRmPickerOpen]);
    useEffect(() => {
        if (!printingProducedEditRoll)
            return;
        const roll = printingProducedEditRoll;
        const balance = roll.parentBalanceWeight ?? roll.balanceWeight;
        setPrintingEditForm({
            size: roll.size != null ? String(roll.size) : "",
            micron: roll.micron != null ? String(roll.micron) : "",
            netweight: roll.netweight != null ? String(roll.netweight) : "",
            meter: roll.meter != null ? String(roll.meter) : "",
            plainWastage: roll.plainWastage != null ? String(roll.plainWastage) : "",
            printedWastage: roll.printedWastage != null ? String(roll.printedWastage) : "",
            inkGsm: roll.inkGsm != null ? String(roll.inkGsm) : "",
            balanceweight: balance != null ? String(balance) : "",
        });
    }, [printingProducedEditRoll]);
    const handleSavePrintingProducedEdit = async () => {
        const roll = printingProducedEditRoll;
        if (!roll?.id)
            return;
        const netweight = parseNonNegativeDecimal(printingEditForm.netweight);
        const plainWastage = parseNonNegativeDecimal(printingEditForm.plainWastage);
        const printedWastage = parseNonNegativeDecimal(printingEditForm.printedWastage);
        const meterValue = parseOptionalNumber(printingEditForm.meter);
        try {
            setPrintingEditSaving(true);
            await updateProducedRoll(roll.id, {
                size: parseOptionalNumber(printingEditForm.size),
                micron: parseOptionalNumber(printingEditForm.micron),
                netweight,
                meter: meterValue != null ? Math.round(meterValue) : null,
                grossweight: netweight,
                plainWastage,
                printedWastage,
                wastage: (plainWastage || 0) + (printedWastage || 0),
                inkGsm: parseNonNegativeDecimal(printingEditForm.inkGsm),
                balanceWeight: parseNonNegativeDecimal(printingEditForm.balanceweight) ?? 0,
            });
            setPrintingCreateChildMessage("Produced roll updated.");
            setPrintingProducedEditRoll(null);
            refreshPrintingProducedRolls?.();
        }
        catch (error) {
            setPrintingCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."));
        }
        finally {
            setPrintingEditSaving(false);
        }
    };
    const rmFilmItemBadges = useMemo(() => {
        const fromMaster = rmFilmItems
            .map((item) => (item.item_code || item.name || "").trim())
            .filter(Boolean);
        if (fromMaster.length > 0)
            return fromMaster;
        const unique = new Map();
        for (const roll of floorPrintingRmRolls) {
            const code = (roll.itemCode || "").trim();
            if (code && !unique.has(code.toLowerCase()))
                unique.set(code.toLowerCase(), code);
        }
        return [...unique.values()];
    }, [rmFilmItems, floorPrintingRmRolls]);
    const filteredFloorPrintingRmRolls = useMemo(() => {
        return floorPrintingRmRolls.filter((roll) => {
            if (rmFilmItemFilter !== "all") {
                const selected = rmFilmItemFilter.toLowerCase();
                if ((roll.itemCode || "").trim().toLowerCase() !== selected)
                    return false;
            }
            if (rmFilmWarehouseFilter !== "all") {
                const stage = (roll.stage ?? "").toLowerCase().replace(/-/g, "_");
                if (stage !== rmFilmWarehouseFilter)
                    return false;
            }
            return true;
        });
    }, [floorPrintingRmRolls, rmFilmItemFilter, rmFilmWarehouseFilter]);
    const calculatedInkGsmByInkWt = useMemo(() => {
        if (!printingAddRollForm)
            return null;
        const roll = printingAddRollForm.roll;
        return inkGsmByInkWt({
            inputKg: roll.netweight,
            outputKg: parseNonNegativeDecimal(printingAddRollForm.netweight || ""),
            plainWastageKg: parseNonNegativeDecimal(printingAddRollForm.plainWastage || "") ?? 0,
            printedWastageKg: parseNonNegativeDecimal(printingAddRollForm.printedWastage || "") ?? 0,
            balanceKg: parseNonNegativeDecimal(printingAddRollForm.balanceweight || "") ?? 0,
            density: printingAddRollForm.parent?.density,
            micron: roll.micron ?? parseOptionalNumber(printingAddRollForm.micron || ""),
        });
    }, [printingAddRollForm]);
    const handleUnloadPrintingRoll = async (jobCardId, rollId) => {
        try {
            setPrintingCreateChildLoading(true);
            setPrintingCreateChildMessage(null);
            await unloadFloorLoadedRoll(jobCardId, rollId, "printing");
            setPrintingCreateChildMessage("Loaded roll removed.");
        }
        catch (err) {
            const detail = err?.response?.data
                ?.detail ||
                err?.message ||
                "Could not unload roll.";
            setPrintingCreateChildMessage(detail);
        }
        finally {
            setPrintingCreateChildLoading(false);
        }
    };
    useEffect(() => {
        if (!printingSelectedWo?.id) {
            setPrintingConsumedRolls([]);
            return;
        }
        let cancelled = false;
        const run = async () => {
            try {
                const cards = await getAllJobCards(0, 20, printingSelectedWo.id, "Printing");
                const groups = await Promise.all(cards.map(async (card) => {
                    const rolls = await getClosedWithoutOutput(card.id);
                    return rolls.map((roll) => ({
                        ...roll,
                        jobCardId: card.id,
                        jobCardNumber: card.jobCardNumber,
                    }));
                }));
                if (!cancelled)
                    setPrintingConsumedRolls(groups.flat());
            }
            catch {
                if (!cancelled)
                    setPrintingConsumedRolls([]);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [printingSelectedWo?.id, printingConsumedRefreshKey]);
    const printingConsumedRows = useMemo(() => {
        return printingConsumedRolls.map((roll) => ({
            id: roll.id,
            jobCardId: roll.jobCardId,
            jobCardNumber: roll.jobCardNumber,
            label: "RM film",
            structure: roll.itemName || "—",
            weightLabel: roll.netweight != null ? `${Number(roll.netweight).toFixed(2)} kg` : "—",
            wastageLabel: roll.wastage != null ? `${Number(roll.wastage).toFixed(2)} kg` : "—",
            balanceLabel: roll.balanceWeight != null ? `${Number(roll.balanceWeight).toFixed(2)} kg` : "—",
        }));
    }, [printingConsumedRolls]);
    const handlePrintingUndoConsumed = async (row) => {
        try {
            setPrintingCreateChildLoading(true);
            setPrintingCreateChildMessage(null);
            await undoCloseWithoutOutput(row.jobCardId, row.id);
            setPrintingCreateChildMessage("Consume undone. The film is back in stock.");
            setPrintingConsumedRefreshKey((key) => key + 1);
            setPrintingRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setPrintingCreateChildMessage(jobCardApiErrorMessage(error, "Could not undo this consume."));
        }
        finally {
            setPrintingCreateChildLoading(false);
        }
    };
    const openPrintingConsume = (entry) => {
        const roll = entry.roll;
        const form = printingAddRollForm;
        const selected = form?.roll?.id === roll.id;
        if (selected && form.semiConsumed)
            return;
        const plainWastageKg = selected ? parseNonNegativeDecimal(form.plainWastage || "") : null;
        const printedWastageKg = selected ? parseNonNegativeDecimal(form.printedWastage || "") : null;
        const balanceKg = selected ? parseNonNegativeDecimal(form.balanceweight || "") : loadedRollBalance(roll);
        const inkByWt = selected
            ? inkGsmByInkWt({
                inputKg: roll.netweight,
                outputKg: null,
                plainWastageKg: plainWastageKg ?? 0,
                printedWastageKg: printedWastageKg ?? 0,
                balanceKg: balanceKg ?? 0,
                density: form.parent?.density,
                micron: roll.micron,
            })
            : null;
        setPrintingConsumeTarget({
            jobCardId: entry.jobCardId,
            rollId: roll.id,
            label: roll.barcode || "RM film",
            barcode: roll.barcode ?? "",
            structure: roll.item_name ?? roll.itemName ?? "",
            weightKg: roll.netweight != null ? Number(roll.netweight) : null,
            balanceKg,
            wastageKg: plainWastageKg != null || printedWastageKg != null ? (plainWastageKg || 0) + (printedWastageKg || 0) : null,
            plainWastageKg,
            printedWastageKg,
            inkGsm: selected ? parseNonNegativeDecimal(form.inkGsm || "") : null,
            inkGsmByInkWt: inkByWt,
        });
    };
    const handlePrintingConsume = async () => {
        const target = printingConsumeTarget;
        if (!target)
            return;
        try {
            setPrintingCreateChildLoading(true);
            setPrintingCreateChildMessage(null);
            await closeRollWithoutOutput(target.jobCardId, {
                rollId: target.rollId,
                wastage: target.wastageKg,
                plainWastage: target.plainWastageKg,
                printedWastage: target.printedWastageKg,
                inkGsm: target.inkGsm,
                inkGsmByInkWt: target.inkGsmByInkWt,
                balanceWeight: target.balanceKg != null && target.balanceKg > 0 ? target.balanceKg : undefined,
            });
            setPrintingAddRollForm((prev) => (prev?.roll?.id === target.rollId ? null : prev));
            setPrintingConsumeTarget(null);
            setPrintingCreateChildMessage(`${target.label} consumed. It will be a parent of the next printed roll.`);
            setPrintingConsumedRefreshKey((key) => key + 1);
            setPrintingRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setPrintingCreateChildMessage(jobCardApiErrorMessage(error, "Could not consume this roll."));
            throw error;
        }
        finally {
            setPrintingCreateChildLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [printingSelectedWo ? (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsx("div", { children: _jsxs("div", { className: "flex flex-col-reverse gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1", children: "Loaded rolls" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3", children: "More than one roll can parent one printed roll. Consume uses a roll before that printed roll exists. X returns a roll to stock." }), printingRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : printingLoadedRolls.length === 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No roll currently loaded for this work order." }), _jsxs("div", { className: "space-y-1 max-w-2xl", children: [_jsx(Label, { htmlFor: "floor-printing-barcode", className: "text-xs text-gray-600 dark:text-gray-400", children: "Barcode" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative min-w-[min(100%,18rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "floor-printing-barcode", type: "text", placeholder: "Scan or enter roll barcode", value: floorPrintingBarcode, onChange: (e) => {
                                                                                setFloorPrintingBarcode(e.target.value);
                                                                                setFloorPrintingBarcodeError(null);
                                                                            }, onKeyDown: (e) => {
                                                                                if (e.key === "Enter") {
                                                                                    e.preventDefault();
                                                                                    void handleFloorPrintingBarcodeSubmit();
                                                                                }
                                                                            }, disabled: floorPrintingBarcodeChecking, className: "pl-9", autoComplete: "off", autoFocus: true })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", className: "whitespace-nowrap", disabled: floorPrintingBarcodeChecking || floorPrintingRmRollsLoading, onClick: () => void openFloorPrintingRmPicker(), children: "Select Stock" })] }), floorPrintingBarcodeError && (_jsx("p", { className: "text-sm text-red-500", children: floorPrintingBarcodeError }))] }), floorPrintingRmPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Select RM Film roll" }), _jsx(CardDescription, { children: "Pick a roll to load into printing (same as scanning its barcode). Non-issued RM virgin and RM Balance rolls are listed." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorPrintingRmPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorPrintingRmRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorPrintingRmRollsError && (_jsx("p", { className: "text-sm text-red-500 mb-3", children: floorPrintingRmRollsError })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { asChild: true, variant: rmFilmItemFilter === "all" ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter("all"), children: "All" }) }), rmFilmItemBadges.map((itemCode) => (_jsx(Badge, { asChild: true, variant: rmFilmItemFilter.toLowerCase() === itemCode.toLowerCase() ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter(itemCode), children: itemCode }) }, itemCode)))] }), _jsx("div", { className: "flex flex-wrap gap-2 ml-auto", children: [
                                                                                        { value: "all", label: "ALL" },
                                                                                        { value: "virgin_rm", label: "RM Virgin" },
                                                                                        { value: "rm_balance", label: "RM Balance" },
                                                                                    ].map((warehouse) => (_jsx(Badge, { asChild: true, variant: rmFilmWarehouseFilter === warehouse.value ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmWarehouseFilter(warehouse.value), children: warehouse.label }) }, warehouse.value))) })] }), _jsx(DataTable, { columns: floorPrintingRmStockColumns, data: filteredFloorPrintingRmRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorPrintingBarcodeChecking, onClick: async () => {
                                                                                    const selected = selectedRows[0];
                                                                                    const barcode = selected?.barcode?.trim();
                                                                                    if (!barcode)
                                                                                        return;
                                                                                    await applyFloorPrintingFromBarcode(barcode, { closePicker: true });
                                                                                }, children: floorPrintingBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, `floor-printing-rm-picker-${rmFilmItemFilter}-${rmFilmWarehouseFilter}`)] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorPrintingRmPicker, children: "Close" }) }) })] }) }))] })) : (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Job card" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Structure" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Size" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Micron" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Input weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Meter" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Plain wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Printed wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Ink gsm" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Ink gsm (by ink wt)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Balance weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Roll continue" }), _jsx("th", { className: "text-right py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: " " })] }) }), _jsx("tbody", { children: printingLoadedRolls.map(({ jobCardNumber, jobCardId, roll }) => {
                                                            const isSelected = printingAddRollForm?.roll.id === roll.id;
                                                            return (_jsxs("tr", { className: `border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-pointer ${isSelected ? "bg-gray-50 dark:bg-gray-800/40" : ""}`, onClick: async () => {
                                                                    if (printingCreateChildLoading)
                                                                        return;
                                                                    if (printingAddRollForm?.roll.id === roll.id)
                                                                        return;
                                                                    const woItemId = printingSelectedWo?.itemId;
                                                                    if (woItemId == null) {
                                                                        setPrintingCreateChildMessage("Work order has no item.");
                                                                        return;
                                                                    }
                                                                    try {
                                                                        setPrintingAddRollForm({
                                                                            jobCardNumber,
                                                                            jobCardId,
                                                                            roll,
                                                                            parent: { gradeId: undefined },
                                                                            size: roll.size != null ? String(roll.size) : "",
                                                                            micron: roll.micron != null ? String(roll.micron) : "",
                                                                            netweight: "",
                                                                            meter: "",
                                                                            grossweight: "",
                                                                            wastage: "0",
                                                                            plainWastage: "0",
                                                                            printedWastage: "0",
                                                                            inkGsm: "",
                                                                            balanceweight: loadedRollBalance(roll) != null ? String(loadedRollBalance(roll)) : "",
                                                                            semiConsumed: false,
                                                                        });
                                                                        setPrintingAddRollEditingField(null);
                                                                        const parent = await getRollsStockById(roll.id);
                                                                        setPrintingAddRollForm((prev) => {
                                                                            if (!prev || prev.roll.id !== roll.id)
                                                                                return prev;
                                                                            return {
                                                                                ...prev,
                                                                                parent: {
                                                                                    gradeId: parent.gradeId ?? prev.parent.gradeId,
                                                                                    density: parent.itemDensity ?? prev.parent.density,
                                                                                },
                                                                                balanceweight: parent.balanceWeight != null
                                                                                    ? String(parent.balanceWeight)
                                                                                    : prev.balanceweight,
                                                                                roll: {
                                                                                    ...prev.roll,
                                                                                    balanceWeight: parent.balanceWeight ?? loadedRollBalance(prev.roll),
                                                                                    balance_weight: parent.balanceWeight ?? loadedRollBalance(prev.roll),
                                                                                },
                                                                            };
                                                                        });
                                                                    }
                                                                    catch {
                                                                        setPrintingCreateChildMessage("Failed to load parent roll.");
                                                                    }
                                                                }, children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: jobCardNumber }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.item_name ?? roll.itemName ?? "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.size != null ? String(roll.size) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.micron != null ? String(roll.micron) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: formatWeightWithMeter(roll.netweight, roll.meter) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected, value: isSelected ? printingAddRollForm.netweight : "", onValueChange: (nextValue) => setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, netweight: nextValue } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Input, { type: "number", step: "1", className: "h-7 w-20 px-1.5 text-xs", disabled: !isSelected, value: isSelected ? printingAddRollForm.meter : "", onChange: (e) => setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, meter: e.target.value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected, value: isSelected ? printingAddRollForm.plainWastage : "", onValueChange: (nextValue) => setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, plainWastage: nextValue } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected, value: isSelected ? printingAddRollForm.printedWastage : "", onValueChange: (nextValue) => setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, printedWastage: nextValue } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", disabled: !isSelected, value: isSelected ? printingAddRollForm.inkGsm : "", onValueChange: (nextValue) => setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, inkGsm: nextValue } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Input, { type: "text", inputMode: "decimal", autoComplete: "off", className: "h-7 w-20 px-1.5 text-xs", disabled: true, readOnly: true, value: isSelected && calculatedInkGsmByInkWt != null && calculatedInkGsmByInkWt >= 0
                                                                                ? String(calculatedInkGsmByInkWt)
                                                                                : "" }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected || Boolean(isSelected && printingAddRollForm.semiConsumed), value: isSelected
                                                                                ? printingAddRollForm.semiConsumed
                                                                                    ? ""
                                                                                    : printingAddRollForm.balanceweight
                                                                                : loadedRollBalance(roll) != null
                                                                                    ? String(loadedRollBalance(roll))
                                                                                    : "", onValueChange: (nextValue) => {
                                                                                const parsed = parseNonNegativeDecimal(nextValue);
                                                                                setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id
                                                                                    ? {
                                                                                        ...prev,
                                                                                        balanceweight: nextValue,
                                                                                        semiConsumed: parsed != null ? false : prev.semiConsumed,
                                                                                    }
                                                                                    : prev);
                                                                                setPrintingChildRollsFromDb((prev) => prev.map((row) => {
                                                                                    const parentIds = row.parentRollIds || (row.parentRollId != null ? [row.parentRollId] : []);
                                                                                    if (parentIds.length > 0 && !parentIds.includes(roll.id))
                                                                                        return row;
                                                                                    return { ...row, parentBalanceWeight: parsed };
                                                                                }));
                                                                            }, onValueBlur: async (nextValue) => {
                                                                                if (!isSelected)
                                                                                    return;
                                                                                if (printingAddRollForm.semiConsumed)
                                                                                    return;
                                                                                const parsed = nextValue === "" ? null : parseNonNegativeDecimal(nextValue);
                                                                                if (nextValue !== printingAddRollForm.balanceweight) {
                                                                                    setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, balanceweight: nextValue } : prev);
                                                                                }
                                                                                try {
                                                                                    await updateRollsStock(roll.id, { balanceWeight: parsed });
                                                                                    setPrintingLoadedRolls((prev) => prev.map((loaded) => loaded.roll.id === roll.id
                                                                                        ? {
                                                                                            ...loaded,
                                                                                            roll: {
                                                                                                ...loaded.roll,
                                                                                                balanceWeight: parsed,
                                                                                                balance_weight: parsed,
                                                                                            },
                                                                                        }
                                                                                        : loaded));
                                                                                }
                                                                                catch {
                                                                                    setPrintingCreateChildMessage("Failed to save balance weight.");
                                                                                }
                                                                            } }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Checkbox, { checked: Boolean(isSelected && printingAddRollForm.semiConsumed), disabled: !isSelected ||
                                                                                printingCreateChildLoading ||
                                                                                printingConsumeTarget?.rollId === roll.id, "aria-label": "Roll continue", title: printingConsumeTarget?.rollId === roll.id
                                                                                ? "This roll is being consumed"
                                                                                : "Keep this roll loaded; do not create a balance roll", onCheckedChange: (checked) => {
                                                                                const isChecked = checked === true;
                                                                                setPrintingAddRollForm((prev) => prev && prev.roll.id === roll.id
                                                                                    ? {
                                                                                        ...prev,
                                                                                        semiConsumed: isChecked,
                                                                                        balanceweight: isChecked ? "" : prev.balanceweight,
                                                                                    }
                                                                                    : prev);
                                                                                if (isChecked) {
                                                                                    setPrintingChildRollsFromDb((prev) => prev.map((row) => {
                                                                                        const parentIds = row.parentRollIds || (row.parentRollId != null ? [row.parentRollId] : []);
                                                                                        if (parentIds.length > 0 && !parentIds.includes(roll.id))
                                                                                            return row;
                                                                                        return { ...row, parentBalanceWeight: null };
                                                                                    }));
                                                                                    void updateRollsStock(roll.id, { balanceWeight: null })
                                                                                        .then(() => {
                                                                                        setPrintingLoadedRolls((prev) => prev.map((loaded) => loaded.roll.id === roll.id
                                                                                            ? {
                                                                                                ...loaded,
                                                                                                roll: {
                                                                                                    ...loaded.roll,
                                                                                                    balanceWeight: null,
                                                                                                    balance_weight: null,
                                                                                                },
                                                                                            }
                                                                                            : loaded));
                                                                                    })
                                                                                        .catch(() => {
                                                                                        setPrintingCreateChildMessage("Failed to clear balance weight.");
                                                                                    });
                                                                                }
                                                                            } }) }), _jsxs("td", { className: "py-1.5 px-2 text-right whitespace-nowrap", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-6 px-1.5 text-xs", title: isSelected && printingAddRollForm.semiConsumed
                                                                                    ? "Uncheck Roll continue to consume this roll"
                                                                                    : "Use this roll now. It becomes a parent when the printed roll is created", disabled: printingCreateChildLoading || Boolean(isSelected && printingAddRollForm.semiConsumed), onClick: () => openPrintingConsume({ jobCardId, roll }), children: "Consume" }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", title: "Remove loaded roll and return it to stock", disabled: printingCreateChildLoading, onClick: () => void handleUnloadPrintingRoll(jobCardId, roll.id), children: _jsx(X, { className: "h-4 w-4" }) })] })] }, `${jobCardNumber}-${roll.id}`));
                                                        }) })] }) }))] }), _jsx(ClosedWithoutOutputList, { rows: printingConsumedRows, undoing: printingCreateChildLoading, onUndo: (row) => void handlePrintingUndoConsumed(row) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Produced rolls" }), !printingChildRollsLoading && (_jsx("div", { className: "rounded-[2px] border border-zinc-600 overflow-hidden", children: _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total produced rolls" }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: printingProducedTotals.rollCount }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total output weight (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: [printingProducedTotals.netWeight.toFixed(2), " kg"] }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total plain wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: [printingProducedTotals.plainWastage.toFixed(2), " kg"] }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total printed wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold", children: [printingProducedTotals.printedWastage.toFixed(2), " kg"] })] }) }) }) }))] }), printingChildRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading rolls\u2026" })) : printingChildRollsFromDb.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No produced rolls found for this work order." })) : (_jsx(DataTable, { columns: printingProducedRollColumns, data: printingChildRollsFromDb, getRowSpanGroupKey: getProducedRollParentGroupKey, scrollable: true, scrollHeight: "45vh", compact: true, size: "xs", showSelectionSummary: false }))] })] }) }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap", children: [!printingRollsLoading && printingLoadedRolls.length > 0 && (_jsx("div", { className: "flex gap-2", children: _jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: printingCreateChildLoading ||
                                        !hasSemiConsumeChoice(printingAddRollForm?.balanceweight, printingAddRollForm?.semiConsumed) ||
                                        (printingAddRollForm != null && printingFormCommittedForRollId === printingAddRollForm.roll.id), onClick: async () => {
                                        const form = printingAddRollForm;
                                        const wo = printingSelectedWo;
                                        if (form && wo?.itemId != null) {
                                            try {
                                                setPrintingCreateChildLoading(true);
                                                setPrintingCreateChildMessage(null);
                                                const loadedOnCard = printingLoadedRolls.filter((entry) => entry.jobCardId === form.jobCardId);
                                                if (loadedOnCard.length === 0) {
                                                    setPrintingCreateChildMessage("Load an RM roll before printing.");
                                                    return;
                                                }
                                                const semiConsumed = Boolean(form.semiConsumed);
                                                const balanceValue = semiConsumed ? null : parseNonNegativeDecimal(form.balanceweight || "");
                                                if (!semiConsumed && balanceValue == null) {
                                                    setPrintingCreateChildMessage("Enter balance weight or tick Roll continue.");
                                                    return;
                                                }
                                                const pendingIds = printingConsumedRolls
                                                    .filter((roll) => roll.jobCardId === form.jobCardId)
                                                    .map((roll) => roll.id)
                                                    .filter((id) => !loadedOnCard.some((entry) => entry.roll.id === id));
                                                const parentIds = [
                                                    ...loadedOnCard.map((entry) => entry.roll.id),
                                                    ...pendingIds,
                                                ];
                                                const parentBalanceWeights = [
                                                    ...loadedOnCard.map((entry) => {
                                                        if (entry.roll.id === form.roll.id)
                                                            return semiConsumed ? null : balanceValue;
                                                        return loadedRollBalance(entry.roll);
                                                    }),
                                                    ...pendingIds.map(() => null),
                                                ];
                                                const parentSemiConsumed = [
                                                    ...loadedOnCard.map((entry) => {
                                                        if (entry.roll.id === form.roll.id)
                                                            return semiConsumed;
                                                        return loadedRollBalance(entry.roll) == null;
                                                    }),
                                                    ...pendingIds.map(() => true),
                                                ];
                                                const netweightValue = parseNonNegativeDecimal(form.netweight || "") ?? undefined;
                                                const meterValue = parseOptionalNumber(form.meter || "");
                                                const roundedMeterValue = meterValue != null ? Math.round(meterValue) : undefined;
                                                const plainWastageValue = parseNonNegativeDecimal(form.plainWastage || "");
                                                const printedWastageValue = parseNonNegativeDecimal(form.printedWastage || "");
                                                const inkGsmValue = parseNonNegativeDecimal(form.inkGsm || "");
                                                const inkGsmByInkWtValue = calculatedInkGsmByInkWt != null && calculatedInkGsmByInkWt >= 0
                                                    ? calculatedInkGsmByInkWt
                                                    : null;
                                                const wastageValue = plainWastageValue != null || printedWastageValue != null
                                                    ? (plainWastageValue || 0) + (printedWastageValue || 0)
                                                    : undefined;
                                                if (wipPrintingTemplate) {
                                                    const printData = {
                                                        workOrder: {
                                                            id: wo.id,
                                                            woNumber: wo.woNumber,
                                                            partyName: wo.partyName,
                                                            partyCode: wo.partyCode,
                                                            itemName: wo.itemName,
                                                            itemCode: wo.itemCode,
                                                            plannedQty: wo.plannedQty,
                                                            producedQty: wo.producedQty,
                                                            status: wo.status,
                                                            priority: wo.priority,
                                                            createdAt: wo.createdAt,
                                                            startedAt: wo.startedAt,
                                                            completedAt: wo.completedAt,
                                                        },
                                                        jobCard: { id: form.jobCardId, jobCardNumber: form.jobCardNumber },
                                                        roll: {
                                                            size: form.size ? parseFloat(form.size) : undefined,
                                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                                            netweight: netweightValue,
                                                            meter: roundedMeterValue,
                                                            grossweight: netweightValue,
                                                            wastage: wastageValue,
                                                            plainWastage: plainWastageValue,
                                                            printedWastage: printedWastageValue,
                                                            inkGsm: inkGsmValue,
                                                            inkGsmByInkWt: inkGsmByInkWtValue,
                                                            itemName: wo.itemName ?? null,
                                                        },
                                                    };
                                                    const job = await createPrintJob({
                                                        name: `WIP Printing - ${form.jobCardNumber}`,
                                                        template_id: wipPrintingTemplate.id,
                                                        data: printData,
                                                        copies: 1,
                                                    });
                                                    setPrintingPrintStatus("printing");
                                                    let pollCount = 0;
                                                    const maxPolls = 30;
                                                    const pollInterval = setInterval(async () => {
                                                        pollCount++;
                                                        try {
                                                            const updatedJob = await getPrintJob(job.id);
                                                            if (updatedJob.status === "done") {
                                                                clearInterval(pollInterval);
                                                                setPrintingPrintStatus("done");
                                                                setTimeout(() => setPrintingPrintStatus("idle"), 3000);
                                                            }
                                                            else if (updatedJob.status === "failed" || pollCount >= maxPolls) {
                                                                clearInterval(pollInterval);
                                                                setPrintingPrintStatus("idle");
                                                            }
                                                        }
                                                        catch {
                                                            clearInterval(pollInterval);
                                                            setPrintingPrintStatus("idle");
                                                        }
                                                    }, 1000);
                                                }
                                                await addPrintedRoll(form.jobCardId, {
                                                    itemId: wo.itemId,
                                                    rollno: "",
                                                    size: form.size ? parseFloat(form.size) : undefined,
                                                    micron: form.micron ? parseFloat(form.micron) : undefined,
                                                    netweight: netweightValue,
                                                    meter: roundedMeterValue,
                                                    grossweight: netweightValue,
                                                    wastage: wastageValue,
                                                    plainWastage: plainWastageValue ?? undefined,
                                                    printedWastage: printedWastageValue ?? undefined,
                                                    inkGsm: inkGsmValue ?? undefined,
                                                    inkGsmByInkWt: inkGsmByInkWtValue ?? undefined,
                                                    gradeId: form.parent.gradeId,
                                                    parentRollIds: parentIds,
                                                    parentBalanceWeights,
                                                    parentSemiConsumed,
                                                    weightAtTime: netweightValue,
                                                    balanceWeight: semiConsumed ? undefined : (balanceValue ?? undefined),
                                                    semiConsumed,
                                                });
                                                getRollsStockByWorkOrder(wo.id, "wip_printed").then(setPrintingChildRollsFromDb);
                                                if (semiConsumed) {
                                                    setPrintingFormCommittedForRollId(null);
                                                    setPrintingAddRollForm((prev) => prev && prev.roll.id === form.roll.id
                                                        ? {
                                                            ...prev,
                                                            netweight: "",
                                                            meter: "",
                                                            wastage: "0",
                                                            plainWastage: "0",
                                                            printedWastage: "0",
                                                            inkGsm: "",
                                                            balanceweight: "",
                                                            semiConsumed: false,
                                                        }
                                                        : prev);
                                                    setPrintingCreateChildMessage("Printed roll created. Loaded roll kept on the machine.");
                                                }
                                                else {
                                                    setPrintingFormCommittedForRollId(form.roll.id);
                                                }
                                                setPrintingRollsRefreshKey((key) => key + 1);
                                                setPrintingConsumedRefreshKey((key) => key + 1);
                                            }
                                            catch {
                                                setPrintingCreateChildMessage(wipPrintingTemplate
                                                    ? "Failed to print label. Roll not added or movement not recorded."
                                                    : "Failed to add roll or record movement.");
                                            }
                                            finally {
                                                setPrintingCreateChildLoading(false);
                                            }
                                        }
                                    }, children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] }) })), !printingRollsLoading &&
                                !printingChildRollsLoading &&
                                printingLoadedRolls.length === 0 &&
                                printingChildRollsFromDb.length > 0 &&
                                printingSelectedWo && (_jsx("div", { className: "ml-auto", children: _jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: printingCreateChildLoading, onClick: async () => {
                                        const wo = printingSelectedWo;
                                        if (!wo)
                                            return;
                                        if (!window.confirm("Are you sure you want to finish this work order?"))
                                            return;
                                        try {
                                            setPrintingCreateChildLoading(true);
                                            setPrintingCreateChildMessage(null);
                                            await updateWorkOrder(wo.id, { status: "printed" });
                                            setPrintingCreateChildMessage("Work order marked as printed.");
                                            setPrintingWorkOrders((prev) => prev.map((row) => (row.id === wo.id ? { ...row, status: "printed" } : row)));
                                            setPrintingTracks((prev) => {
                                                const track = prev?.[wo.id];
                                                if (!track)
                                                    return prev ?? {};
                                                return {
                                                    ...prev,
                                                    [wo.id]: {
                                                        ...track,
                                                        stages: track.stages.map((stage) => stage.operation === "Printing" ? { ...stage, state: "completed" } : stage),
                                                    },
                                                };
                                            });
                                            setPrintingSelectedWo(null);
                                        }
                                        catch {
                                            setPrintingCreateChildMessage("Failed to finish work order.");
                                        }
                                        finally {
                                            setPrintingCreateChildLoading(false);
                                        }
                                    }, children: [_jsx(CheckCircle, { className: "h-4 w-4" }), "Finish WO"] }) })), printingCreateChildMessage && (_jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: printingCreateChildMessage }))] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex justify-end mb-3", children: _jsxs(Button, { onClick: () => setIsAddWorkOrderOpen(true), size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add Work Order" })] }) }), printingLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : printingError ? (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: printingError })) : printingWorkOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No work orders found." })) : (_jsx(DataTable, { columns: floorWorkOrderColumns, data: printingWorkOrders, getRowId: (row) => String(row.id), onRowClick: (wo) => setPrintingSelectedWo(wo), scrollable: true, scrollHeight: "65vh", showSelectionSummary: false })), _jsx(WorkOrderCreateDialog, { open: isAddWorkOrderOpen, onOpenChange: setIsAddWorkOrderOpen, onCreated: (newWorkOrder) => {
                            setPrintingWorkOrders((prev) => [newWorkOrder, ...prev]);
                        } })] })), _jsx(CloseWithoutOutputDialog, { target: printingConsumeTarget, saving: printingCreateChildLoading, onOpenChange: (open) => {
                    if (!open)
                        setPrintingConsumeTarget(null);
                }, onConfirm: handlePrintingConsume }), _jsx(Dialog, { open: Boolean(printingProducedEditRoll), onOpenChange: (open) => { if (!open)
                    setPrintingProducedEditRoll(null); }, children: _jsxs(DialogContent, { className: producedRollEditDialogClassName, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit produced roll" }), _jsx(DialogDescription, { children: "Update output fields and leftover balance weight." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(ProducedRollEditField, { label: "Size", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.size, onValueChange: (size) => setPrintingEditForm((prev) => ({ ...prev, size })) }) }), _jsx(ProducedRollEditField, { label: "Micron", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.micron, onValueChange: (micron) => setPrintingEditForm((prev) => ({ ...prev, micron })) }) }), _jsx(ProducedRollEditField, { label: "Output weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.netweight, onValueChange: (netweight) => setPrintingEditForm((prev) => ({ ...prev, netweight })) }) }), _jsx(ProducedRollEditField, { label: "Meter", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.meter, onValueChange: (meter) => setPrintingEditForm((prev) => ({ ...prev, meter })) }) }), _jsx(ProducedRollEditField, { label: "Plain wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.plainWastage, onValueChange: (plainWastage) => setPrintingEditForm((prev) => ({ ...prev, plainWastage })) }) }), _jsx(ProducedRollEditField, { label: "Printed wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.printedWastage, onValueChange: (printedWastage) => setPrintingEditForm((prev) => ({ ...prev, printedWastage })) }) }), _jsx(ProducedRollEditField, { label: "Ink gsm", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.inkGsm, onValueChange: (inkGsm) => setPrintingEditForm((prev) => ({ ...prev, inkGsm })) }) }), _jsx(ProducedRollEditField, { label: "Balance weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: printingEditForm.balanceweight, onValueChange: (balanceweight) => setPrintingEditForm((prev) => ({ ...prev, balanceweight })) }) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setPrintingProducedEditRoll(null), children: "Cancel" }), _jsx(Button, { type: "button", disabled: printingEditSaving, onClick: () => void handleSavePrintingProducedEdit(), children: "Save" })] })] }) })] }));
}
