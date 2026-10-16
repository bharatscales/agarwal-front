import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Printer, ScanBarcode, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnHeader } from "@/components/column-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { formatWeightWithMeter } from "@/lib/film-calc";
import { hasSemiConsumeChoice, NonNegativeDecimalInput, parseNonNegativeDecimal, } from "@/lib/non-negative-decimal-input";
import { deleteProducedRoll, jobCardApiErrorMessage, updateProducedRoll } from "@/lib/job-card-api";
import { getAllOperators } from "@/lib/operator-api";
import { getWastageReasons } from "@/lib/rolls-stock-api";
import { getProducedRollParentGroupKey, includesStringFilterFn } from "@/lib/table-filter-utils";
import { getFloorWorkOrderColumns } from "../floor-work-order-columns";
import { isProducedRollLocked, PRODUCED_ROLL_DELETE_CONFIRM, ProducedRollEditField, ProducedRollRowActions, producedRollEditDialogClassName, producedRollEditInputClassName, } from "../produced-roll-actions";
const INSPECTION_SHIFTS = ["A", "B"];
function parseOptionalInt(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return undefined;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? undefined : n;
}
function remainingBalance(inputKg, outputRaw, wastageRaw = "0") {
    const output = parseNonNegativeDecimal(outputRaw);
    if (output == null)
        return "";
    const wastageKg = parseNonNegativeDecimal(wastageRaw) ?? 0;
    return String(Math.max(0, Number(((Number(inputKg) || 0) - output - wastageKg).toFixed(2))));
}
function loadedRollBalance(roll) {
    const value = roll?.balanceWeight ?? roll?.balance_weight;
    if (value == null || Number.isNaN(Number(value)) || Number(value) < 0)
        return null;
    return Number(value);
}
function displayValue(value) {
    if (value == null || value === "")
        return "-";
    return String(value);
}
export function InspectionPanel(props) {
    const { inspectionSelectedWo, inspectionRollsLoading, inspectionLoadedRolls, inspectionAddRollForm, inspectionCreateChildLoading, setInspectionCreateChildLoading, setInspectionCreateChildMessage, getRollsStockById, setInspectionAddRollForm, inspectionChildRollsLoading, inspectionChildRollsFromDb, wipPrintingTemplate, createPrintJob, getPrintJob, setPrintingPrintStatus, inspectionFormCommittedForRollId, addInspectionRoll, setInspectionFormCommittedForRollId, setInspectionChildRollsFromDb, setInspectionRollsRefreshKey, inspectionCreateChildMessage, floorInspectionBarcode, setFloorInspectionBarcode, setFloorInspectionBarcodeError, floorInspectionBarcodeChecking, handleFloorInspectionBarcodeSubmit, floorInspectionWipRollsLoading, openFloorInspectionWipPicker, floorInspectionBarcodeError, floorInspectionWipPickerOpen, closeFloorInspectionWipPicker, floorInspectionWipRollsError, floorInspectionWipStockColumns, floorInspectionWipRolls, applyFloorInspectionFromBarcode, inspectionLoading, inspectionError, inspectionWorkOrders, setInspectionSelectedWo, unloadFloorLoadedRoll, getRollsStockByWorkOrder, onSkipWorkOrder, } = props;
    const [inspectionOperators, setInspectionOperators] = useState([]);
    const [savedWastageReasons, setSavedWastageReasons] = useState([]);
    const [inspectionEditRoll, setInspectionEditRoll] = useState(null);
    const [inspectionEditSaving, setInspectionEditSaving] = useState(false);
    const [inspectionEditForm, setInspectionEditForm] = useState({
        size: "",
        micron: "",
        netweight: "",
        wastage: "",
        balanceweight: "",
        wastageReason: "",
        noOfTag: "",
        noOfCuts: "",
        operatorName: "",
        shift: "",
        remark: "",
    });
    useEffect(() => {
        let cancelled = false;
        getAllOperators(0, 500)
            .then((ops) => {
            if (cancelled)
                return;
            const names = ops
                .filter((op) => (op.operation ?? "").toLowerCase() === "inspection")
                .map((op) => op.operatorName.trim())
                .filter(Boolean);
            setInspectionOperators(Array.from(new Set(names)));
        })
            .catch(() => {
            if (!cancelled)
                setInspectionOperators([]);
        });
        getWastageReasons()
            .then((reasons) => {
            if (!cancelled)
                setSavedWastageReasons(reasons);
        })
            .catch(() => {
            if (!cancelled)
                setSavedWastageReasons([]);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const operatorOptions = useMemo(() => inspectionOperators, [inspectionOperators]);
    useEffect(() => {
        if (!inspectionAddRollForm)
            return;
        const current = inspectionAddRollForm.operatorName?.trim() ?? "";
        if (current && operatorOptions.includes(current))
            return;
        const next = operatorOptions[0] ?? "";
        if (current === next)
            return;
        setInspectionAddRollForm((prev) => (prev ? { ...prev, operatorName: next } : prev));
    }, [operatorOptions, inspectionAddRollForm?.roll?.id]);
    const wastageReasonOptions = useMemo(() => {
        const reasons = [...savedWastageReasons];
        const current = inspectionAddRollForm?.wastageReason?.trim();
        if (current && !reasons.some((r) => r.toLowerCase() === current.toLowerCase())) {
            reasons.push(current);
        }
        const seen = new Set();
        return reasons
            .map((reason) => reason.trim())
            .filter((reason) => {
            const key = reason.toLowerCase();
            if (!reason || seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .map((reason) => ({ value: reason, label: reason }));
    }, [savedWastageReasons, inspectionAddRollForm?.wastageReason]);
    const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined), [onSkipWorkOrder]);
    const inspectionProducedTotals = useMemo(() => {
        return inspectionChildRollsFromDb.reduce((acc, row) => {
            acc.rollCount += 1;
            acc.netWeight += Number(row.netweight || 0);
            acc.wastage += Number(row.wastage || 0);
            return acc;
        }, { rollCount: 0, netWeight: 0, wastage: 0 });
    }, [inspectionChildRollsFromDb]);
    const handleUnloadInspectionRoll = async (jobCardId, rollId) => {
        try {
            setInspectionCreateChildLoading(true);
            setInspectionCreateChildMessage(null);
            await unloadFloorLoadedRoll(jobCardId, rollId, "inspection");
            setInspectionCreateChildMessage("Loaded roll removed.");
        }
        catch (err) {
            const detail = err?.response?.data
                ?.detail ||
                err?.message ||
                "Could not unload roll.";
            setInspectionCreateChildMessage(detail);
        }
        finally {
            setInspectionCreateChildLoading(false);
        }
    };
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
    const handleInspectionProducedRollReprint = async (r) => {
        const wo = inspectionSelectedWo;
        if (!wo || !wipPrintingTemplate)
            return;
        try {
            setInspectionCreateChildLoading(true);
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
                    micron: r.micron,
                    netweight: r.netweight,
                    wastage: r.wastage,
                    wastageReason: r.wastageReason,
                    noOfTag: r.noOfTag,
                    noOfCuts: r.noOfCuts,
                    operatorName: r.operatorName,
                    shift: r.shift,
                    remark: r.remark,
                    itemName: wo.itemName ?? r.itemName ?? null,
                },
            };
            const job = await createPrintJob({
                name: `Inspection Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
                template_id: wipPrintingTemplate.id,
                data: printData,
                copies: 1,
            });
            setInspectionCreateChildMessage("Label reprint sent to printer.");
            pollPrintJob(job.id);
        }
        catch {
            setInspectionCreateChildMessage("Failed to send reprint to printer.");
        }
        finally {
            setInspectionCreateChildLoading(false);
        }
    };
    const refreshInspectionProducedRolls = () => {
        if (!inspectionSelectedWo)
            return;
        getRollsStockByWorkOrder(inspectionSelectedWo.id, "wip_inspection").then(setInspectionChildRollsFromDb);
        setInspectionRollsRefreshKey((key) => key + 1);
    };
    const handleInspectionProducedRollDelete = async (row) => {
        if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM))
            return;
        try {
            setInspectionCreateChildLoading(true);
            await deleteProducedRoll(row.id);
            setInspectionCreateChildMessage("Produced roll deleted.");
            if (inspectionEditRoll?.id === row.id)
                setInspectionEditRoll(null);
            refreshInspectionProducedRolls();
        }
        catch (error) {
            setInspectionCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."));
        }
        finally {
            setInspectionCreateChildLoading(false);
        }
    };
    const handleSaveInspectionProducedEdit = async () => {
        const roll = inspectionEditRoll;
        if (!roll?.id)
            return;
        const netweight = parseNonNegativeDecimal(inspectionEditForm.netweight);
        const wastage = parseNonNegativeDecimal(inspectionEditForm.wastage);
        try {
            setInspectionEditSaving(true);
            await updateProducedRoll(roll.id, {
                size: parseNonNegativeDecimal(inspectionEditForm.size),
                micron: parseNonNegativeDecimal(inspectionEditForm.micron),
                netweight,
                grossweight: netweight,
                wastage,
                balanceWeight: parseNonNegativeDecimal(inspectionEditForm.balanceweight) ?? 0,
                wastageReason: inspectionEditForm.wastageReason.trim() || null,
                noOfTag: parseOptionalInt(inspectionEditForm.noOfTag) ?? null,
                noOfCuts: parseOptionalInt(inspectionEditForm.noOfCuts) ?? null,
                operatorName: inspectionEditForm.operatorName.trim() || null,
                shift: inspectionEditForm.shift.trim() || null,
                remark: inspectionEditForm.remark.trim() || null,
            });
            setInspectionCreateChildMessage("Produced roll updated.");
            setInspectionEditRoll(null);
            refreshInspectionProducedRolls();
        }
        catch (error) {
            setInspectionCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."));
        }
        finally {
            setInspectionEditSaving(false);
        }
    };
    const inspectionProducedRollColumns = useMemo(() => [
        {
            accessorKey: "size",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Size", column: column, placeholder: "Filter size..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.size != null ? String(row.original.size) : "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "micron",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Micron", column: column, placeholder: "Filter micron..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.micron != null ? String(row.original.micron) : "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "parentNetweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Input weight (kg)", column: column, placeholder: "Filter input weight..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter) })),
            filterFn: includesStringFilterFn,
            meta: { mergeRows: true },
        },
        {
            accessorKey: "netweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Output weight (kg)", column: column, placeholder: "Filter output weight..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "wastage",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Wastage (kg)", column: column, placeholder: "Filter wastage..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.wastage != null ? `${Number(row.original.wastage).toFixed(2)} kg` : "-" })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "balanceWeight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Balance weight (kg)", column: column, placeholder: "Filter balance weight..." })),
            cell: ({ row }) => {
                const value = row.original.parentBalanceWeight ?? row.original.balanceWeight;
                return (_jsx("div", { className: "text-xs", children: value != null ? `${Number(value).toFixed(2)} kg` : "-" }));
            },
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "wastageReason",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Reason of wastage", column: column, placeholder: "Filter reason..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.wastageReason) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "noOfTag",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "No. of tag", column: column, placeholder: "Filter tags..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.noOfTag) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "noOfCuts",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "No. of cuts", column: column, placeholder: "Filter cuts..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.noOfCuts) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "operatorName",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Operator name", column: column, placeholder: "Filter operator..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.operatorName) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "shift",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Shift", column: column, placeholder: "Filter shift..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.shift) })),
            filterFn: includesStringFilterFn,
        },
        {
            accessorKey: "remark",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Remark", column: column, placeholder: "Filter remark..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.remark) })),
            filterFn: includesStringFilterFn,
        },
        {
            id: "actions",
            header: () => _jsx("div", { className: "text-left", children: "Actions" }),
            cell: ({ row }) => (_jsx(ProducedRollRowActions, { reprintDisabled: !wipPrintingTemplate || inspectionCreateChildLoading, mutateDisabled: inspectionCreateChildLoading || isProducedRollLocked(row.original), onReprint: () => handleInspectionProducedRollReprint(row.original), onEdit: () => {
                    const roll = row.original;
                    const balance = roll.parentBalanceWeight ?? roll.balanceWeight;
                    setInspectionEditForm({
                        size: roll.size != null ? String(roll.size) : "",
                        micron: roll.micron != null ? String(roll.micron) : "",
                        netweight: roll.netweight != null ? String(roll.netweight) : "",
                        wastage: roll.wastage != null ? String(roll.wastage) : "",
                        balanceweight: balance != null ? String(balance) : "",
                        wastageReason: roll.wastageReason ?? "",
                        noOfTag: roll.noOfTag != null ? String(roll.noOfTag) : "",
                        noOfCuts: roll.noOfCuts != null ? String(roll.noOfCuts) : "",
                        operatorName: roll.operatorName ?? "",
                        shift: roll.shift ?? "",
                        remark: roll.remark ?? "",
                    });
                    setInspectionEditRoll(roll);
                }, onDelete: () => void handleInspectionProducedRollDelete(row.original) })),
        },
    ], [wipPrintingTemplate, inspectionCreateChildLoading, inspectionSelectedWo]);
    const selectLoadedRoll = async (jobCardNumber, jobCardId, roll, extras) => {
        if (inspectionCreateChildLoading)
            return;
        if (inspectionAddRollForm?.roll.id === roll.id)
            return;
        const woItemId = inspectionSelectedWo?.itemId;
        if (woItemId == null) {
            setInspectionCreateChildMessage("Work order has no item.");
            return;
        }
        const wastage = "0";
        const jobOperator = extras?.operatorName?.trim() ?? "";
        setInspectionAddRollForm({
            jobCardNumber,
            jobCardId,
            roll,
            parent: { gradeId: undefined },
            size: roll.size != null ? String(roll.size) : "",
            micron: roll.micron != null ? String(roll.micron) : "",
            netweight: "",
            wastage,
            wastageReason: "",
            noOfTag: "",
            noOfCuts: "",
            operatorName: operatorOptions.includes(jobOperator) ? jobOperator : operatorOptions[0] ?? "",
            shift: extras?.shift ?? "A",
            remark: "",
            balanceweight: loadedRollBalance(roll) != null ? String(loadedRollBalance(roll)) : "",
            semiConsumed: false,
        });
        try {
            const parent = await getRollsStockById(roll.id);
            setInspectionAddRollForm((prev) => {
                if (!prev || prev.roll.id !== roll.id)
                    return prev;
                return {
                    ...prev,
                    parent: { gradeId: parent.gradeId ?? prev.parent.gradeId },
                    balanceweight: parent.balanceWeight != null ? String(parent.balanceWeight) : prev.balanceweight,
                };
            });
        }
        catch {
            setInspectionCreateChildMessage("Failed to load parent roll.");
        }
    };
    const barcodeAndStockPicker = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-1 max-w-2xl", children: [_jsx(Label, { htmlFor: "floor-inspection-barcode", className: "text-xs text-gray-600 dark:text-gray-400", children: "Barcode" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative min-w-[min(100%,18rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "floor-inspection-barcode", type: "text", placeholder: "Scan or enter roll barcode", value: floorInspectionBarcode, onChange: (e) => {
                                            setFloorInspectionBarcode(e.target.value);
                                            setFloorInspectionBarcodeError(null);
                                        }, onKeyDown: (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                void handleFloorInspectionBarcodeSubmit();
                                            }
                                        }, disabled: floorInspectionBarcodeChecking, className: "pl-9", autoComplete: "off", autoFocus: true })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", className: "whitespace-nowrap", disabled: floorInspectionBarcodeChecking || floorInspectionWipRollsLoading, onClick: () => void openFloorInspectionWipPicker(), children: "Select Stock" })] }), floorInspectionBarcodeError && (_jsx("p", { className: "text-sm text-red-500", children: floorInspectionBarcodeError }))] }), floorInspectionWipPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Select WIP Printing roll" }), _jsx(CardDescription, { children: "Pick a roll to load into inspection (same as scanning its barcode). Only unused WIP Printing rolls from this work order are listed." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorInspectionWipPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorInspectionWipRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorInspectionWipRollsError && (_jsx("p", { className: "text-sm text-red-500 mb-3", children: floorInspectionWipRollsError })), _jsx(DataTable, { columns: floorInspectionWipStockColumns, data: floorInspectionWipRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorInspectionBarcodeChecking, onClick: async () => {
                                                const selected = selectedRows[0];
                                                const barcode = selected?.barcode?.trim();
                                                if (!barcode)
                                                    return;
                                                await applyFloorInspectionFromBarcode(barcode, { closePicker: true });
                                            }, children: floorInspectionBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, "floor-inspection-wip-picker")] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorInspectionWipPicker, children: "Close" }) }) })] }) }))] }));
    return (_jsxs(_Fragment, { children: [inspectionSelectedWo ? (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsx("div", { children: _jsxs("div", { className: "flex flex-col-reverse gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3", children: "Loaded roll" }), inspectionRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : inspectionLoadedRolls.length === 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No roll currently loaded for this work order." }), barcodeAndStockPicker] })) : (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Job card" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Structure" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Size" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Micron" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Input weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Balance weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Roll continue" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Reason of wastage" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "No. of tag" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "No. of cuts" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Operator name" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Shift" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Remark" }), _jsx("th", { className: "text-right py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: " " })] }) }), _jsx("tbody", { children: inspectionLoadedRolls.map(({ jobCardNumber, jobCardId, roll, operatorName, shift }) => {
                                                            const isSelected = inspectionAddRollForm?.roll.id === roll.id;
                                                            const form = isSelected ? inspectionAddRollForm : null;
                                                            return (_jsxs("tr", { className: `border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-pointer ${isSelected ? "bg-gray-50 dark:bg-gray-800/40" : ""}`, onClick: () => void selectLoadedRoll(jobCardNumber, jobCardId, roll, { operatorName, shift }), children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: jobCardNumber }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.item_name ?? roll.itemName ?? "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.size != null ? String(roll.size) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.micron != null ? String(roll.micron) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: formatWeightWithMeter(roll.netweight, roll.meter) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected, value: form ? form.netweight : "", onValueChange: (netweight) => {
                                                                                setInspectionAddRollForm((prev) => {
                                                                                    if (!prev || prev.roll.id !== roll.id)
                                                                                        return prev;
                                                                                    if (prev.semiConsumed)
                                                                                        return { ...prev, netweight };
                                                                                    return {
                                                                                        ...prev,
                                                                                        netweight,
                                                                                        balanceweight: remainingBalance(roll.netweight, netweight, prev.wastage),
                                                                                        semiConsumed: false,
                                                                                    };
                                                                                });
                                                                            } }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected, value: form ? form.wastage : "", onValueChange: (wastage) => {
                                                                                setInspectionAddRollForm((prev) => {
                                                                                    if (!prev || prev.roll.id !== roll.id)
                                                                                        return prev;
                                                                                    if (prev.semiConsumed)
                                                                                        return { ...prev, wastage };
                                                                                    return {
                                                                                        ...prev,
                                                                                        wastage,
                                                                                        balanceweight: remainingBalance(roll.netweight, prev.netweight, wastage),
                                                                                        semiConsumed: false,
                                                                                    };
                                                                                });
                                                                            } }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !isSelected || Boolean(form?.semiConsumed), value: form
                                                                                ? form.semiConsumed
                                                                                    ? ""
                                                                                    : form.balanceweight
                                                                                : loadedRollBalance(roll) != null
                                                                                    ? String(loadedRollBalance(roll))
                                                                                    : "", onValueChange: (nextValue) => {
                                                                                const parsed = parseNonNegativeDecimal(nextValue);
                                                                                setInspectionAddRollForm((prev) => {
                                                                                    if (!prev || prev.roll.id !== roll.id)
                                                                                        return prev;
                                                                                    return {
                                                                                        ...prev,
                                                                                        balanceweight: nextValue,
                                                                                        semiConsumed: parsed != null ? false : prev.semiConsumed,
                                                                                    };
                                                                                });
                                                                            } }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Checkbox, { checked: Boolean(form?.semiConsumed), disabled: !isSelected || inspectionCreateChildLoading, "aria-label": "Roll continue", title: "Keep this roll loaded; do not create a balance roll", onCheckedChange: (checked) => {
                                                                                const isChecked = checked === true;
                                                                                setInspectionAddRollForm((prev) => {
                                                                                    if (!prev || prev.roll.id !== roll.id)
                                                                                        return prev;
                                                                                    return {
                                                                                        ...prev,
                                                                                        semiConsumed: isChecked,
                                                                                        balanceweight: isChecked ? "" : prev.balanceweight,
                                                                                    };
                                                                                });
                                                                            } }) }), _jsx("td", { className: "py-1.5 px-2 min-w-[10rem]", onClick: (e) => e.stopPropagation(), children: _jsx(CreatableCombobox, { options: wastageReasonOptions, value: form?.wastageReason ? form.wastageReason : null, disabled: !isSelected, allowCreate: false, placeholder: "Select", searchPlaceholder: "Search reason\u2026", emptyMessage: "No reasons found.", onValueChange: (selected) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id
                                                                                ? { ...prev, wastageReason: selected ?? "" }
                                                                                : prev), className: "h-7 w-40 px-1.5 text-xs" }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Input, { type: "number", min: 0, step: "1", className: "h-7 w-16 px-1.5 text-xs", disabled: !isSelected, value: form ? form.noOfTag : "", onChange: (e) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, noOfTag: e.target.value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Input, { type: "number", min: 0, step: "1", className: "h-7 w-16 px-1.5 text-xs", disabled: !isSelected, value: form ? form.noOfCuts : "", onChange: (e) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, noOfCuts: e.target.value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsxs(Select, { value: form?.operatorName && operatorOptions.includes(form.operatorName)
                                                                                ? form.operatorName
                                                                                : undefined, disabled: !isSelected, onValueChange: (value) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, operatorName: value } : prev), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-36 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Select" }) }), _jsx(SelectContent, { children: operatorOptions.map((name) => (_jsx(SelectItem, { value: name, children: name }, name))) })] }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsxs(Select, { value: form?.shift || undefined, disabled: !isSelected, onValueChange: (value) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, shift: value } : prev), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-16 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: INSPECTION_SHIFTS.map((shiftOption) => (_jsx(SelectItem, { value: shiftOption, children: shiftOption }, shiftOption))) })] }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Input, { type: "text", className: "h-7 w-32 px-1.5 text-xs", disabled: !isSelected, value: form ? form.remark : "", onChange: (e) => setInspectionAddRollForm((prev) => prev && prev.roll.id === roll.id ? { ...prev, remark: e.target.value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2 text-right", onClick: (e) => e.stopPropagation(), children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", title: "Remove loaded roll", disabled: inspectionCreateChildLoading, onClick: () => void handleUnloadInspectionRoll(jobCardId, roll.id), children: _jsx(X, { className: "h-4 w-4" }) }) })] }, `${jobCardNumber}-${roll.id}`));
                                                        }) })] }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Produced rolls" }), !inspectionChildRollsLoading && (_jsx("div", { className: "rounded-[2px] border border-zinc-600 overflow-hidden", children: _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total produced rolls" }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: inspectionProducedTotals.rollCount }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total output weight (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: [inspectionProducedTotals.netWeight.toFixed(2), " kg"] }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold", children: [inspectionProducedTotals.wastage.toFixed(2), " kg"] })] }) }) }) }))] }), inspectionChildRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading rolls\u2026" })) : inspectionChildRollsFromDb.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No produced rolls found for this work order." })) : (_jsx(DataTable, { columns: inspectionProducedRollColumns, data: inspectionChildRollsFromDb, getRowSpanGroupKey: getProducedRollParentGroupKey, scrollable: true, scrollHeight: "45vh", compact: true, size: "xs", showSelectionSummary: false }))] })] }) }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap", children: [!inspectionRollsLoading && inspectionLoadedRolls.length > 0 && (_jsx("div", { className: "flex gap-2", children: _jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: inspectionCreateChildLoading ||
                                        !hasSemiConsumeChoice(inspectionAddRollForm?.balanceweight, inspectionAddRollForm?.semiConsumed) ||
                                        (inspectionAddRollForm != null && inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id), onClick: async () => {
                                        const form = inspectionAddRollForm;
                                        const wo = inspectionSelectedWo;
                                        if (form && wo?.itemId != null) {
                                            try {
                                                setInspectionCreateChildLoading(true);
                                                setInspectionCreateChildMessage(null);
                                                const parentIds = inspectionLoadedRolls.map((r) => r.roll.id);
                                                if (parentIds.length === 0) {
                                                    setInspectionCreateChildMessage("Load a roll before printing.");
                                                    return;
                                                }
                                                const semiConsumed = Boolean(form.semiConsumed);
                                                const balanceValue = semiConsumed ? null : parseNonNegativeDecimal(form.balanceweight || "");
                                                if (!semiConsumed && balanceValue == null) {
                                                    setInspectionCreateChildMessage("Enter balance weight or tick Roll continue.");
                                                    return;
                                                }
                                                const outputWeight = parseNonNegativeDecimal(form.netweight || "") ?? undefined;
                                                const wastageValue = parseNonNegativeDecimal(form.wastage || "") ?? undefined;
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
                                                            netweight: outputWeight,
                                                            grossweight: outputWeight,
                                                            wastage: wastageValue,
                                                            wastageReason: form.wastageReason || undefined,
                                                            noOfTag: parseOptionalInt(form.noOfTag),
                                                            noOfCuts: parseOptionalInt(form.noOfCuts),
                                                            operatorName: form.operatorName || undefined,
                                                            shift: form.shift || undefined,
                                                            remark: form.remark || undefined,
                                                            itemName: wo.itemName ?? null,
                                                        },
                                                    };
                                                    const job = await createPrintJob({
                                                        name: `Inspection - ${form.jobCardNumber}`,
                                                        template_id: wipPrintingTemplate.id,
                                                        data: printData,
                                                        copies: 1,
                                                    });
                                                    pollPrintJob(job.id);
                                                }
                                                await addInspectionRoll(form.jobCardId, {
                                                    itemId: wo.itemId,
                                                    rollno: "",
                                                    size: form.size ? parseFloat(form.size) : undefined,
                                                    micron: form.micron ? parseFloat(form.micron) : undefined,
                                                    netweight: outputWeight,
                                                    grossweight: outputWeight,
                                                    wastage: wastageValue,
                                                    wastageReason: form.wastageReason.trim() || undefined,
                                                    noOfTag: parseOptionalInt(form.noOfTag),
                                                    noOfCuts: parseOptionalInt(form.noOfCuts),
                                                    operatorName: form.operatorName.trim() || undefined,
                                                    shift: form.shift.trim() || undefined,
                                                    remark: form.remark.trim() || undefined,
                                                    gradeId: form.parent.gradeId,
                                                    parentRollIds: parentIds,
                                                    weightAtTime: outputWeight,
                                                    balanceWeight: semiConsumed ? undefined : (balanceValue ?? undefined),
                                                    semiConsumed,
                                                });
                                                getRollsStockByWorkOrder(wo.id, "wip_inspection").then(setInspectionChildRollsFromDb);
                                                if (semiConsumed) {
                                                    setInspectionFormCommittedForRollId(null);
                                                    setInspectionAddRollForm((prev) => prev && prev.roll.id === form.roll.id
                                                        ? {
                                                            ...prev,
                                                            netweight: "",
                                                            wastage: "0",
                                                            wastageReason: "",
                                                            noOfTag: "",
                                                            noOfCuts: "",
                                                            remark: "",
                                                            balanceweight: "",
                                                            semiConsumed: false,
                                                        }
                                                        : prev);
                                                    setInspectionCreateChildMessage("Inspection roll created. Loaded roll kept on the machine.");
                                                }
                                                else {
                                                    setInspectionFormCommittedForRollId(form.roll.id);
                                                    setInspectionCreateChildMessage(wipPrintingTemplate
                                                        ? "Roll added and label sent to printer."
                                                        : "Roll added and movement recorded. No WIP printing template configured.");
                                                }
                                                setInspectionRollsRefreshKey((key) => key + 1);
                                            }
                                            catch {
                                                setInspectionCreateChildMessage(wipPrintingTemplate
                                                    ? "Failed to print label. Roll not added or movement not recorded."
                                                    : "Failed to add roll or record movement.");
                                            }
                                            finally {
                                                setInspectionCreateChildLoading(false);
                                            }
                                        }
                                    }, children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] }) })), inspectionCreateChildMessage && (_jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: inspectionCreateChildMessage }))] })] })) : (_jsx(_Fragment, { children: inspectionLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : inspectionError ? (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: inspectionError })) : inspectionWorkOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No work orders found." })) : (_jsx(DataTable, { columns: floorWorkOrderColumns, data: inspectionWorkOrders, getRowId: (row) => String(row.id), onRowClick: (wo) => setInspectionSelectedWo(wo), scrollable: true, scrollHeight: "65vh", showSelectionSummary: false })) })), _jsx(Dialog, { open: Boolean(inspectionEditRoll), onOpenChange: (open) => { if (!open)
                    setInspectionEditRoll(null); }, children: _jsxs(DialogContent, { className: producedRollEditDialogClassName, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit produced roll" }), _jsx(DialogDescription, { children: "Update inspection output fields and leftover balance weight." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(ProducedRollEditField, { label: "Size", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: inspectionEditForm.size, onValueChange: (size) => setInspectionEditForm((prev) => ({ ...prev, size })) }) }), _jsx(ProducedRollEditField, { label: "Micron", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: inspectionEditForm.micron, onValueChange: (micron) => setInspectionEditForm((prev) => ({ ...prev, micron })) }) }), _jsx(ProducedRollEditField, { label: "Output weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: inspectionEditForm.netweight, onValueChange: (netweight) => setInspectionEditForm((prev) => ({ ...prev, netweight })) }) }), _jsx(ProducedRollEditField, { label: "Wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: inspectionEditForm.wastage, onValueChange: (wastage) => setInspectionEditForm((prev) => ({ ...prev, wastage })) }) }), _jsx(ProducedRollEditField, { label: "Balance weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: inspectionEditForm.balanceweight, onValueChange: (balanceweight) => setInspectionEditForm((prev) => ({ ...prev, balanceweight })) }) }), _jsx(ProducedRollEditField, { label: "No. of tag", children: _jsx(Input, { value: inspectionEditForm.noOfTag, onChange: (e) => setInspectionEditForm((prev) => ({ ...prev, noOfTag: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: "No. of cuts", children: _jsx(Input, { value: inspectionEditForm.noOfCuts, onChange: (e) => setInspectionEditForm((prev) => ({ ...prev, noOfCuts: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: "Shift", children: _jsxs(Select, { value: inspectionEditForm.shift || undefined, onValueChange: (shift) => setInspectionEditForm((prev) => ({ ...prev, shift })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: INSPECTION_SHIFTS.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }) }), _jsx(ProducedRollEditField, { label: "Operator name", className: "col-span-2", children: _jsx(Input, { value: inspectionEditForm.operatorName, onChange: (e) => setInspectionEditForm((prev) => ({ ...prev, operatorName: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: "Reason of wastage", className: "col-span-2", children: _jsx(Input, { value: inspectionEditForm.wastageReason, onChange: (e) => setInspectionEditForm((prev) => ({ ...prev, wastageReason: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: "Remark", className: "col-span-2", children: _jsx(Input, { value: inspectionEditForm.remark, onChange: (e) => setInspectionEditForm((prev) => ({ ...prev, remark: e.target.value })) }) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setInspectionEditRoll(null), children: "Cancel" }), _jsx(Button, { type: "button", disabled: inspectionEditSaving, onClick: () => void handleSaveInspectionProducedEdit(), children: "Save" })] })] }) })] }));
}
