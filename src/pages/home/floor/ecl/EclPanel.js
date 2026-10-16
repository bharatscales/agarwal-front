import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Printer, ScanBarcode, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnHeader } from "@/components/column-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { formatWeightWithMeter } from "@/lib/film-calc";
import { getItemsByGroupForMenu } from "@/lib/item-api";
import { closeRollWithoutOutput, deleteProducedRoll, getAllJobCards, getClosedWithoutOutput, undoCloseWithoutOutput, jobCardApiErrorMessage, updateProducedRoll, } from "@/lib/job-card-api";
import { hasSemiConsumeChoice, NonNegativeDecimalInput, parseNonNegativeDecimal, } from "@/lib/non-negative-decimal-input";
import { getAllOperators } from "@/lib/operator-api";
import { createDualInputGroupPathGetter, includesStringFilterFn } from "@/lib/table-filter-utils";
import { allowedWipStagesForDept, isOperationSkipped, wipStageLabel } from "@/lib/wo-flow";
import { ClosedWithoutOutputList, CloseWithoutOutputDialog, } from "../close-without-output";
import { getFloorWorkOrderColumns } from "../floor-work-order-columns";
import { isProducedRollLocked, PRODUCED_ROLL_DELETE_CONFIRM, ProducedRollEditField, ProducedRollRowActions, producedRollEditDialogClassName, producedRollEditInputClassName, } from "../produced-roll-actions";
const ECL_SHIFTS = ["A", "B"];
const RM_FILM_GROUP = "rm film";
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
function pickEclProducedParents(parentRolls, getRole) {
    const parents = parentRolls ?? [];
    let input1 = parents.find((p) => getRole(p.stage) === "wip") ?? null;
    let input2 = parents.find((p) => getRole(p.stage) === "rm") ?? null;
    if (!input1 && !input2 && parents.length >= 1) {
        input1 = parents[0] ?? null;
        input2 = parents[1] ?? null;
    }
    else if (!input1 && parents.length > 0) {
        input1 = parents.find((p) => p.id !== input2?.id) ?? null;
    }
    else if (!input2 && parents.length > 0) {
        input2 = parents.find((p) => p.id !== input1?.id) ?? null;
    }
    return { input1, input2 };
}
function parentsForProducedColumn(parentRolls, getRole, role) {
    const parents = parentRolls ?? [];
    const matched = parents.filter((parent) => getRole(parent.stage) === role);
    if (matched.length > 0 || parents.some((parent) => getRole(parent.stage) != null))
        return matched;
    const picked = pickEclProducedParents(parents, getRole);
    const fallback = role === "wip" ? picked.input1 : picked.input2;
    return fallback ? [fallback] : [];
}
function renderParentLines(parents, render, className = "text-xs") {
    if (parents.length === 0)
        return _jsx("div", { className: className, children: "-" });
    return (_jsx("div", { className: `${className} space-y-0.5`, children: parents.map((parent) => (_jsx("div", { children: render(parent) }, parent.id))) }));
}
function eclInputGroupColumns(id, label, pickAll) {
    const mergeByParent = {
        mergeRows: true,
        getMergeKey: (row) => pickAll(row).map((parent) => parent.id).join("-") || null,
    };
    return {
        id,
        header: () => _jsx("div", { className: "text-center w-full", children: label }),
        columns: [
            {
                id: `${id}Structure`,
                header: () => _jsx("div", { children: "Structure" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => displayValue(parent.itemName)),
                meta: mergeByParent,
            },
            {
                id: `${id}Size`,
                header: () => _jsx("div", { children: "Size" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => parent.size != null ? String(parent.size) : "-"),
                meta: mergeByParent,
            },
            {
                id: `${id}Micron`,
                header: () => _jsx("div", { children: "Micron" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => parent.micron != null ? String(parent.micron) : "-"),
                meta: mergeByParent,
            },
            {
                id: `${id}InputWeight`,
                header: () => _jsx("div", { children: "Input weight" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => formatWeightWithMeter(parent.netweight, parent.meter)),
                meta: mergeByParent,
            },
            {
                id: `${id}Wastage`,
                header: () => _jsx("div", { children: "Wastage" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => displayKg(parent.wastage)),
                meta: mergeByParent,
            },
            {
                id: `${id}BalanceWeight`,
                header: () => _jsx("div", { children: "Balance weight" }),
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => displayKg(parent.balanceWeight)),
                meta: mergeByParent,
            },
        ],
    };
}
function asSingleColumnGroup(id, column) {
    return {
        id,
        header: () => null,
        columns: [column],
    };
}
function eclExtrusionGroupColumns() {
    return {
        id: "extrusion",
        header: () => _jsx("div", { className: "text-center w-full", children: "Extrusion" }),
        columns: [
            {
                accessorKey: "inkGsm",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Coating (kg)", column: column, placeholder: "Filter coating..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.inkGsm != null ? `${Number(row.original.inkGsm).toFixed(2)} kg` : "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "trimWastage",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Trim wastage (kg)", column: column, placeholder: "Filter trim wastage..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.trimWastage) })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "lumpsWastage",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Lumps wastage (kg)", column: column, placeholder: "Filter lumps wastage..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.lumpsWastage) })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "eclOutputWastage",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Output wastage (kg)", column: column, placeholder: "Filter output wastage..." })),
                cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayKg(row.original.eclOutputWastage) })),
                filterFn: includesStringFilterFn,
            },
        ],
    };
}
function loadedFilmCells(entry, opts) {
    const roll = entry?.roll;
    if (!roll) {
        return (_jsxs(_Fragment, { children: [_jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: "\u2014" }), _jsx("td", { className: "py-1.5 px-2" })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.item_name ?? roll.itemName ?? "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.size != null ? String(roll.size) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.micron != null ? String(roll.micron) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: formatWeightWithMeter(roll.netweight, roll.meter) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !opts.canEdit, value: opts.wastage, onValueChange: opts.onWastage }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !opts.canEdit || opts.semiConsumed, value: opts.semiConsumed ? "" : opts.balance, onValueChange: opts.onBalance }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Checkbox, { checked: opts.semiConsumed, disabled: !opts.canEdit || opts.unloadDisabled || opts.consumeOpen, "aria-label": "Roll continue", title: opts.consumeOpen
                        ? "This film is being consumed"
                        : "Keep this roll loaded; do not create a balance roll", onCheckedChange: (checked) => opts.onSemiConsumed(checked === true) }) }), _jsxs("td", { className: "py-1.5 px-2 text-right whitespace-nowrap", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-6 px-1.5 text-xs", title: opts.semiConsumed
                            ? "Uncheck Roll continue to consume this film"
                            : "Use this film now. It becomes a parent when the output roll is created", disabled: opts.unloadDisabled || opts.semiConsumed, onClick: opts.onCloseWithoutOutput, children: "Consume" }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", title: "Remove loaded roll and return it to stock", disabled: opts.unloadDisabled, onClick: () => void opts.onUnload(entry.jobCardId, roll.id), children: _jsx(X, { className: "h-4 w-4" }) })] })] }));
}
export function EclPanel(props) {
    const { eclSelectedWo, eclRollsLoading, eclLoadedRolls, eclAddRollForm, eclCreateChildLoading, setEclCreateChildLoading, setEclCreateChildMessage, setEclAddRollForm, eclChildRollsLoading, eclChildRollsFromDb, wipPrintingTemplate, createPrintJob, getPrintJob, setPrintingPrintStatus, eclFormCommittedForRollId, addEclRoll, setEclFormCommittedForRollId, setEclChildRollsFromDb, getRollsStockByWorkOrder, setEclRollsRefreshKey, eclCreateChildMessage, floorEclBarcode, setFloorEclBarcode, setFloorEclBarcodeError, floorEclBarcodeChecking, handleFloorEclBarcodeSubmit, floorEclWipRollsLoading, openFloorEclWipPicker, floorEclBarcodeError, floorEclWipPickerOpen, closeFloorEclWipPicker, floorEclWipRollsError, floorEclWipStockColumns, floorEclWipRolls, floorEclRmPickerOpen, closeFloorEclRmPicker, floorEclRmRollsLoading, floorEclRmRollsError, floorEclRmStockColumns, floorEclRmRolls, openFloorEclRmPicker, floorEclDetailWipBarcode, setFloorEclDetailWipBarcode, floorEclDetailRmBarcode, setFloorEclDetailRmBarcode, applyFloorEclFromBarcode, getEclParentRole, eclLoading, eclError, eclWorkOrders, setEclSelectedWo, unloadFloorLoadedRoll, onSkipWorkOrder, } = props;
    const [eclOperators, setEclOperators] = useState([]);
    const [rmFilmItemFilter, setRmFilmItemFilter] = useState("all");
    const [rmFilmWarehouseFilter, setRmFilmWarehouseFilter] = useState("all");
    const [rmFilmItems, setRmFilmItems] = useState([]);
    const [eclEditRoll, setEclEditRoll] = useState(null);
    const [eclEditSaving, setEclEditSaving] = useState(false);
    const [eclCloseTarget, setEclCloseTarget] = useState(null);
    const [eclClosedRolls, setEclClosedRolls] = useState([]);
    const [eclClosedRefreshKey, setEclClosedRefreshKey] = useState(0);
    const [eclEditForm, setEclEditForm] = useState({
        netweight: "",
        inkGsm: "",
        trimWastage: "",
        lumpsWastage: "",
        eclOutputWastage: "",
        operatorName: "",
        shift: "",
        input1Id: null,
        input2Id: null,
        input1Balance: "",
        input2Balance: "",
    });
    useEffect(() => {
        let cancelled = false;
        getAllOperators(0, 500)
            .then((ops) => {
            if (cancelled)
                return;
            const names = ops
                .filter((op) => (op.operation ?? "").toLowerCase() === "ecl")
                .map((op) => op.operatorName.trim())
                .filter(Boolean);
            setEclOperators(Array.from(new Set(names)));
        })
            .catch(() => {
            if (!cancelled)
                setEclOperators([]);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        if (!eclAddRollForm)
            return;
        const current = eclAddRollForm.operatorName?.trim() ?? "";
        if (current && eclOperators.includes(current))
            return;
        const next = eclOperators[0] ?? "";
        if (current === next)
            return;
        setEclAddRollForm((prev) => (prev ? { ...prev, operatorName: next } : prev));
    }, [eclOperators, eclAddRollForm?.roll?.id]);
    useEffect(() => {
        if (!floorEclRmPickerOpen) {
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
    }, [floorEclRmPickerOpen]);
    const rmFilmItemBadges = useMemo(() => {
        const fromMaster = rmFilmItems
            .map((item) => (item.item_code || item.name || "").trim())
            .filter(Boolean);
        if (fromMaster.length > 0)
            return fromMaster;
        const unique = new Map();
        for (const roll of floorEclRmRolls) {
            const code = (roll.itemCode || "").trim();
            if (code && !unique.has(code.toLowerCase()))
                unique.set(code.toLowerCase(), code);
        }
        return [...unique.values()];
    }, [rmFilmItems, floorEclRmRolls]);
    const filteredFloorEclRmRolls = useMemo(() => {
        return floorEclRmRolls.filter((roll) => {
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
    }, [floorEclRmRolls, rmFilmItemFilter, rmFilmWarehouseFilter]);
    const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined), [onSkipWorkOrder]);
    const wipParent = eclLoadedRolls.find((r) => getEclParentRole(r.roll.stage) === "wip") ?? null;
    const rmParent = eclLoadedRolls.find((r) => getEclParentRole(r.roll.stage) === "rm") ?? null;
    const bothParentsLoaded = wipParent != null && rmParent != null;
    const sameJobCard = bothParentsLoaded && wipParent.jobCardId === rmParent.jobCardId;
    const canProduce = bothParentsLoaded && sameJobCard;
    const wipFilmLabel = wipStageLabel(allowedWipStagesForDept("ECL", eclSelectedWo?.skippedOperations)[0]);
    const input1Label = `Input 1 (${wipFilmLabel})`;
    const input2Label = "Input 2 (RM Film)";
    const eclProducedTotals = useMemo(() => {
        return eclChildRollsFromDb.reduce((acc, row) => {
            acc.rollCount += 1;
            acc.netWeight += Number(row.netweight || 0);
            acc.wastage += Number(row.wastage || 0);
            return acc;
        }, { rollCount: 0, netWeight: 0, wastage: 0 });
    }, [eclChildRollsFromDb]);
    const handleUnloadEclRoll = async (jobCardId, rollId) => {
        try {
            setEclCreateChildLoading(true);
            setEclCreateChildMessage(null);
            await unloadFloorLoadedRoll(jobCardId, rollId, "ecl");
            setEclCreateChildMessage("Loaded roll removed.");
        }
        catch (err) {
            const detail = err?.response?.data
                ?.detail ||
                err?.message ||
                "Could not unload roll.";
            setEclCreateChildMessage(detail);
        }
        finally {
            setEclCreateChildLoading(false);
        }
    };
    useEffect(() => {
        if (!eclSelectedWo?.id) {
            setEclClosedRolls([]);
            return;
        }
        let cancelled = false;
        const run = async () => {
            try {
                const cards = await getAllJobCards(0, 20, eclSelectedWo.id, "ECL");
                const groups = await Promise.all(cards.map(async (card) => {
                    const rolls = await getClosedWithoutOutput(card.id);
                    return rolls.map((roll) => ({
                        ...roll,
                        jobCardId: card.id,
                        jobCardNumber: card.jobCardNumber,
                    }));
                }));
                if (!cancelled)
                    setEclClosedRolls(groups.flat());
            }
            catch {
                if (!cancelled)
                    setEclClosedRolls([]);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [eclSelectedWo?.id, eclClosedRefreshKey]);
    const openEclCloseWithoutOutput = (entry, label, fields) => {
        const roll = entry.roll;
        const wastageKg = parseNonNegativeDecimal(fields.wastage || "");
        const balanceKg = parseNonNegativeDecimal(fields.balance || "");
        setEclCloseTarget({
            jobCardId: entry.jobCardId,
            rollId: roll.id,
            label,
            barcode: roll.barcode ?? "",
            structure: roll.item_name ?? roll.itemName ?? "",
            weightKg: roll.netweight != null ? Number(roll.netweight) : null,
            balanceKg,
            wastageKg,
        });
    };
    const handleEclCloseWithoutOutput = async () => {
        const target = eclCloseTarget;
        if (!target)
            return;
        try {
            setEclCreateChildLoading(true);
            setEclCreateChildMessage(null);
            await closeRollWithoutOutput(target.jobCardId, {
                rollId: target.rollId,
                wastage: target.wastageKg,
                balanceWeight: target.balanceKg != null && target.balanceKg > 0 ? target.balanceKg : undefined,
            });
            const role = getEclParentRole(eclLoadedRolls.find((entry) => entry.roll.id === target.rollId)?.roll.stage);
            setEclAddRollForm((prev) => {
                if (!prev)
                    return prev;
                if (role === "wip") {
                    return { ...prev, wipWastage: "0", wipBalance: "", wipSemiConsumed: false };
                }
                if (role === "rm") {
                    return { ...prev, rmWastage: "0", rmBalance: "", rmSemiConsumed: false };
                }
                return prev;
            });
            setEclCloseTarget(null);
            setEclCreateChildMessage(`${target.label} consumed. It will be a parent of the next output roll.`);
            setEclClosedRefreshKey((key) => key + 1);
            setEclRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setEclCreateChildMessage(jobCardApiErrorMessage(error, "Could not close this roll."));
            throw error;
        }
        finally {
            setEclCreateChildLoading(false);
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
    const handleEclProducedRollReprint = async (r) => {
        const wo = eclSelectedWo;
        if (!wo || !wipPrintingTemplate)
            return;
        try {
            setEclCreateChildLoading(true);
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
                    inkGsm: r.inkGsm,
                    trimWastage: r.trimWastage,
                    lumpsWastage: r.lumpsWastage,
                    eclOutputWastage: r.eclOutputWastage,
                    operatorName: r.operatorName,
                    shift: r.shift,
                    remark: r.remark,
                    itemName: wo.itemName ?? r.itemName ?? null,
                },
            };
            const job = await createPrintJob({
                name: `ECL Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
                template_id: wipPrintingTemplate.id,
                data: printData,
                copies: 1,
            });
            setEclCreateChildMessage("Label reprint sent to printer.");
            pollPrintJob(job.id);
        }
        catch {
            setEclCreateChildMessage("Failed to send reprint to printer.");
        }
        finally {
            setEclCreateChildLoading(false);
        }
    };
    const refreshEclProducedRolls = () => {
        if (!eclSelectedWo)
            return;
        getRollsStockByWorkOrder(eclSelectedWo.id, "wip_ecl").then(setEclChildRollsFromDb);
        setEclRollsRefreshKey((key) => key + 1);
    };
    const openEclProducedEdit = (roll) => {
        const { input1, input2 } = pickEclProducedParents(roll.parentRolls, getEclParentRole);
        setEclEditForm({
            netweight: roll.netweight != null ? String(roll.netweight) : "",
            inkGsm: roll.inkGsm != null ? String(roll.inkGsm) : "",
            trimWastage: roll.trimWastage != null ? String(roll.trimWastage) : "",
            lumpsWastage: roll.lumpsWastage != null ? String(roll.lumpsWastage) : "",
            eclOutputWastage: roll.eclOutputWastage != null ? String(roll.eclOutputWastage) : "",
            operatorName: roll.operatorName ?? "",
            shift: roll.shift ?? "",
            input1Id: input1?.id ?? null,
            input2Id: input2?.id ?? null,
            input1Balance: input1?.balanceWeight != null ? String(input1.balanceWeight) : "",
            input2Balance: input2?.balanceWeight != null ? String(input2.balanceWeight) : "",
        });
        setEclEditRoll(roll);
    };
    const handleEclProducedRollDelete = async (row) => {
        if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM))
            return;
        try {
            setEclCreateChildLoading(true);
            await deleteProducedRoll(row.id);
            setEclCreateChildMessage("Produced roll deleted.");
            if (eclEditRoll?.id === row.id)
                setEclEditRoll(null);
            refreshEclProducedRolls();
        }
        catch (error) {
            setEclCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."));
        }
        finally {
            setEclCreateChildLoading(false);
        }
    };
    const handleSaveEclProducedEdit = async () => {
        const roll = eclEditRoll;
        if (!roll?.id)
            return;
        const parentRollIds = [eclEditForm.input1Id, eclEditForm.input2Id].filter((id) => id != null);
        const netweight = parseNonNegativeDecimal(eclEditForm.netweight);
        try {
            setEclEditSaving(true);
            await updateProducedRoll(roll.id, {
                netweight,
                grossweight: netweight,
                inkGsm: parseNonNegativeDecimal(eclEditForm.inkGsm),
                trimWastage: parseNonNegativeDecimal(eclEditForm.trimWastage),
                lumpsWastage: parseNonNegativeDecimal(eclEditForm.lumpsWastage),
                eclOutputWastage: parseNonNegativeDecimal(eclEditForm.eclOutputWastage),
                operatorName: eclEditForm.operatorName.trim() || null,
                shift: eclEditForm.shift.trim() || null,
                parentRollIds,
                parentBalanceWeights: parentRollIds.map((id) => id === eclEditForm.input1Id
                    ? parseNonNegativeDecimal(eclEditForm.input1Balance) ?? 0
                    : parseNonNegativeDecimal(eclEditForm.input2Balance) ?? 0),
            });
            setEclCreateChildMessage("Produced roll updated.");
            setEclEditRoll(null);
            refreshEclProducedRolls();
        }
        catch (error) {
            setEclCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."));
        }
        finally {
            setEclEditSaving(false);
        }
    };
    const eclProducedRollColumns = useMemo(() => [
        eclInputGroupColumns("input1", input1Label, (row) => parentsForProducedColumn(row.parentRolls, getEclParentRole, "wip")),
        eclInputGroupColumns("input2", input2Label, (row) => parentsForProducedColumn(row.parentRolls, getEclParentRole, "rm")),
        eclExtrusionGroupColumns(),
        asSingleColumnGroup("netweightGroup", {
            accessorKey: "netweight",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Output weight (kg)", column: column, placeholder: "Filter output weight..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-" })),
            filterFn: includesStringFilterFn,
        }),
        asSingleColumnGroup("operatorNameGroup", {
            accessorKey: "operatorName",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Operator name", column: column, placeholder: "Filter operator..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.operatorName) })),
            filterFn: includesStringFilterFn,
        }),
        asSingleColumnGroup("shiftGroup", {
            accessorKey: "shift",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Shift", column: column, placeholder: "Filter shift..." })),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: displayValue(row.original.shift) })),
            filterFn: includesStringFilterFn,
        }),
        asSingleColumnGroup("actionsGroup", {
            id: "actions",
            header: () => _jsx("div", { className: "text-left", children: "Actions" }),
            cell: ({ row }) => (_jsx(ProducedRollRowActions, { reprintDisabled: !wipPrintingTemplate || eclCreateChildLoading, mutateDisabled: eclCreateChildLoading || isProducedRollLocked(row.original), onReprint: () => handleEclProducedRollReprint(row.original), onEdit: () => openEclProducedEdit(row.original), onDelete: () => void handleEclProducedRollDelete(row.original) })),
        }),
    ], [wipPrintingTemplate, eclCreateChildLoading, eclSelectedWo, input1Label, input2Label, getEclParentRole]);
    const getEclProducedRowGroupPath = useMemo(() => createDualInputGroupPathGetter(eclChildRollsFromDb, (row) => {
        const { input1, input2 } = pickEclProducedParents(row.parentRolls, getEclParentRole);
        return { input1Id: input1?.id ?? null, input2Id: input2?.id ?? null };
    }), [eclChildRollsFromDb, getEclParentRole]);
    const eclLoadedFilmRows = useMemo(() => {
        const byJob = new Map();
        for (const entry of eclLoadedRolls) {
            const existing = byJob.get(entry.jobCardId) ?? {
                jobCardId: entry.jobCardId,
                jobCardNumber: entry.jobCardNumber,
                input1: null,
                input2: null,
            };
            const role = getEclParentRole(entry.roll.stage);
            if (role === "wip")
                existing.input1 = entry;
            else if (role === "rm")
                existing.input2 = entry;
            byJob.set(entry.jobCardId, existing);
        }
        return Array.from(byJob.values());
    }, [eclLoadedRolls, getEclParentRole]);
    const eclClosedWithoutOutputRows = useMemo(() => {
        return eclClosedRolls.map((roll) => {
            const role = getEclParentRole(roll.stage);
            const label = role === "wip" ? input1Label : role === "rm" ? input2Label : "Film";
            return {
                id: roll.id,
                jobCardId: roll.jobCardId,
                jobCardNumber: roll.jobCardNumber,
                label,
                structure: roll.itemName || "—",
                weightLabel: roll.netweight != null ? `${Number(roll.netweight).toFixed(2)} kg` : "—",
                wastageLabel: roll.wastage != null ? `${Number(roll.wastage).toFixed(2)} kg` : "—",
                balanceLabel: roll.balanceWeight != null ? `${Number(roll.balanceWeight).toFixed(2)} kg` : "—",
            };
        });
    }, [eclClosedRolls, getEclParentRole, input1Label, input2Label]);
    const handleEclUndoConsumed = async (row) => {
        try {
            setEclCreateChildLoading(true);
            setEclCreateChildMessage(null);
            await undoCloseWithoutOutput(row.jobCardId, row.id);
            setEclCreateChildMessage("Consume undone. The film is back in stock.");
            setEclClosedRefreshKey((key) => key + 1);
            setEclRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setEclCreateChildMessage(jobCardApiErrorMessage(error, "Could not undo this consume."));
        }
        finally {
            setEclCreateChildLoading(false);
        }
    };
    const renderLoadSlot = (role, barcode, setBarcode, onSelectStock, stockLoading) => {
        const title = role === "wip" ? input1Label : input2Label;
        const placeholder = role === "wip" ? `Scan ${input1Label} barcode` : `Scan ${input2Label} barcode`;
        return (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: [title, ": not loaded yet."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative min-w-[min(100%,16rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { type: "text", placeholder: placeholder, value: barcode, onChange: (e) => {
                                        setBarcode(e.target.value);
                                        setFloorEclBarcodeError(null);
                                    }, onKeyDown: (e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            void applyFloorEclFromBarcode(barcode, { slot: role });
                                        }
                                    }, disabled: floorEclBarcodeChecking, className: "pl-9", autoComplete: "off" })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: floorEclBarcodeChecking || stockLoading, onClick: () => void onSelectStock(), children: "Select Stock" })] })] }));
    };
    const stockPickers = (_jsxs(_Fragment, { children: [floorEclWipPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsxs(CardTitle, { children: ["Select ", input1Label] }), _jsx(CardDescription, { children: isOperationSkipped(eclSelectedWo?.skippedOperations, "Inspection")
                                                ? "Inspection is skipped on this work order, so load a WIP Printing roll as Input 1."
                                                : "Load a WIP Inspection roll as Input 1." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorEclWipPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorEclWipRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorEclWipRollsError && _jsx("p", { className: "text-sm text-red-500 mb-3", children: floorEclWipRollsError }), _jsx(DataTable, { columns: floorEclWipStockColumns, data: floorEclWipRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorEclBarcodeChecking, onClick: async () => {
                                                const selected = selectedRows[0];
                                                const barcode = selected?.barcode?.trim();
                                                if (!barcode)
                                                    return;
                                                await applyFloorEclFromBarcode(barcode, { closePicker: true, slot: "wip" });
                                            }, children: floorEclBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, "floor-ecl-wip-picker")] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorEclWipPicker, children: "Close" }) }) })] }) })), floorEclRmPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsxs(CardTitle, { children: ["Select ", input2Label] }), _jsx(CardDescription, { children: "Pick a virgin RM or RM Balance film as Input 2." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorEclRmPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorEclRmRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorEclRmRollsError && _jsx("p", { className: "text-sm text-red-500 mb-3", children: floorEclRmRollsError }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { asChild: true, variant: rmFilmItemFilter === "all" ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter("all"), children: "All" }) }), rmFilmItemBadges.map((itemCode) => (_jsx(Badge, { asChild: true, variant: rmFilmItemFilter.toLowerCase() === itemCode.toLowerCase() ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter(itemCode), children: itemCode }) }, itemCode)))] }), _jsx("div", { className: "flex flex-wrap gap-2 ml-auto", children: [
                                                    { value: "all", label: "ALL" },
                                                    { value: "virgin_rm", label: "RM Virgin" },
                                                    { value: "rm_balance", label: "RM Balance" },
                                                ].map((warehouse) => (_jsx(Badge, { asChild: true, variant: rmFilmWarehouseFilter === warehouse.value ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmWarehouseFilter(warehouse.value), children: warehouse.label }) }, warehouse.value))) })] }), _jsx(DataTable, { columns: floorEclRmStockColumns, data: filteredFloorEclRmRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorEclBarcodeChecking, onClick: async () => {
                                                const selected = selectedRows[0];
                                                const barcode = selected?.barcode?.trim();
                                                if (!barcode)
                                                    return;
                                                await applyFloorEclFromBarcode(barcode, { closePicker: true, slot: "rm" });
                                            }, children: floorEclBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, `floor-ecl-rm-picker-${rmFilmItemFilter}-${rmFilmWarehouseFilter}`)] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorEclRmPicker, children: "Close" }) }) })] }) }))] }));
    return (_jsxs(_Fragment, { children: [eclSelectedWo ? (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { className: "flex flex-col-reverse gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1", children: "Loaded films" }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3", children: ["ECL needs two films on the same job card: ", input1Label, " and ", input2Label, ". Extrusion coating weight is entered when producing. Consume uses a film before the output exists. X returns a film to stock."] }), eclRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : (_jsxs("div", { className: "space-y-3", children: [!wipParent &&
                                                renderLoadSlot("wip", floorEclDetailWipBarcode, setFloorEclDetailWipBarcode, openFloorEclWipPicker, floorEclWipRollsLoading), !rmParent &&
                                                renderLoadSlot("rm", floorEclDetailRmBarcode, setFloorEclDetailRmBarcode, openFloorEclRmPicker, floorEclRmRollsLoading), floorEclBarcodeError && _jsx("p", { className: "text-sm text-red-500", children: floorEclBarcodeError }), bothParentsLoaded && !sameJobCard && (_jsx("p", { className: "text-sm text-amber-600 dark:text-amber-400", children: "Both films must be loaded on the same ECL job card before producing." })), eclLoadedFilmRows.length > 0 && (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsxs("thead", { children: [_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { rowSpan: 2, className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle", children: "Job card" }), _jsx("th", { colSpan: 8, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: input1Label }), _jsx("th", { colSpan: 8, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: input2Label })] }), _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map((title, i) => (_jsx("th", { className: `text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`, children: title }, `input1-${title || "remove"}`))), ["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map((title, i) => (_jsx("th", { className: `text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}`, children: title }, `input2-${title || "remove"}`)))] })] }), _jsx("tbody", { children: eclLoadedFilmRows.map((row) => {
                                                                const canEditRow = canProduce && Boolean(eclAddRollForm);
                                                                return (_jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50 last:border-0", children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: row.jobCardNumber }), loadedFilmCells(row.input1, {
                                                                            canEdit: canEditRow,
                                                                            wastage: eclAddRollForm?.wipWastage ?? "0",
                                                                            balance: eclAddRollForm?.wipBalance ?? "",
                                                                            semiConsumed: Boolean(eclAddRollForm?.wipSemiConsumed),
                                                                            onWastage: (value) => setEclAddRollForm((prev) => prev ? { ...prev, wipWastage: value } : prev),
                                                                            onBalance: (value) => setEclAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    wipBalance: value,
                                                                                    wipSemiConsumed: parseNonNegativeDecimal(value) != null ? false : prev.wipSemiConsumed,
                                                                                }
                                                                                : prev),
                                                                            onSemiConsumed: (checked) => setEclAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    wipSemiConsumed: checked,
                                                                                    wipBalance: checked ? "" : prev.wipBalance,
                                                                                }
                                                                                : prev),
                                                                            onUnload: handleUnloadEclRoll,
                                                                            onCloseWithoutOutput: () => {
                                                                                if (!row.input1 || eclAddRollForm?.wipSemiConsumed)
                                                                                    return;
                                                                                openEclCloseWithoutOutput(row.input1, input1Label, {
                                                                                    wastage: eclAddRollForm?.wipWastage ?? "0",
                                                                                    balance: eclAddRollForm?.wipBalance ?? "",
                                                                                });
                                                                            },
                                                                            unloadDisabled: eclCreateChildLoading,
                                                                            consumeOpen: eclCloseTarget?.rollId === row.input1?.roll?.id,
                                                                        }), loadedFilmCells(row.input2, {
                                                                            canEdit: canEditRow,
                                                                            wastage: eclAddRollForm?.rmWastage ?? "0",
                                                                            balance: eclAddRollForm?.rmBalance ?? "",
                                                                            semiConsumed: Boolean(eclAddRollForm?.rmSemiConsumed),
                                                                            onWastage: (value) => setEclAddRollForm((prev) => prev ? { ...prev, rmWastage: value } : prev),
                                                                            onBalance: (value) => setEclAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    rmBalance: value,
                                                                                    rmSemiConsumed: parseNonNegativeDecimal(value) != null ? false : prev.rmSemiConsumed,
                                                                                }
                                                                                : prev),
                                                                            onSemiConsumed: (checked) => setEclAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    rmSemiConsumed: checked,
                                                                                    rmBalance: checked ? "" : prev.rmBalance,
                                                                                }
                                                                                : prev),
                                                                            onUnload: handleUnloadEclRoll,
                                                                            onCloseWithoutOutput: () => {
                                                                                if (!row.input2 || eclAddRollForm?.rmSemiConsumed)
                                                                                    return;
                                                                                openEclCloseWithoutOutput(row.input2, input2Label, {
                                                                                    wastage: eclAddRollForm?.rmWastage ?? "0",
                                                                                    balance: eclAddRollForm?.rmBalance ?? "",
                                                                                });
                                                                            },
                                                                            unloadDisabled: eclCreateChildLoading,
                                                                            consumeOpen: eclCloseTarget?.rollId === row.input2?.roll?.id,
                                                                        })] }, row.jobCardId));
                                                            }) })] }) })), canProduce && eclAddRollForm && (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Extrusion coating (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Trim wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Lumps wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "ECL output wastage (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Operator name" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Shift" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Remark" })] }) }), _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-24 px-1.5 text-xs", value: eclAddRollForm.extrusionKg, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, extrusionKg: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: eclAddRollForm.trimWastage, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, trimWastage: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: eclAddRollForm.lumpsWastage, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, lumpsWastage: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: eclAddRollForm.eclOutputWastage, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, eclOutputWastage: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-24 px-1.5 text-xs", value: eclAddRollForm.netweight, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, netweight: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsxs(Select, { value: eclAddRollForm.operatorName && eclOperators.includes(eclAddRollForm.operatorName)
                                                                                ? eclAddRollForm.operatorName
                                                                                : undefined, onValueChange: (value) => setEclAddRollForm((prev) => prev ? { ...prev, operatorName: value } : prev), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-36 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Select" }) }), _jsx(SelectContent, { children: eclOperators.map((name) => (_jsx(SelectItem, { value: name, children: name }, name))) })] }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsxs(Select, { value: eclAddRollForm.shift || undefined, onValueChange: (value) => setEclAddRollForm((prev) => (prev ? { ...prev, shift: value } : prev)), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-16 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: ECL_SHIFTS.map((shiftOption) => (_jsx(SelectItem, { value: shiftOption, children: shiftOption }, shiftOption))) })] }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(Input, { type: "text", className: "h-7 w-32 px-1.5 text-xs", value: eclAddRollForm.remark, onChange: (e) => setEclAddRollForm((prev) => prev ? { ...prev, remark: e.target.value } : prev) }) })] }) })] }) }))] }))] }), _jsx(ClosedWithoutOutputList, { rows: eclClosedWithoutOutputRows, undoing: eclCreateChildLoading, onUndo: (row) => void handleEclUndoConsumed(row) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Produced rolls" }), !eclChildRollsLoading && (_jsx("div", { className: "rounded-[2px] border border-zinc-600 overflow-hidden", children: _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total produced rolls" }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: eclProducedTotals.rollCount }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total output weight (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: [eclProducedTotals.netWeight.toFixed(2), " kg"] }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold", children: [eclProducedTotals.wastage.toFixed(2), " kg"] })] }) }) }) }))] }), eclChildRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading rolls\u2026" })) : eclChildRollsFromDb.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No produced rolls found for this work order." })) : (_jsx(DataTable, { columns: eclProducedRollColumns, data: eclChildRollsFromDb, getRowGroupPath: getEclProducedRowGroupPath, scrollable: true, scrollHeight: "45vh", compact: true, size: "xs", showSelectionSummary: false }))] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap", children: [!eclRollsLoading && canProduce && eclAddRollForm && (_jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: eclCreateChildLoading ||
                                    !hasSemiConsumeChoice(eclAddRollForm.wipBalance, eclAddRollForm.wipSemiConsumed) ||
                                    !hasSemiConsumeChoice(eclAddRollForm.rmBalance, eclAddRollForm.rmSemiConsumed) ||
                                    eclFormCommittedForRollId === eclAddRollForm.roll.id, onClick: async () => {
                                    const form = eclAddRollForm;
                                    const wo = eclSelectedWo;
                                    if (!form || wo?.itemId == null || !wipParent || !rmParent)
                                        return;
                                    if (wipParent.jobCardId !== rmParent.jobCardId) {
                                        setEclCreateChildMessage("Both films must be on the same ECL job card.");
                                        return;
                                    }
                                    try {
                                        setEclCreateChildLoading(true);
                                        setEclCreateChildMessage(null);
                                        const pendingParentIds = eclClosedRolls
                                            .filter((roll) => roll.jobCardId === form.jobCardId)
                                            .map((roll) => roll.id)
                                            .filter((id) => id !== wipParent.roll.id && id !== rmParent.roll.id);
                                        const parentIds = [wipParent.roll.id, rmParent.roll.id, ...pendingParentIds];
                                        const wipSemiConsumed = Boolean(form.wipSemiConsumed);
                                        const rmSemiConsumed = Boolean(form.rmSemiConsumed);
                                        const wipBalanceValue = wipSemiConsumed ? null : parseNonNegativeDecimal(form.wipBalance || "");
                                        const rmBalanceValue = rmSemiConsumed ? null : parseNonNegativeDecimal(form.rmBalance || "");
                                        if ((!wipSemiConsumed && wipBalanceValue == null) || (!rmSemiConsumed && rmBalanceValue == null)) {
                                            setEclCreateChildMessage("Enter balance weight or tick Roll continue for both films.");
                                            return;
                                        }
                                        const outputWeight = parseNonNegativeDecimal(form.netweight || "") ?? undefined;
                                        const extrusionKg = parseNonNegativeDecimal(form.extrusionKg || "") ?? undefined;
                                        const trimWastage = parseNonNegativeDecimal(form.trimWastage || "") ?? 0;
                                        const lumpsWastage = parseNonNegativeDecimal(form.lumpsWastage || "") ?? 0;
                                        const eclOutputWastage = parseNonNegativeDecimal(form.eclOutputWastage || "") ?? 0;
                                        const wipWastage = parseNonNegativeDecimal(form.wipWastage || "") ?? 0;
                                        const rmWastage = parseNonNegativeDecimal(form.rmWastage || "") ?? 0;
                                        const totalWastage = wipWastage + rmWastage + trimWastage + lumpsWastage + eclOutputWastage;
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
                                                    wastage: totalWastage,
                                                    inkGsm: extrusionKg,
                                                    trimWastage,
                                                    lumpsWastage,
                                                    eclOutputWastage,
                                                    operatorName: form.operatorName || undefined,
                                                    shift: form.shift || undefined,
                                                    remark: form.remark || undefined,
                                                    itemName: wo.itemName ?? null,
                                                },
                                            };
                                            const job = await createPrintJob({
                                                name: `ECL - ${form.jobCardNumber}`,
                                                template_id: wipPrintingTemplate.id,
                                                data: printData,
                                                copies: 1,
                                            });
                                            pollPrintJob(job.id);
                                        }
                                        await addEclRoll(form.jobCardId, {
                                            itemId: wo.itemId,
                                            rollno: "",
                                            size: form.size ? parseFloat(form.size) : undefined,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            netweight: outputWeight,
                                            grossweight: outputWeight,
                                            wastage: totalWastage,
                                            operatorName: form.operatorName.trim() || undefined,
                                            shift: form.shift.trim() || undefined,
                                            remark: form.remark.trim() || undefined,
                                            inkGsm: extrusionKg,
                                            trimWastage,
                                            lumpsWastage,
                                            eclOutputWastage,
                                            gradeId: form.parent.gradeId,
                                            parentRollIds: parentIds,
                                            parentBalanceWeights: [
                                                wipBalanceValue,
                                                rmBalanceValue,
                                                ...pendingParentIds.map(() => null),
                                            ],
                                            parentWastages: [wipWastage, rmWastage, ...pendingParentIds.map(() => null)],
                                            parentSemiConsumed: [
                                                wipSemiConsumed,
                                                rmSemiConsumed,
                                                ...pendingParentIds.map(() => true),
                                            ],
                                            weightAtTime: outputWeight,
                                        });
                                        getRollsStockByWorkOrder(wo.id, "wip_ecl").then(setEclChildRollsFromDb);
                                        if (wipSemiConsumed || rmSemiConsumed) {
                                            setEclFormCommittedForRollId(null);
                                            setEclAddRollForm((prev) => prev
                                                ? {
                                                    ...prev,
                                                    netweight: "",
                                                    extrusionKg: "",
                                                    trimWastage: "0",
                                                    lumpsWastage: "0",
                                                    eclOutputWastage: "0",
                                                    wipWastage: "0",
                                                    rmWastage: "0",
                                                    wipBalance: wipSemiConsumed ? "" : prev.wipBalance,
                                                    rmBalance: rmSemiConsumed ? "" : prev.rmBalance,
                                                    wipSemiConsumed: false,
                                                    rmSemiConsumed: false,
                                                    remark: "",
                                                }
                                                : prev);
                                            setEclCreateChildMessage("ECL roll created. Roll continue films kept on the machine.");
                                        }
                                        else {
                                            setEclFormCommittedForRollId(form.roll.id);
                                            setEclCreateChildMessage(wipPrintingTemplate
                                                ? "Roll added and label sent to printer."
                                                : "Roll added and movement recorded. No WIP printing template configured.");
                                        }
                                        setEclRollsRefreshKey((key) => key + 1);
                                        setEclClosedRefreshKey((key) => key + 1);
                                    }
                                    catch {
                                        setEclCreateChildMessage(wipPrintingTemplate
                                            ? "Failed to print label. Roll not added or movement not recorded."
                                            : "Failed to add roll or record movement.");
                                    }
                                    finally {
                                        setEclCreateChildLoading(false);
                                    }
                                }, children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] })), eclCreateChildMessage && (_jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: eclCreateChildMessage }))] }), stockPickers] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 space-y-1", children: [_jsxs(Label, { htmlFor: "floor-ecl-barcode", className: "text-xs text-gray-600 dark:text-gray-400", children: ["Barcode (", input1Label, ")"] }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: ["Load ", input1Label, " first to open the work order, then load ", input2Label, "."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 max-w-2xl", children: [_jsxs("div", { className: "relative min-w-[min(100%,18rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "floor-ecl-barcode", type: "text", placeholder: `Scan or enter ${input1Label} barcode`, value: floorEclBarcode, onChange: (e) => {
                                                    setFloorEclBarcode(e.target.value);
                                                    setFloorEclBarcodeError(null);
                                                }, onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        void handleFloorEclBarcodeSubmit();
                                                    }
                                                }, disabled: floorEclBarcodeChecking, className: "pl-9", autoComplete: "off" })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", className: "whitespace-nowrap", disabled: floorEclBarcodeChecking || floorEclWipRollsLoading, onClick: () => void openFloorEclWipPicker(), children: "Select Stock" })] }), floorEclBarcodeError && _jsx("p", { className: "text-sm text-red-500", children: floorEclBarcodeError })] }), stockPickers, eclLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : eclError ? (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: eclError })) : eclWorkOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No work orders found." })) : (_jsx(DataTable, { columns: floorWorkOrderColumns, data: eclWorkOrders, getRowId: (row) => String(row.id), onRowClick: (wo) => setEclSelectedWo(wo), scrollable: true, scrollHeight: "65vh", showSelectionSummary: false }))] })), _jsx(CloseWithoutOutputDialog, { target: eclCloseTarget, saving: eclCreateChildLoading, onOpenChange: (open) => {
                    if (!open)
                        setEclCloseTarget(null);
                }, onConfirm: handleEclCloseWithoutOutput }), _jsx(Dialog, { open: Boolean(eclEditRoll), onOpenChange: (open) => { if (!open)
                    setEclEditRoll(null); }, children: _jsxs(DialogContent, { className: producedRollEditDialogClassName, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit produced roll" }), _jsx(DialogDescription, { children: "Update ECL output fields and leftover balance weights." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(ProducedRollEditField, { label: "Output weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.netweight, onValueChange: (netweight) => setEclEditForm((prev) => ({ ...prev, netweight })) }) }), _jsx(ProducedRollEditField, { label: "Extrusion coating (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.inkGsm, onValueChange: (inkGsm) => setEclEditForm((prev) => ({ ...prev, inkGsm })) }) }), _jsx(ProducedRollEditField, { label: "Trim wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.trimWastage, onValueChange: (trimWastage) => setEclEditForm((prev) => ({ ...prev, trimWastage })) }) }), _jsx(ProducedRollEditField, { label: "Lumps wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.lumpsWastage, onValueChange: (lumpsWastage) => setEclEditForm((prev) => ({ ...prev, lumpsWastage })) }) }), _jsx(ProducedRollEditField, { label: "ECL output wastage (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.eclOutputWastage, onValueChange: (eclOutputWastage) => setEclEditForm((prev) => ({ ...prev, eclOutputWastage })) }) }), _jsx(ProducedRollEditField, { label: "Shift", children: _jsxs(Select, { value: eclEditForm.shift || undefined, onValueChange: (shift) => setEclEditForm((prev) => ({ ...prev, shift })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: ECL_SHIFTS.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }) }), _jsx(ProducedRollEditField, { label: "Operator name", className: "col-span-2", children: _jsx(Input, { value: eclEditForm.operatorName, onChange: (e) => setEclEditForm((prev) => ({ ...prev, operatorName: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: `${input1Label} balance (kg)`, children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.input1Balance, onValueChange: (input1Balance) => setEclEditForm((prev) => ({ ...prev, input1Balance })) }) }), _jsx(ProducedRollEditField, { label: `${input2Label} balance (kg)`, children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: eclEditForm.input2Balance, onValueChange: (input2Balance) => setEclEditForm((prev) => ({ ...prev, input2Balance })) }) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setEclEditRoll(null), children: "Cancel" }), _jsx(Button, { type: "button", disabled: eclEditSaving, onClick: () => void handleSaveEclProducedEdit(), children: "Save" })] })] }) })] }));
}
