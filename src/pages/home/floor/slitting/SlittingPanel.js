import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Printer, ScanBarcode, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ColumnHeader } from "@/components/column-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { formatWeightWithMeter } from "@/lib/film-calc";
import { deleteProducedRoll, jobCardApiErrorMessage, updateProducedRoll } from "@/lib/job-card-api";
import { NonNegativeDecimalInput, parseNonNegativeDecimal } from "@/lib/non-negative-decimal-input";
import { includesStringFilterFn } from "@/lib/table-filter-utils";
import { getFloorWorkOrderColumns } from "../floor-work-order-columns";
import { isProducedRollLocked, PRODUCED_ROLL_DELETE_CONFIRM, ProducedRollEditField, ProducedRollRowActions, producedRollEditDialogClassName, producedRollEditInputClassName, } from "../produced-roll-actions";
const SLIT_DIRECTIONS = ["Readable", "Unreadable", "LHS", "RHS"];
function stageLabel(stage) {
    const s = (stage ?? "").toLowerCase();
    if (s === "wip_printed" || s === "wip-printing")
        return "WIP Printing";
    if (s === "wip_inspection" || s === "wip-inspection")
        return "WIP Inspection";
    if (s === "wip_ecl" || s === "wip-ecl")
        return "WIP ECL";
    if (s === "wip_lamination" || s === "wip-lamination")
        return "WIP Lamination";
    if (s === "finished_goods" || s === "finished-goods")
        return "Finished goods";
    return stage || "—";
}
function displayValue(value) {
    if (value == null || value === "")
        return "-";
    return String(value);
}
function displayKg(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) ? "-" : `${n.toFixed(2)} kg`;
}
function sumSlittingWastages(form) {
    const parts = [
        parseNonNegativeDecimal(form.trimWastage || "") ?? 0,
        parseNonNegativeDecimal(form.eclWastage || "") ?? 0,
        parseNonNegativeDecimal(form.printedWastage || "") ?? 0,
        parseNonNegativeDecimal(form.laminationWastage || "") ?? 0,
        parseNonNegativeDecimal(form.slitterWastage || "") ?? 0,
    ];
    return String(Number(parts.reduce((a, b) => a + b, 0).toFixed(2)));
}
function patchSlittingWastage(prev, key, value) {
    if (!prev)
        return prev;
    const next = { ...prev, [key]: value };
    return { ...next, wastage: sumSlittingWastages(next) };
}
function emptySlittingOutputFields(micron) {
    return {
        micron,
        trimWastage: "0",
        eclWastage: "0",
        printedWastage: "0",
        laminationWastage: "0",
        slitterWastage: "0",
        wastage: "0",
        coilRewinding: "",
        slitDirection: "",
        coreSize: "",
        coilDia: "",
        size: "",
        jobRepeat: "",
    };
}
export function SlittingPanel(props) {
    const { slittingSelectedWo, slittingRollsLoading, slittingLoadedRolls, slittingAddRollForm, setSlittingAddRollForm, slittingCreateChildLoading, setSlittingCreateChildLoading, setSlittingCreateChildMessage, slittingChildRollsLoading, slittingChildRollsFromDb, setSlittingChildRollsFromDb, wipPrintingTemplate, createPrintJob, getPrintJob, setPrintingPrintStatus, addSlittingRoll, slittingCreateChildMessage, floorSlittingBarcode, setFloorSlittingBarcode, setFloorSlittingBarcodeError, floorSlittingBarcodeChecking, handleFloorSlittingBarcodeSubmit, floorSlittingParentRollsLoading, openFloorSlittingParentPicker, floorSlittingBarcodeError, floorSlittingParentPickerOpen, closeFloorSlittingParentPicker, floorSlittingParentRollsError, floorSlittingParentStockColumns, floorSlittingParentRolls, applyFloorSlittingFromBarcode, slittingLoading, slittingError, slittingWorkOrders, setSlittingSelectedWo, getRollsStockByParentIds, unloadFloorLoadedRoll, onSkipWorkOrder, setSlittingRollsRefreshKey, } = props;
    const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined), [onSkipWorkOrder]);
    const parent = slittingLoadedRolls[0] ?? null;
    const [slittingEditRoll, setSlittingEditRoll] = useState(null);
    const [slittingEditSaving, setSlittingEditSaving] = useState(false);
    const [slittingEditForm, setSlittingEditForm] = useState({
        trimWastage: "",
        eclWastage: "",
        printedWastage: "",
        laminationWastage: "",
        slitterWastage: "",
        wastage: "",
        coilRewinding: "",
        slitDirection: "",
        coreSize: "",
        coilDia: "",
        size: "",
        jobRepeat: "",
    });
    const slittingProducedTotals = useMemo(() => {
        const rollCount = slittingChildRollsFromDb.length;
        const totalWastage = slittingChildRollsFromDb.reduce((sum, r) => sum + (Number(r.wastage) || 0), 0);
        return { rollCount, totalWastage };
    }, [slittingChildRollsFromDb]);
    const pollPrintJob = (jobId) => {
        setPrintingPrintStatus("printing");
        let pollCount = 0;
        const maxPolls = 30;
        const pollInterval = setInterval(async () => {
            pollCount++;
            try {
                const updatedJob = await getPrintJob(jobId);
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
    };
    const refreshSlittingProducedRolls = () => {
        const parentIds = slittingLoadedRolls.map((r) => r.roll.id);
        if (parentIds.length > 0) {
            getRollsStockByParentIds(parentIds, "finished_goods").then(setSlittingChildRollsFromDb);
        }
        else {
            setSlittingChildRollsFromDb([]);
        }
        setSlittingRollsRefreshKey?.((key) => key + 1);
    };
    const handleUnloadSlittingRoll = async (jobCardId, rollId) => {
        try {
            setSlittingCreateChildLoading(true);
            setSlittingCreateChildMessage(null);
            await unloadFloorLoadedRoll(jobCardId, rollId, "slitting");
            setSlittingCreateChildMessage("Loaded roll removed.");
        }
        catch (err) {
            const detail = err?.response?.data
                ?.detail ||
                err?.message ||
                "Could not unload roll.";
            setSlittingCreateChildMessage(detail);
        }
        finally {
            setSlittingCreateChildLoading(false);
        }
    };
    const resetFieldsForNextSlit = () => {
        setSlittingAddRollForm((prev) => prev
            ? {
                ...prev,
                ...emptySlittingOutputFields(prev.micron || ""),
            }
            : null);
    };
    const handleSlittingProducedRollReprint = async (r) => {
        const wo = slittingSelectedWo;
        if (!wo || !wipPrintingTemplate)
            return;
        try {
            setSlittingCreateChildLoading(true);
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
                roll: {
                    id: r.id,
                    barcode: r.barcode,
                    size: r.size,
                    jobRepeat: r.jobRepeat,
                    micron: r.micron,
                    wastage: r.wastage,
                    trimWastage: r.trimWastage,
                    eclWastage: r.eclWastage,
                    printedWastage: r.printedWastage,
                    laminationWastage: r.laminationWastage,
                    slitterWastage: r.slitterWastage,
                    coilRewinding: r.coilRewinding,
                    slitDirection: r.slitDirection,
                    coreSize: r.coreSize,
                    coilDia: r.coilDia,
                    itemName: wo.itemName ?? r.itemName ?? null,
                },
            };
            const job = await createPrintJob({
                name: `Slitting Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
                template_id: wipPrintingTemplate.id,
                data: printData,
                copies: 1,
            });
            setSlittingCreateChildMessage("Label reprint sent to printer.");
            pollPrintJob(job.id);
        }
        catch {
            setSlittingCreateChildMessage("Failed to send reprint to printer.");
        }
        finally {
            setSlittingCreateChildLoading(false);
        }
    };
    const handleSlittingProducedRollDelete = async (r) => {
        if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM))
            return;
        try {
            setSlittingCreateChildLoading(true);
            await deleteProducedRoll(r.id);
            setSlittingCreateChildMessage("Produced roll deleted.");
            if (slittingEditRoll?.id === r.id)
                setSlittingEditRoll(null);
            refreshSlittingProducedRolls();
        }
        catch (error) {
            setSlittingCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."));
        }
        finally {
            setSlittingCreateChildLoading(false);
        }
    };
    const slittingProducedRollColumns = useMemo(() => [
        {
            accessorKey: "barcode",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Barcode", column: column, placeholder: "Filter barcode..." })),
            cell: ({ row }) => (_jsx("div", { className: "font-mono text-xs", children: displayValue(row.original.barcode) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "trimWastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Trim wastage", column: column, placeholder: "Filter trim..." })),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayKg(row.original.trimWastage) }),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "eclWastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "ECL wastage", column: column, placeholder: "Filter ECL..." })),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayKg(row.original.eclWastage) }),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "printedWastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Print wastage", column: column, placeholder: "Filter print..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.printedWastage) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "laminationWastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Lamination wastage", column: column, placeholder: "Filter lamination..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.laminationWastage) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "slitterWastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Slitter wastage", column: column, placeholder: "Filter slitter..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.slitterWastage) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "wastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Total wastage", column: column, placeholder: "Filter total..." })),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayKg(row.original.wastage) }),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "coilRewinding",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Coil rewinding", column: column, placeholder: "Filter rewinding..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.coilRewinding) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "slitDirection",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Direction", column: column, placeholder: "Filter direction..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.slitDirection) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "coreSize",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Core size", column: column, placeholder: "Filter core..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.coreSize) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "coilDia",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Coil dia", column: column, placeholder: "Filter coil dia..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.coilDia) })),
            filterFn: includesStringFilterFn,
        },
        {
            id: "jobSize",
            header: () => _jsx("div", { className: "text-center w-full", children: "Job size" }),
            columns: [
                {
                    accessorKey: "size",
                    header: ({ column }) => (_jsx(ColumnHeader, { title: "Width", column: column, placeholder: "Filter width..." })),
                    cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.size) })),
                    filterFn: includesStringFilterFn,
                },
                {
                    accessorKey: "jobRepeat",
                    header: ({ column }) => (_jsx(ColumnHeader, { title: "Repeat", column: column, placeholder: "Filter repeat..." })),
                    cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.jobRepeat) })),
                    filterFn: includesStringFilterFn,
                },
            ],
        },
        {
            id: "actions",
            header: () => _jsx("div", { className: "text-left", children: "Actions" }),
            cell: ({ row }) => (_jsx(ProducedRollRowActions, { reprintDisabled: !wipPrintingTemplate || slittingCreateChildLoading, mutateDisabled: slittingCreateChildLoading || isProducedRollLocked(row.original), onReprint: () => void handleSlittingProducedRollReprint(row.original), onEdit: () => {
                    const roll = row.original;
                    setSlittingEditForm({
                        trimWastage: roll.trimWastage != null ? String(roll.trimWastage) : "",
                        eclWastage: roll.eclWastage != null ? String(roll.eclWastage) : "",
                        printedWastage: roll.printedWastage != null ? String(roll.printedWastage) : "",
                        laminationWastage: roll.laminationWastage != null ? String(roll.laminationWastage) : "",
                        slitterWastage: roll.slitterWastage != null ? String(roll.slitterWastage) : "",
                        wastage: roll.wastage != null ? String(roll.wastage) : "",
                        coilRewinding: roll.coilRewinding != null ? String(roll.coilRewinding) : "",
                        slitDirection: roll.slitDirection ?? "",
                        coreSize: roll.coreSize != null ? String(roll.coreSize) : "",
                        coilDia: roll.coilDia != null ? String(roll.coilDia) : "",
                        size: roll.size != null ? String(roll.size) : "",
                        jobRepeat: roll.jobRepeat != null ? String(roll.jobRepeat) : "",
                    });
                    setSlittingEditRoll(roll);
                }, onDelete: () => void handleSlittingProducedRollDelete(row.original) })),
        },
    ], [wipPrintingTemplate, slittingCreateChildLoading, slittingSelectedWo]);
    return (_jsxs(_Fragment, { children: [slittingSelectedWo ? (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { className: "flex flex-col-reverse gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1", children: "Loaded parent" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3", children: "Load one parent (WIP Printed, Inspection, ECL, or Lamination). Produce multiple finished rolls one by one, then unload when done." }), slittingRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : !parent ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No roll currently loaded for this work order." })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Job card" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Barcode" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Stage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Structure" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Size" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Micron" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Input weight" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300" })] }) }), _jsx("tbody", { children: _jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50 last:border-0", children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: parent.jobCardNumber }), _jsx("td", { className: "py-1.5 px-2 font-mono text-gray-900 dark:text-gray-100", children: parent.roll.barcode }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: stageLabel(parent.roll.stage) }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: displayValue(parent.roll.item_name ?? parent.roll.itemName) }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: displayValue(parent.roll.size) }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: displayValue(parent.roll.micron) }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: formatWeightWithMeter(parent.roll.netweight, parent.roll.meter) }), _jsx("td", { className: "py-1.5 px-2 text-right", children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7", title: "Remove loaded roll", disabled: slittingCreateChildLoading, onClick: () => void handleUnloadSlittingRoll(parent.jobCardId, parent.roll.id), children: _jsx(X, { className: "h-4 w-4" }) }) })] }) })] }) }), slittingAddRollForm && (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsxs("thead", { children: [_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { colSpan: 6, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Wastage" }), _jsx("th", { colSpan: 4, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Coil" }), _jsx("th", { colSpan: 2, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Job size" })] }), _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Trim wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "ECL wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Print wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Lamination wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Slitter wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Total wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Coil rewinding" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Direction" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Core size" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Coil dia" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Width" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Repeat" })] })] }), _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.trimWastage, onValueChange: (value) => setSlittingAddRollForm((prev) => patchSlittingWastage(prev, "trimWastage", value)) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.eclWastage, onValueChange: (value) => setSlittingAddRollForm((prev) => patchSlittingWastage(prev, "eclWastage", value)) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.printedWastage, onValueChange: (value) => setSlittingAddRollForm((prev) => patchSlittingWastage(prev, "printedWastage", value)) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.laminationWastage, onValueChange: (value) => setSlittingAddRollForm((prev) => patchSlittingWastage(prev, "laminationWastage", value)) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.slitterWastage, onValueChange: (value) => setSlittingAddRollForm((prev) => patchSlittingWastage(prev, "slitterWastage", value)) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx("span", { className: "text-xs text-gray-900 dark:text-gray-100", children: slittingAddRollForm.wastage || "0" }) }), _jsx("td", { className: "py-1.5 px-2 border-l border-gray-200 dark:border-gray-700", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: slittingAddRollForm.coilRewinding, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, coilRewinding: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsxs(Select, { value: slittingAddRollForm.slitDirection || undefined, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, slitDirection: value } : prev), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-28 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Select" }) }), _jsx(SelectContent, { children: SLIT_DIRECTIONS.map((dir) => (_jsx(SelectItem, { value: dir, children: dir }, dir))) })] }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", value: slittingAddRollForm.coreSize, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, coreSize: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", value: slittingAddRollForm.coilDia, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, coilDia: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2 border-l border-gray-200 dark:border-gray-700", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", value: slittingAddRollForm.size, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, size: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", value: slittingAddRollForm.jobRepeat, onValueChange: (value) => setSlittingAddRollForm((prev) => prev ? { ...prev, jobRepeat: value } : prev) }) })] }) })] }) }))] }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Produced rolls" }), !slittingChildRollsLoading && (_jsx("div", { className: "rounded-[2px] border border-zinc-600 overflow-hidden", children: _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total produced rolls" }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: slittingProducedTotals.rollCount }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold", children: [slittingProducedTotals.totalWastage.toFixed(2), " kg"] })] }) }) }) }))] }), slittingChildRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading rolls\u2026" })) : slittingChildRollsFromDb.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No produced rolls found for this parent. Print each slit roll below." })) : (_jsx(DataTable, { columns: slittingProducedRollColumns, data: slittingChildRollsFromDb, scrollable: true, scrollHeight: "45vh", compact: true, size: "xs", showSelectionSummary: false }))] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap", children: [!slittingRollsLoading && parent && slittingAddRollForm && (_jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: slittingCreateChildLoading, onClick: async () => {
                                    const form = slittingAddRollForm;
                                    const wo = slittingSelectedWo;
                                    if (!form || wo?.itemId == null)
                                        return;
                                    try {
                                        setSlittingCreateChildLoading(true);
                                        setSlittingCreateChildMessage(null);
                                        const parentIds = [form.roll.id];
                                        const trimWastage = parseNonNegativeDecimal(form.trimWastage || "") ?? 0;
                                        const eclWastage = parseNonNegativeDecimal(form.eclWastage || "") ?? 0;
                                        const printedWastage = parseNonNegativeDecimal(form.printedWastage || "") ?? 0;
                                        const laminationWastage = parseNonNegativeDecimal(form.laminationWastage || "") ?? 0;
                                        const slitterWastage = parseNonNegativeDecimal(form.slitterWastage || "") ?? 0;
                                        const totalWastage = parseNonNegativeDecimal(form.wastage || "") ??
                                            trimWastage + eclWastage + printedWastage + laminationWastage + slitterWastage;
                                        const width = parseNonNegativeDecimal(form.size || "") ?? undefined;
                                        const jobRepeat = parseNonNegativeDecimal(form.jobRepeat || "") ?? undefined;
                                        const coilRewinding = parseNonNegativeDecimal(form.coilRewinding || "") ?? undefined;
                                        const coreSize = parseNonNegativeDecimal(form.coreSize || "") ?? undefined;
                                        const coilDia = parseNonNegativeDecimal(form.coilDia || "") ?? undefined;
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
                                                    size: width,
                                                    jobRepeat,
                                                    micron: form.micron ? parseFloat(form.micron) : undefined,
                                                    wastage: totalWastage,
                                                    trimWastage,
                                                    eclWastage,
                                                    printedWastage,
                                                    laminationWastage,
                                                    slitterWastage,
                                                    coilRewinding,
                                                    slitDirection: form.slitDirection || undefined,
                                                    coreSize,
                                                    coilDia,
                                                    itemName: wo.itemName ?? null,
                                                },
                                            };
                                            const job = await createPrintJob({
                                                name: `Slitting - ${form.jobCardNumber}`,
                                                template_id: wipPrintingTemplate.id,
                                                data: printData,
                                                copies: 1,
                                            });
                                            pollPrintJob(job.id);
                                        }
                                        await addSlittingRoll(form.jobCardId, {
                                            itemId: wo.itemId,
                                            rollno: "",
                                            size: width,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            wastage: totalWastage,
                                            trimWastage,
                                            eclWastage,
                                            printedWastage,
                                            laminationWastage,
                                            slitterWastage,
                                            coilRewinding,
                                            slitDirection: form.slitDirection.trim() || undefined,
                                            coreSize,
                                            coilDia,
                                            jobRepeat,
                                            gradeId: form.parent.gradeId,
                                            parentRollIds: parentIds,
                                        });
                                        const children = await getRollsStockByParentIds(parentIds, "finished_goods");
                                        setSlittingChildRollsFromDb(children);
                                        resetFieldsForNextSlit();
                                        setSlittingCreateChildMessage(wipPrintingTemplate
                                            ? "Roll added and label sent to printer. Enter the next slit when ready."
                                            : "Roll added. Enter the next slit when ready. No label template configured.");
                                    }
                                    catch (error) {
                                        setSlittingCreateChildMessage(jobCardApiErrorMessage(error, wipPrintingTemplate
                                            ? "Failed to print label. Roll not added or movement not recorded."
                                            : "Failed to add roll or record movement."));
                                    }
                                    finally {
                                        setSlittingCreateChildLoading(false);
                                    }
                                }, children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] })), slittingCreateChildMessage && (_jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: slittingCreateChildMessage }))] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 space-y-1", children: [_jsx(Label, { htmlFor: "floor-slitting-barcode", className: "text-xs text-gray-600 dark:text-gray-400", children: "Barcode (parent roll)" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Scan WIP Printed, WIP Inspection, WIP ECL, or WIP Lamination to open the work order and load the parent." }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 max-w-2xl", children: [_jsxs("div", { className: "relative min-w-[min(100%,18rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "floor-slitting-barcode", type: "text", placeholder: "Scan or enter parent roll barcode", value: floorSlittingBarcode, onChange: (e) => {
                                                    setFloorSlittingBarcode(e.target.value);
                                                    setFloorSlittingBarcodeError(null);
                                                }, onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        void handleFloorSlittingBarcodeSubmit();
                                                    }
                                                }, disabled: floorSlittingBarcodeChecking, className: "pl-9", autoComplete: "off" })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", className: "whitespace-nowrap", disabled: floorSlittingBarcodeChecking || floorSlittingParentRollsLoading, onClick: () => void openFloorSlittingParentPicker(), children: "Select Stock" })] }), floorSlittingBarcodeError && _jsx("p", { className: "text-sm text-red-500", children: floorSlittingBarcodeError })] }), floorSlittingParentPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Select parent roll" }), _jsx(CardDescription, { children: "Pick a WIP Printed, WIP Inspection, WIP ECL, or WIP Lamination roll to load into Slitting." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorSlittingParentPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorSlittingParentRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorSlittingParentRollsError && (_jsx("p", { className: "text-sm text-red-500 mb-3", children: floorSlittingParentRollsError })), _jsx(DataTable, { columns: floorSlittingParentStockColumns, data: floorSlittingParentRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorSlittingBarcodeChecking, onClick: async () => {
                                                        const selected = selectedRows[0];
                                                        const barcode = selected?.barcode?.trim();
                                                        if (!barcode)
                                                            return;
                                                        await applyFloorSlittingFromBarcode(barcode, { closePicker: true });
                                                    }, children: floorSlittingBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, "floor-slitting-parent-picker")] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorSlittingParentPicker, children: "Close" }) }) })] }) })), slittingLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : slittingError ? (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: slittingError })) : slittingWorkOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No work orders found." })) : (_jsx(DataTable, { columns: floorWorkOrderColumns, data: slittingWorkOrders, getRowId: (row) => String(row.id), onRowClick: (wo) => setSlittingSelectedWo(wo), scrollable: true, scrollHeight: "65vh", showSelectionSummary: false }))] })), _jsx(Dialog, { open: Boolean(slittingEditRoll), onOpenChange: (open) => {
                    if (!open)
                        setSlittingEditRoll(null);
                }, children: _jsxs(DialogContent, { className: producedRollEditDialogClassName, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit produced roll" }), _jsx(DialogDescription, { children: "Update slit wastage, coil, and job size fields." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(ProducedRollEditField, { label: "Trim wastage", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.trimWastage, onValueChange: (trimWastage) => setSlittingEditForm((prev) => ({
                                            ...prev,
                                            trimWastage,
                                            wastage: sumSlittingWastages({ ...prev, trimWastage }),
                                        })) }) }), _jsx(ProducedRollEditField, { label: "ECL wastage", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.eclWastage, onValueChange: (eclWastage) => setSlittingEditForm((prev) => ({
                                            ...prev,
                                            eclWastage,
                                            wastage: sumSlittingWastages({ ...prev, eclWastage }),
                                        })) }) }), _jsx(ProducedRollEditField, { label: "Print wastage", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.printedWastage, onValueChange: (printedWastage) => setSlittingEditForm((prev) => ({
                                            ...prev,
                                            printedWastage,
                                            wastage: sumSlittingWastages({ ...prev, printedWastage }),
                                        })) }) }), _jsx(ProducedRollEditField, { label: "Lamination wastage", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.laminationWastage, onValueChange: (laminationWastage) => setSlittingEditForm((prev) => ({
                                            ...prev,
                                            laminationWastage,
                                            wastage: sumSlittingWastages({ ...prev, laminationWastage }),
                                        })) }) }), _jsx(ProducedRollEditField, { label: "Slitter wastage", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.slitterWastage, onValueChange: (slitterWastage) => setSlittingEditForm((prev) => ({
                                            ...prev,
                                            slitterWastage,
                                            wastage: sumSlittingWastages({ ...prev, slitterWastage }),
                                        })) }) }), _jsx(ProducedRollEditField, { label: "Total wastage", children: _jsx(Input, { className: producedRollEditInputClassName, value: slittingEditForm.wastage, readOnly: true }) }), _jsx(ProducedRollEditField, { label: "Coil rewinding", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.coilRewinding, onValueChange: (coilRewinding) => setSlittingEditForm((prev) => ({ ...prev, coilRewinding })) }) }), _jsx(ProducedRollEditField, { label: "Direction", children: _jsxs(Select, { value: slittingEditForm.slitDirection || undefined, onValueChange: (slitDirection) => setSlittingEditForm((prev) => ({ ...prev, slitDirection })), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-full px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Select" }) }), _jsx(SelectContent, { children: SLIT_DIRECTIONS.map((dir) => (_jsx(SelectItem, { value: dir, children: dir }, dir))) })] }) }), _jsx(ProducedRollEditField, { label: "Core size", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.coreSize, onValueChange: (coreSize) => setSlittingEditForm((prev) => ({ ...prev, coreSize })) }) }), _jsx(ProducedRollEditField, { label: "Coil dia", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.coilDia, onValueChange: (coilDia) => setSlittingEditForm((prev) => ({ ...prev, coilDia })) }) }), _jsx(ProducedRollEditField, { label: "Width", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.size, onValueChange: (size) => setSlittingEditForm((prev) => ({ ...prev, size })) }) }), _jsx(ProducedRollEditField, { label: "Repeat", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: slittingEditForm.jobRepeat, onValueChange: (jobRepeat) => setSlittingEditForm((prev) => ({ ...prev, jobRepeat })) }) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setSlittingEditRoll(null), children: "Cancel" }), _jsx(Button, { type: "button", disabled: slittingEditSaving, onClick: async () => {
                                        const roll = slittingEditRoll;
                                        if (!roll?.id)
                                            return;
                                        try {
                                            setSlittingEditSaving(true);
                                            const trimWastage = parseNonNegativeDecimal(slittingEditForm.trimWastage);
                                            const eclWastage = parseNonNegativeDecimal(slittingEditForm.eclWastage);
                                            const printedWastage = parseNonNegativeDecimal(slittingEditForm.printedWastage);
                                            const laminationWastage = parseNonNegativeDecimal(slittingEditForm.laminationWastage);
                                            const slitterWastage = parseNonNegativeDecimal(slittingEditForm.slitterWastage);
                                            const totalWastage = parseNonNegativeDecimal(slittingEditForm.wastage) ??
                                                (trimWastage ?? 0) +
                                                    (eclWastage ?? 0) +
                                                    (printedWastage ?? 0) +
                                                    (laminationWastage ?? 0) +
                                                    (slitterWastage ?? 0);
                                            await updateProducedRoll(roll.id, {
                                                size: parseNonNegativeDecimal(slittingEditForm.size),
                                                jobRepeat: parseNonNegativeDecimal(slittingEditForm.jobRepeat),
                                                wastage: totalWastage,
                                                trimWastage,
                                                eclWastage,
                                                printedWastage,
                                                laminationWastage,
                                                slitterWastage,
                                                coilRewinding: parseNonNegativeDecimal(slittingEditForm.coilRewinding),
                                                slitDirection: slittingEditForm.slitDirection.trim() || null,
                                                coreSize: parseNonNegativeDecimal(slittingEditForm.coreSize),
                                                coilDia: parseNonNegativeDecimal(slittingEditForm.coilDia),
                                            });
                                            setSlittingCreateChildMessage("Produced roll updated.");
                                            setSlittingEditRoll(null);
                                            refreshSlittingProducedRolls();
                                        }
                                        catch (error) {
                                            setSlittingCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."));
                                        }
                                        finally {
                                            setSlittingEditSaving(false);
                                        }
                                    }, children: "Save" })] })] }) })] }));
}
