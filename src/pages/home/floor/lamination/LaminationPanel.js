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
const LAMINATION_SHIFTS = ["A", "B"];
const RM_FILM_GROUP = "rm film";
function displayValue(value) {
    if (value == null || value === "")
        return "-";
    return String(value);
}
function displayStructure(value) {
    const text = value == null || value === "" ? "" : String(value);
    if (!text)
        return _jsx("span", { children: "\u2014" });
    const shown = text.length > 7 ? `${text.slice(0, 7)}...` : text;
    return (_jsx("span", { className: "inline-block max-w-[4.75rem] whitespace-nowrap", title: text, children: shown }));
}
function outputMeterFromParent(outputKg, parent) {
    if (outputKg == null || !(outputKg >= 0) || !parent)
        return "";
    const parentKg = Number(parent.netweight);
    const parentMeter = Number(parent.meter);
    if (!(parentKg > 0) || !(parentMeter > 0))
        return "";
    return String(Math.round(parentMeter * (outputKg / parentKg)));
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
function renderParentLines(parents, render) {
    if (parents.length === 0)
        return _jsx("div", { children: "-" });
    return (_jsx("div", { className: "space-y-0.5", children: parents.map((parent) => (_jsx("div", { children: render(parent) }, parent.id))) }));
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
                size: 80,
                minSize: 72,
                maxSize: 88,
                cell: ({ row }) => renderParentLines(pickAll(row.original), (parent) => displayStructure(parent.itemName)),
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
function displayMeter(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) || n <= 0 ? "-" : `${Math.round(n)} m`;
}
function displayOhPercent(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) ? "-" : `${n.toFixed(2)} %`;
}
function displayDecimal(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) ? "-" : n.toFixed(2);
}
function laminationOutputGroupColumns() {
    return {
        id: "output",
        header: () => _jsx("div", { className: "text-center w-full", children: "Output" }),
        columns: [
            {
                accessorKey: "netweight",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Output weight (kg)", column: column, placeholder: "Filter output weight..." })),
                cell: ({ row }) => (_jsx("div", { children: row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-" })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "meter",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Output meter", column: column, placeholder: "Filter output meter..." })),
                cell: ({ row }) => _jsx("div", { children: displayMeter(row.original.meter) }),
                filterFn: includesStringFilterFn,
            },
        ],
    };
}
function laminationAdhesiveGroupColumns() {
    return {
        id: "adhesive",
        header: () => _jsx("div", { className: "text-center w-full", children: "Adhesive" }),
        columns: [
            {
                accessorKey: "adhesiveOh",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Adhesive OH", column: column, placeholder: "Filter adhesive OH..." })),
                cell: ({ row }) => (_jsx("div", { children: displayDecimal(row.original.adhesiveOh) })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "adhesiveNco",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "Adhesive NCO", column: column, placeholder: "Filter adhesive NCO..." })),
                cell: ({ row }) => (_jsx("div", { children: displayDecimal(row.original.adhesiveNco) })),
                filterFn: includesStringFilterFn,
            },
            {
                accessorKey: "ohPercent",
                header: ({ column }) => (_jsx(ColumnHeader, { title: "OH %", column: column, placeholder: "Filter OH %..." })),
                cell: ({ row }) => _jsx("div", { children: displayOhPercent(row.original.ohPercent) }),
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
    return (_jsxs(_Fragment, { children: [_jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: displayStructure(roll.item_name ?? roll.itemName) }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.size != null ? String(roll.size) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: roll.micron != null ? String(roll.micron) : "—" }), _jsx("td", { className: "py-1.5 px-2 text-gray-600 dark:text-gray-400", children: formatWeightWithMeter(roll.netweight, roll.meter) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !opts.canEdit, value: opts.wastage, onValueChange: opts.onWastage }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(NonNegativeDecimalInput, { disabled: !opts.canEdit || opts.semiConsumed, value: opts.semiConsumed ? "" : opts.balance, onValueChange: opts.onBalance }) }), _jsx("td", { className: "py-1.5 px-2", onClick: (e) => e.stopPropagation(), children: _jsx(Checkbox, { checked: opts.semiConsumed, disabled: !opts.canEdit || opts.unloadDisabled || opts.consumeOpen, "aria-label": "Roll continue", title: opts.consumeOpen
                        ? "This film is being consumed"
                        : "Keep this roll loaded; do not create a balance roll", onCheckedChange: (checked) => opts.onSemiConsumed(checked === true) }) }), _jsxs("td", { className: "py-1.5 px-2 text-right whitespace-nowrap", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-6 px-1.5 text-xs", title: opts.semiConsumed
                            ? "Uncheck Roll continue to consume this film"
                            : "Use this film now. It becomes a parent when the output roll is created", disabled: opts.unloadDisabled || opts.semiConsumed, onClick: opts.onCloseWithoutOutput, children: "Consume" }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", title: "Remove loaded roll and return it to stock", disabled: opts.unloadDisabled, onClick: () => void opts.onUnload(entry.jobCardId, roll.id), children: _jsx(X, { className: "h-4 w-4" }) })] })] }));
}
export function LaminationPanel(props) {
    const { laminationSelectedWo, laminationRollsLoading, laminationLoadedRolls, laminationAddRollForm, laminationCreateChildLoading, setLaminationCreateChildLoading, setLaminationCreateChildMessage, setLaminationAddRollForm, laminationChildRollsLoading, laminationChildRollsFromDb, wipPrintingTemplate, createPrintJob, getPrintJob, setPrintingPrintStatus, laminationFormCommittedForRollId, addLaminationRoll, setLaminationFormCommittedForRollId, setLaminationChildRollsFromDb, getRollsStockByWorkOrder, setLaminationRollsRefreshKey, laminationCreateChildMessage, floorLaminationBarcode, setFloorLaminationBarcode, setFloorLaminationBarcodeError, floorLaminationBarcodeChecking, handleFloorLaminationBarcodeSubmit, floorLaminationWipRollsLoading, openFloorLaminationWipPicker, floorLaminationBarcodeError, floorLaminationWipPickerOpen, closeFloorLaminationWipPicker, floorLaminationWipRollsError, floorLaminationWipStockColumns, floorLaminationWipRolls, floorLaminationRmPickerOpen, closeFloorLaminationRmPicker, floorLaminationRmRollsLoading, floorLaminationRmRollsError, floorLaminationRmStockColumns, floorLaminationRmRolls, openFloorLaminationRmPicker, floorLaminationDetailWipBarcode, setFloorLaminationDetailWipBarcode, floorLaminationDetailRmBarcode, setFloorLaminationDetailRmBarcode, applyFloorLaminationFromBarcode, getLaminationParentRole, laminationLoading, laminationError, laminationWorkOrders, setLaminationSelectedWo, unloadFloorLoadedRoll, onSkipWorkOrder, } = props;
    const [laminationOperators, setLaminationOperators] = useState([]);
    const [rmFilmItemFilter, setRmFilmItemFilter] = useState("all");
    const [rmFilmWarehouseFilter, setRmFilmWarehouseFilter] = useState("all");
    const [rmFilmItems, setRmFilmItems] = useState([]);
    const [laminationEditRoll, setLaminationEditRoll] = useState(null);
    const [laminationEditSaving, setLaminationEditSaving] = useState(false);
    const [laminationCloseTarget, setLaminationCloseTarget] = useState(null);
    const [laminationClosedRolls, setLaminationClosedRolls] = useState([]);
    const [laminationClosedRefreshKey, setLaminationClosedRefreshKey] = useState(0);
    const [laminationEditForm, setLaminationEditForm] = useState({
        netweight: "",
        meter: "",
        adhesiveOh: "",
        adhesiveNco: "",
        ohPercent: "",
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
                .filter((op) => (op.operation ?? "").toLowerCase() === "lamination")
                .map((op) => op.operatorName.trim())
                .filter(Boolean);
            setLaminationOperators(Array.from(new Set(names)));
        })
            .catch(() => {
            if (!cancelled)
                setLaminationOperators([]);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        if (!laminationAddRollForm)
            return;
        const current = laminationAddRollForm.operatorName?.trim() ?? "";
        if (current && laminationOperators.includes(current))
            return;
        const next = laminationOperators[0] ?? "";
        if (current === next)
            return;
        setLaminationAddRollForm((prev) => (prev ? { ...prev, operatorName: next } : prev));
    }, [laminationOperators, laminationAddRollForm?.roll?.id]);
    useEffect(() => {
        if (!floorLaminationRmPickerOpen) {
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
    }, [floorLaminationRmPickerOpen]);
    const rmFilmItemBadges = useMemo(() => {
        const fromMaster = rmFilmItems
            .map((item) => (item.item_code || item.name || "").trim())
            .filter(Boolean);
        if (fromMaster.length > 0)
            return fromMaster;
        const unique = new Map();
        for (const roll of floorLaminationRmRolls) {
            const code = (roll.itemCode || "").trim();
            if (code && !unique.has(code.toLowerCase()))
                unique.set(code.toLowerCase(), code);
        }
        return [...unique.values()];
    }, [rmFilmItems, floorLaminationRmRolls]);
    const filteredFloorLaminationRmRolls = useMemo(() => {
        return floorLaminationRmRolls.filter((roll) => {
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
    }, [floorLaminationRmRolls, rmFilmItemFilter, rmFilmWarehouseFilter]);
    const floorWorkOrderColumns = useMemo(() => getFloorWorkOrderColumns(onSkipWorkOrder ? { onSkip: onSkipWorkOrder } : undefined), [onSkipWorkOrder]);
    const wipParent = laminationLoadedRolls.find((r) => getLaminationParentRole(r.roll.stage) === "wip") ?? null;
    const rmParent = laminationLoadedRolls.find((r) => getLaminationParentRole(r.roll.stage) === "rm") ?? null;
    const bothParentsLoaded = wipParent != null && rmParent != null;
    const sameJobCard = bothParentsLoaded && wipParent.jobCardId === rmParent.jobCardId;
    const canProduce = bothParentsLoaded && sameJobCard;
    const wipFilmLabel = wipStageLabel(allowedWipStagesForDept("Lamination", laminationSelectedWo?.skippedOperations)[0]);
    const input1Label = `Input 1 (${wipFilmLabel})`;
    const input2Label = "Input 2 (RM Film)";
    const laminationProducedTotals = useMemo(() => {
        return laminationChildRollsFromDb.reduce((acc, row) => {
            acc.rollCount += 1;
            acc.netWeight += Number(row.netweight || 0);
            acc.wastage += Number(row.wastage || 0);
            return acc;
        }, { rollCount: 0, netWeight: 0, wastage: 0 });
    }, [laminationChildRollsFromDb]);
    const handleUnloadLaminationRoll = async (jobCardId, rollId) => {
        try {
            setLaminationCreateChildLoading(true);
            setLaminationCreateChildMessage(null);
            await unloadFloorLoadedRoll(jobCardId, rollId, "lamination");
            setLaminationCreateChildMessage("Loaded roll removed.");
        }
        catch (err) {
            const detail = err?.response?.data
                ?.detail ||
                err?.message ||
                "Could not unload roll.";
            setLaminationCreateChildMessage(detail);
        }
        finally {
            setLaminationCreateChildLoading(false);
        }
    };
    useEffect(() => {
        if (!laminationSelectedWo?.id) {
            setLaminationClosedRolls([]);
            return;
        }
        let cancelled = false;
        const run = async () => {
            try {
                const cards = await getAllJobCards(0, 20, laminationSelectedWo.id, "Lamination");
                const groups = await Promise.all(cards.map(async (card) => {
                    const rolls = await getClosedWithoutOutput(card.id);
                    return rolls.map((roll) => ({
                        ...roll,
                        jobCardId: card.id,
                        jobCardNumber: card.jobCardNumber,
                    }));
                }));
                if (!cancelled)
                    setLaminationClosedRolls(groups.flat());
            }
            catch {
                if (!cancelled)
                    setLaminationClosedRolls([]);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [laminationSelectedWo?.id, laminationClosedRefreshKey]);
    const openLaminationCloseWithoutOutput = (entry, label, fields) => {
        const roll = entry.roll;
        const wastageKg = parseNonNegativeDecimal(fields.wastage || "");
        const balanceKg = parseNonNegativeDecimal(fields.balance || "");
        setLaminationCloseTarget({
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
    const handleLaminationCloseWithoutOutput = async () => {
        const target = laminationCloseTarget;
        if (!target)
            return;
        try {
            setLaminationCreateChildLoading(true);
            setLaminationCreateChildMessage(null);
            await closeRollWithoutOutput(target.jobCardId, {
                rollId: target.rollId,
                wastage: target.wastageKg,
                balanceWeight: target.balanceKg != null && target.balanceKg > 0 ? target.balanceKg : undefined,
            });
            const role = getLaminationParentRole(laminationLoadedRolls.find((entry) => entry.roll.id === target.rollId)?.roll.stage);
            setLaminationAddRollForm((prev) => {
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
            setLaminationCloseTarget(null);
            setLaminationCreateChildMessage(`${target.label} consumed. It will be a parent of the next output roll.`);
            setLaminationClosedRefreshKey((key) => key + 1);
            setLaminationRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setLaminationCreateChildMessage(jobCardApiErrorMessage(error, "Could not close this roll."));
            throw error;
        }
        finally {
            setLaminationCreateChildLoading(false);
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
    const handleLaminationProducedRollReprint = async (r) => {
        const wo = laminationSelectedWo;
        if (!wo || !wipPrintingTemplate)
            return;
        try {
            setLaminationCreateChildLoading(true);
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
                    operatorName: r.operatorName,
                    shift: r.shift,
                    remark: r.remark,
                    itemName: wo.itemName ?? r.itemName ?? null,
                },
            };
            const job = await createPrintJob({
                name: `Lamination Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
                template_id: wipPrintingTemplate.id,
                data: printData,
                copies: 1,
            });
            setLaminationCreateChildMessage("Label reprint sent to printer.");
            pollPrintJob(job.id);
        }
        catch {
            setLaminationCreateChildMessage("Failed to send reprint to printer.");
        }
        finally {
            setLaminationCreateChildLoading(false);
        }
    };
    const refreshLaminationProducedRolls = () => {
        if (!laminationSelectedWo)
            return;
        getRollsStockByWorkOrder(laminationSelectedWo.id, "wip_lamination").then(setLaminationChildRollsFromDb);
        setLaminationRollsRefreshKey((key) => key + 1);
    };
    const openLaminationProducedEdit = (roll) => {
        const { input1, input2 } = pickEclProducedParents(roll.parentRolls, getLaminationParentRole);
        setLaminationEditForm({
            netweight: roll.netweight != null ? String(roll.netweight) : "",
            meter: roll.meter != null ? String(roll.meter) : "",
            adhesiveOh: roll.adhesiveOh != null ? String(roll.adhesiveOh) : "",
            adhesiveNco: roll.adhesiveNco != null ? String(roll.adhesiveNco) : "",
            ohPercent: roll.ohPercent != null ? String(roll.ohPercent) : "",
            operatorName: roll.operatorName ?? "",
            shift: roll.shift ?? "",
            input1Id: input1?.id ?? null,
            input2Id: input2?.id ?? null,
            input1Balance: input1?.balanceWeight != null ? String(input1.balanceWeight) : "",
            input2Balance: input2?.balanceWeight != null ? String(input2.balanceWeight) : "",
        });
        setLaminationEditRoll(roll);
    };
    const handleLaminationProducedRollDelete = async (row) => {
        if (!window.confirm(PRODUCED_ROLL_DELETE_CONFIRM))
            return;
        try {
            setLaminationCreateChildLoading(true);
            await deleteProducedRoll(row.id);
            setLaminationCreateChildMessage("Produced roll deleted.");
            if (laminationEditRoll?.id === row.id)
                setLaminationEditRoll(null);
            refreshLaminationProducedRolls();
        }
        catch (error) {
            setLaminationCreateChildMessage(jobCardApiErrorMessage(error, "Failed to delete produced roll."));
        }
        finally {
            setLaminationCreateChildLoading(false);
        }
    };
    const handleSaveLaminationProducedEdit = async () => {
        const roll = laminationEditRoll;
        if (!roll?.id)
            return;
        const parentRollIds = [laminationEditForm.input1Id, laminationEditForm.input2Id].filter((id) => id != null);
        const netweight = parseNonNegativeDecimal(laminationEditForm.netweight);
        const meter = parseNonNegativeDecimal(laminationEditForm.meter);
        try {
            setLaminationEditSaving(true);
            await updateProducedRoll(roll.id, {
                netweight,
                meter: meter != null ? Math.round(meter) : null,
                grossweight: netweight,
                adhesiveOh: parseNonNegativeDecimal(laminationEditForm.adhesiveOh),
                adhesiveNco: parseNonNegativeDecimal(laminationEditForm.adhesiveNco),
                ohPercent: parseNonNegativeDecimal(laminationEditForm.ohPercent),
                operatorName: laminationEditForm.operatorName.trim() || null,
                shift: laminationEditForm.shift.trim() || null,
                parentRollIds,
                parentBalanceWeights: parentRollIds.map((id) => id === laminationEditForm.input1Id
                    ? parseNonNegativeDecimal(laminationEditForm.input1Balance) ?? 0
                    : parseNonNegativeDecimal(laminationEditForm.input2Balance) ?? 0),
            });
            setLaminationCreateChildMessage("Produced roll updated.");
            setLaminationEditRoll(null);
            refreshLaminationProducedRolls();
        }
        catch (error) {
            setLaminationCreateChildMessage(jobCardApiErrorMessage(error, "Failed to update produced roll."));
        }
        finally {
            setLaminationEditSaving(false);
        }
    };
    const laminationProducedRollColumns = useMemo(() => [
        eclInputGroupColumns("input1", input1Label, (row) => parentsForProducedColumn(row.parentRolls, getLaminationParentRole, "wip")),
        eclInputGroupColumns("input2", input2Label, (row) => parentsForProducedColumn(row.parentRolls, getLaminationParentRole, "rm")),
        laminationOutputGroupColumns(),
        laminationAdhesiveGroupColumns(),
        asSingleColumnGroup("operatorNameGroup", {
            accessorKey: "operatorName",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Operator name", column: column, placeholder: "Filter operator..." })),
            cell: ({ row }) => (_jsx("div", { children: displayValue(row.original.operatorName) })),
            filterFn: includesStringFilterFn,
        }),
        asSingleColumnGroup("shiftGroup", {
            accessorKey: "shift",
            header: ({ column }) => (_jsx(ColumnHeader, { title: "Shift", column: column, placeholder: "Filter shift..." })),
            cell: ({ row }) => (_jsx("div", { children: displayValue(row.original.shift) })),
            filterFn: includesStringFilterFn,
        }),
        asSingleColumnGroup("actionsGroup", {
            id: "actions",
            header: () => _jsx("div", { className: "text-left", children: "Actions" }),
            cell: ({ row }) => (_jsx(ProducedRollRowActions, { reprintDisabled: !wipPrintingTemplate || laminationCreateChildLoading, mutateDisabled: laminationCreateChildLoading || isProducedRollLocked(row.original), onReprint: () => handleLaminationProducedRollReprint(row.original), onEdit: () => openLaminationProducedEdit(row.original), onDelete: () => void handleLaminationProducedRollDelete(row.original) })),
        }),
    ], [wipPrintingTemplate, laminationCreateChildLoading, laminationSelectedWo, input1Label, input2Label, getLaminationParentRole]);
    const getLaminationProducedRowGroupPath = useMemo(() => createDualInputGroupPathGetter(laminationChildRollsFromDb, (row) => {
        const { input1, input2 } = pickEclProducedParents(row.parentRolls, getLaminationParentRole);
        return { input1Id: input1?.id ?? null, input2Id: input2?.id ?? null };
    }), [laminationChildRollsFromDb, getLaminationParentRole]);
    const laminationLoadedFilmRows = useMemo(() => {
        const byJob = new Map();
        for (const entry of laminationLoadedRolls) {
            const existing = byJob.get(entry.jobCardId) ?? {
                jobCardId: entry.jobCardId,
                jobCardNumber: entry.jobCardNumber,
                input1: null,
                input2: null,
            };
            const role = getLaminationParentRole(entry.roll.stage);
            if (role === "wip")
                existing.input1 = entry;
            else if (role === "rm")
                existing.input2 = entry;
            byJob.set(entry.jobCardId, existing);
        }
        return Array.from(byJob.values());
    }, [laminationLoadedRolls, getLaminationParentRole]);
    const laminationClosedWithoutOutputRows = useMemo(() => {
        return laminationClosedRolls.map((roll) => {
            const role = getLaminationParentRole(roll.stage);
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
    }, [laminationClosedRolls, getLaminationParentRole, input1Label, input2Label]);
    const handleLaminationUndoConsumed = async (row) => {
        try {
            setLaminationCreateChildLoading(true);
            setLaminationCreateChildMessage(null);
            await undoCloseWithoutOutput(row.jobCardId, row.id);
            setLaminationCreateChildMessage("Consume undone. The film is back in stock.");
            setLaminationClosedRefreshKey((key) => key + 1);
            setLaminationRollsRefreshKey((key) => key + 1);
        }
        catch (error) {
            setLaminationCreateChildMessage(jobCardApiErrorMessage(error, "Could not undo this consume."));
        }
        finally {
            setLaminationCreateChildLoading(false);
        }
    };
    const renderLoadSlot = (role, barcode, setBarcode, onSelectStock, stockLoading) => {
        const title = role === "wip" ? input1Label : input2Label;
        const placeholder = role === "wip" ? `Scan ${input1Label} barcode` : `Scan ${input2Label} barcode`;
        return (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: [title, ": not loaded yet."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative min-w-[min(100%,16rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { type: "text", placeholder: placeholder, value: barcode, onChange: (e) => {
                                        setBarcode(e.target.value);
                                        setFloorLaminationBarcodeError(null);
                                    }, onKeyDown: (e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            void applyFloorLaminationFromBarcode(barcode, { slot: role });
                                        }
                                    }, disabled: floorLaminationBarcodeChecking, className: "pl-9", autoComplete: "off" })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: floorLaminationBarcodeChecking || stockLoading, onClick: () => void onSelectStock(), children: "Select Stock" })] })] }));
    };
    const stockPickers = (_jsxs(_Fragment, { children: [floorLaminationWipPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsxs(CardTitle, { children: ["Select ", input1Label] }), _jsx(CardDescription, { children: isOperationSkipped(laminationSelectedWo?.skippedOperations, "ECL")
                                                ? isOperationSkipped(laminationSelectedWo?.skippedOperations, "Inspection")
                                                    ? "ECL and Inspection are skipped on this work order, so load a WIP Printing roll as Input 1."
                                                    : "ECL is skipped on this work order, so load a WIP Inspection roll as Input 1."
                                                : "Load a WIP ECL roll as Input 1." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorLaminationWipPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorLaminationWipRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorLaminationWipRollsError && _jsx("p", { className: "text-sm text-red-500 mb-3", children: floorLaminationWipRollsError }), _jsx(DataTable, { columns: floorLaminationWipStockColumns, data: floorLaminationWipRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorLaminationBarcodeChecking, onClick: async () => {
                                                const selected = selectedRows[0];
                                                const barcode = selected?.barcode?.trim();
                                                if (!barcode)
                                                    return;
                                                await applyFloorLaminationFromBarcode(barcode, { closePicker: true, slot: "wip" });
                                            }, children: floorLaminationBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, "floor-lamination-wip-picker")] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorLaminationWipPicker, children: "Close" }) }) })] }) })), floorLaminationRmPickerOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsxs(CardTitle, { children: ["Select ", input2Label] }), _jsx(CardDescription, { children: "Pick a virgin RM or RM Balance film as Input 2." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: closeFloorLaminationRmPicker, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: floorLaminationRmRollsLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading stock\u2026" })] }) })) : (_jsxs(_Fragment, { children: [floorLaminationRmRollsError && _jsx("p", { className: "text-sm text-red-500 mb-3", children: floorLaminationRmRollsError }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { asChild: true, variant: rmFilmItemFilter === "all" ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter("all"), children: "All" }) }), rmFilmItemBadges.map((itemCode) => (_jsx(Badge, { asChild: true, variant: rmFilmItemFilter.toLowerCase() === itemCode.toLowerCase() ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmItemFilter(itemCode), children: itemCode }) }, itemCode)))] }), _jsx("div", { className: "flex flex-wrap gap-2 ml-auto", children: [
                                                    { value: "all", label: "ALL" },
                                                    { value: "virgin_rm", label: "RM Virgin" },
                                                    { value: "rm_balance", label: "RM Balance" },
                                                ].map((warehouse) => (_jsx(Badge, { asChild: true, variant: rmFilmWarehouseFilter === warehouse.value ? "default" : "outline", className: "cursor-pointer", children: _jsx("button", { type: "button", onClick: () => setRmFilmWarehouseFilter(warehouse.value), children: warehouse.label }) }, warehouse.value))) })] }), _jsx(DataTable, { columns: floorLaminationRmStockColumns, data: filteredFloorLaminationRmRolls, getRowId: (row) => String(row.id), singleRowSelection: true, scrollable: true, scrollHeight: "60vh", bulkActions: (selectedRows) => (_jsx(Button, { size: "sm", disabled: floorLaminationBarcodeChecking, onClick: async () => {
                                                const selected = selectedRows[0];
                                                const barcode = selected?.barcode?.trim();
                                                if (!barcode)
                                                    return;
                                                await applyFloorLaminationFromBarcode(barcode, { closePicker: true, slot: "rm" });
                                            }, children: floorLaminationBarcodeChecking ? "Loading…" : "Load Selected Roll" })) }, `floor-lamination-rm-picker-${rmFilmItemFilter}-${rmFilmWarehouseFilter}`)] })) }), _jsx(CardFooter, { children: _jsx("div", { className: "w-full flex justify-end gap-2", children: _jsx(Button, { type: "button", variant: "outline", onClick: closeFloorLaminationRmPicker, children: "Close" }) }) })] }) }))] }));
    return (_jsxs(_Fragment, { children: [laminationSelectedWo ? (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { className: "flex flex-col-reverse gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1", children: "Loaded films" }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3", children: ["Lamination needs two films on the same job card: ", input1Label, " and ", input2Label, ". Consume uses a film before the output exists. X returns a film to stock."] }), laminationRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : (_jsxs("div", { className: "space-y-3", children: [!wipParent &&
                                                renderLoadSlot("wip", floorLaminationDetailWipBarcode, setFloorLaminationDetailWipBarcode, openFloorLaminationWipPicker, floorLaminationWipRollsLoading), !rmParent &&
                                                renderLoadSlot("rm", floorLaminationDetailRmBarcode, setFloorLaminationDetailRmBarcode, openFloorLaminationRmPicker, floorLaminationRmRollsLoading), floorLaminationBarcodeError && _jsx("p", { className: "text-sm text-red-500", children: floorLaminationBarcodeError }), bothParentsLoaded && !sameJobCard && (_jsx("p", { className: "text-sm text-amber-600 dark:text-amber-400", children: "Both films must be loaded on the same Lamination job card before producing." })), laminationLoadedFilmRows.length > 0 && (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsxs("thead", { children: [_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { rowSpan: 2, className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle", children: "Job card" }), _jsx("th", { colSpan: 8, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: input1Label }), _jsx("th", { colSpan: 8, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: input2Label })] }), _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map((title, i) => (_jsx("th", { className: `text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""} ${title === "Structure" ? "w-16 max-w-[4.75rem]" : ""}`, children: title }, `input1-${title || "remove"}`))), ["Structure", "Size", "Micron", "Input weight", "Wastage", "Balance weight", "Roll continue", ""].map((title, i) => (_jsx("th", { className: `text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 ${i === 0 ? "border-l border-gray-200 dark:border-gray-700" : ""} ${title === "Structure" ? "w-16 max-w-[4.75rem]" : ""}`, children: title }, `input2-${title || "remove"}`)))] })] }), _jsx("tbody", { children: laminationLoadedFilmRows.map((row) => {
                                                                const canEditRow = canProduce && Boolean(laminationAddRollForm);
                                                                return (_jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50 last:border-0", children: [_jsx("td", { className: "py-1.5 px-2 text-gray-900 dark:text-gray-100", children: row.jobCardNumber }), loadedFilmCells(row.input1, {
                                                                            canEdit: canEditRow,
                                                                            wastage: laminationAddRollForm?.wipWastage ?? "0",
                                                                            balance: laminationAddRollForm?.wipBalance ?? "",
                                                                            semiConsumed: Boolean(laminationAddRollForm?.wipSemiConsumed),
                                                                            onWastage: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, wipWastage: value } : prev),
                                                                            onBalance: (value) => setLaminationAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    wipBalance: value,
                                                                                    wipSemiConsumed: parseNonNegativeDecimal(value) != null ? false : prev.wipSemiConsumed,
                                                                                }
                                                                                : prev),
                                                                            onSemiConsumed: (checked) => setLaminationAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    wipSemiConsumed: checked,
                                                                                    wipBalance: checked ? "" : prev.wipBalance,
                                                                                }
                                                                                : prev),
                                                                            onUnload: handleUnloadLaminationRoll,
                                                                            onCloseWithoutOutput: () => {
                                                                                if (!row.input1 || laminationAddRollForm?.wipSemiConsumed)
                                                                                    return;
                                                                                openLaminationCloseWithoutOutput(row.input1, input1Label, {
                                                                                    wastage: laminationAddRollForm?.wipWastage ?? "0",
                                                                                    balance: laminationAddRollForm?.wipBalance ?? "",
                                                                                });
                                                                            },
                                                                            unloadDisabled: laminationCreateChildLoading,
                                                                            consumeOpen: laminationCloseTarget?.rollId === row.input1?.roll?.id,
                                                                        }), loadedFilmCells(row.input2, {
                                                                            canEdit: canEditRow,
                                                                            wastage: laminationAddRollForm?.rmWastage ?? "0",
                                                                            balance: laminationAddRollForm?.rmBalance ?? "",
                                                                            semiConsumed: Boolean(laminationAddRollForm?.rmSemiConsumed),
                                                                            onWastage: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, rmWastage: value } : prev),
                                                                            onBalance: (value) => setLaminationAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    rmBalance: value,
                                                                                    rmSemiConsumed: parseNonNegativeDecimal(value) != null ? false : prev.rmSemiConsumed,
                                                                                }
                                                                                : prev),
                                                                            onSemiConsumed: (checked) => setLaminationAddRollForm((prev) => prev
                                                                                ? {
                                                                                    ...prev,
                                                                                    rmSemiConsumed: checked,
                                                                                    rmBalance: checked ? "" : prev.rmBalance,
                                                                                }
                                                                                : prev),
                                                                            onUnload: handleUnloadLaminationRoll,
                                                                            onCloseWithoutOutput: () => {
                                                                                if (!row.input2 || laminationAddRollForm?.rmSemiConsumed)
                                                                                    return;
                                                                                openLaminationCloseWithoutOutput(row.input2, input2Label, {
                                                                                    wastage: laminationAddRollForm?.rmWastage ?? "0",
                                                                                    balance: laminationAddRollForm?.rmBalance ?? "",
                                                                                });
                                                                            },
                                                                            unloadDisabled: laminationCreateChildLoading,
                                                                            consumeOpen: laminationCloseTarget?.rollId === row.input2?.roll?.id,
                                                                        })] }, row.jobCardId));
                                                            }) })] }) })), canProduce && laminationAddRollForm && (_jsx("div", { className: "rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsxs("thead", { children: [_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { colSpan: 2, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output" }), _jsx("th", { colSpan: 3, className: "text-center py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Adhesive" }), _jsx("th", { rowSpan: 2, className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle border-l border-gray-200 dark:border-gray-700", children: "Operator name" }), _jsx("th", { rowSpan: 2, className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle", children: "Shift" }), _jsx("th", { rowSpan: 2, className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 align-middle", children: "Remark" })] }), _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50", children: [_jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output weight (kg)" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Output meter" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700", children: "Adhesive OH" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Adhesive NCO" }), _jsx("th", { className: "text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300", children: "OH %" })] })] }), _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-24 px-1.5 text-xs", value: laminationAddRollForm.netweight, onValueChange: (value) => setLaminationAddRollForm((prev) => {
                                                                                if (!prev)
                                                                                    return prev;
                                                                                const kg = parseNonNegativeDecimal(value);
                                                                                return {
                                                                                    ...prev,
                                                                                    netweight: value,
                                                                                    meter: outputMeterFromParent(kg, wipParent?.roll) || prev.meter,
                                                                                };
                                                                            }) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: laminationAddRollForm.meter, onValueChange: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, meter: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2 border-l border-gray-200 dark:border-gray-700", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: laminationAddRollForm.adhesiveOh, onValueChange: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, adhesiveOh: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-20 px-1.5 text-xs", value: laminationAddRollForm.adhesiveNco, onValueChange: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, adhesiveNco: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(NonNegativeDecimalInput, { className: "h-7 w-16 px-1.5 text-xs", value: laminationAddRollForm.ohPercent, onValueChange: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, ohPercent: value } : prev) }) }), _jsx("td", { className: "py-1.5 px-2 border-l border-gray-200 dark:border-gray-700", children: _jsxs(Select, { value: laminationAddRollForm.operatorName && laminationOperators.includes(laminationAddRollForm.operatorName)
                                                                                ? laminationAddRollForm.operatorName
                                                                                : undefined, onValueChange: (value) => setLaminationAddRollForm((prev) => prev ? { ...prev, operatorName: value } : prev), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-36 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Select" }) }), _jsx(SelectContent, { children: laminationOperators.map((name) => (_jsx(SelectItem, { value: name, children: name }, name))) })] }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsxs(Select, { value: laminationAddRollForm.shift || undefined, onValueChange: (value) => setLaminationAddRollForm((prev) => (prev ? { ...prev, shift: value } : prev)), children: [_jsx(SelectTrigger, { size: "sm", className: "h-7 w-16 px-1.5 text-xs", children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: LAMINATION_SHIFTS.map((shiftOption) => (_jsx(SelectItem, { value: shiftOption, children: shiftOption }, shiftOption))) })] }) }), _jsx("td", { className: "py-1.5 px-2", children: _jsx(Input, { type: "text", className: "h-7 w-32 px-1.5 text-xs", value: laminationAddRollForm.remark, onChange: (e) => setLaminationAddRollForm((prev) => prev ? { ...prev, remark: e.target.value } : prev) }) })] }) })] }) }))] }))] }), _jsx(ClosedWithoutOutputList, { rows: laminationClosedWithoutOutputRows, undoing: laminationCreateChildLoading, onUndo: (row) => void handleLaminationUndoConsumed(row) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Produced rolls" }), !laminationChildRollsLoading && (_jsx("div", { className: "rounded-[2px] border border-zinc-600 overflow-hidden", children: _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total produced rolls" }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: laminationProducedTotals.rollCount }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total output weight (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold border-r border-zinc-600", children: [laminationProducedTotals.netWeight.toFixed(2), " kg"] }), _jsx("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-medium bg-sidebar border-r border-zinc-600", children: "Total wastage (kg)" }), _jsxs("td", { className: "py-2 px-3 text-gray-900 dark:text-zinc-300 font-semibold", children: [laminationProducedTotals.wastage.toFixed(2), " kg"] })] }) }) }) }))] }), laminationChildRollsLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading rolls\u2026" })) : laminationChildRollsFromDb.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No produced rolls found for this work order." })) : (_jsx(DataTable, { columns: laminationProducedRollColumns, data: laminationChildRollsFromDb, getRowGroupPath: getLaminationProducedRowGroupPath, scrollable: true, scrollHeight: "45vh", compact: true, size: "xs", showSelectionSummary: false }))] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap", children: [!laminationRollsLoading && canProduce && laminationAddRollForm && (_jsxs(Button, { type: "button", variant: "default", size: "sm", className: "gap-2", disabled: laminationCreateChildLoading ||
                                    !hasSemiConsumeChoice(laminationAddRollForm.wipBalance, laminationAddRollForm.wipSemiConsumed) ||
                                    !hasSemiConsumeChoice(laminationAddRollForm.rmBalance, laminationAddRollForm.rmSemiConsumed) ||
                                    laminationFormCommittedForRollId === laminationAddRollForm.roll.id, onClick: async () => {
                                    const form = laminationAddRollForm;
                                    const wo = laminationSelectedWo;
                                    if (!form || wo?.itemId == null || !wipParent || !rmParent)
                                        return;
                                    if (wipParent.jobCardId !== rmParent.jobCardId) {
                                        setLaminationCreateChildMessage("Both films must be on the same Lamination job card.");
                                        return;
                                    }
                                    try {
                                        setLaminationCreateChildLoading(true);
                                        setLaminationCreateChildMessage(null);
                                        const pendingParentIds = laminationClosedRolls
                                            .filter((roll) => roll.jobCardId === form.jobCardId)
                                            .map((roll) => roll.id)
                                            .filter((id) => id !== wipParent.roll.id && id !== rmParent.roll.id);
                                        const parentIds = [wipParent.roll.id, rmParent.roll.id, ...pendingParentIds];
                                        const wipSemiConsumed = Boolean(form.wipSemiConsumed);
                                        const rmSemiConsumed = Boolean(form.rmSemiConsumed);
                                        const wipBalanceValue = wipSemiConsumed ? null : parseNonNegativeDecimal(form.wipBalance || "");
                                        const rmBalanceValue = rmSemiConsumed ? null : parseNonNegativeDecimal(form.rmBalance || "");
                                        if ((!wipSemiConsumed && wipBalanceValue == null) || (!rmSemiConsumed && rmBalanceValue == null)) {
                                            setLaminationCreateChildMessage("Enter balance weight or tick Roll continue for both films.");
                                            return;
                                        }
                                        const outputWeight = parseNonNegativeDecimal(form.netweight || "") ?? undefined;
                                        const outputMeter = parseNonNegativeDecimal(form.meter || "") ?? undefined;
                                        const adhesiveOh = parseNonNegativeDecimal(form.adhesiveOh || "") ?? undefined;
                                        const adhesiveNco = parseNonNegativeDecimal(form.adhesiveNco || "") ?? undefined;
                                        const ohPercent = parseNonNegativeDecimal(form.ohPercent || "") ?? undefined;
                                        const wipWastage = parseNonNegativeDecimal(form.wipWastage || "") ?? 0;
                                        const rmWastage = parseNonNegativeDecimal(form.rmWastage || "") ?? 0;
                                        const totalWastage = wipWastage + rmWastage;
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
                                                    meter: outputMeter,
                                                    grossweight: outputWeight,
                                                    wastage: totalWastage,
                                                    operatorName: form.operatorName || undefined,
                                                    shift: form.shift || undefined,
                                                    remark: form.remark || undefined,
                                                    adhesiveOh,
                                                    adhesiveNco,
                                                    ohPercent,
                                                    itemName: wo.itemName ?? null,
                                                },
                                            };
                                            const job = await createPrintJob({
                                                name: `Lamination - ${form.jobCardNumber}`,
                                                template_id: wipPrintingTemplate.id,
                                                data: printData,
                                                copies: 1,
                                            });
                                            pollPrintJob(job.id);
                                        }
                                        await addLaminationRoll(form.jobCardId, {
                                            itemId: wo.itemId,
                                            rollno: "",
                                            size: form.size ? parseFloat(form.size) : undefined,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            netweight: outputWeight,
                                            meter: outputMeter,
                                            grossweight: outputWeight,
                                            wastage: totalWastage,
                                            operatorName: form.operatorName.trim() || undefined,
                                            shift: form.shift.trim() || undefined,
                                            remark: form.remark.trim() || undefined,
                                            adhesiveOh,
                                            adhesiveNco,
                                            ohPercent,
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
                                        getRollsStockByWorkOrder(wo.id, "wip_lamination").then(setLaminationChildRollsFromDb);
                                        if (wipSemiConsumed || rmSemiConsumed) {
                                            setLaminationFormCommittedForRollId(null);
                                            setLaminationAddRollForm((prev) => prev
                                                ? {
                                                    ...prev,
                                                    netweight: "",
                                                    meter: "",
                                                    wipWastage: "0",
                                                    rmWastage: "0",
                                                    wipBalance: wipSemiConsumed ? "" : prev.wipBalance,
                                                    rmBalance: rmSemiConsumed ? "" : prev.rmBalance,
                                                    wipSemiConsumed: false,
                                                    rmSemiConsumed: false,
                                                    remark: "",
                                                }
                                                : prev);
                                            setLaminationCreateChildMessage("Lamination roll created. Roll continue films kept on the machine.");
                                        }
                                        else {
                                            setLaminationFormCommittedForRollId(form.roll.id);
                                            setLaminationCreateChildMessage(wipPrintingTemplate
                                                ? "Roll added and label sent to printer."
                                                : "Roll added and movement recorded. No WIP printing template configured.");
                                        }
                                        setLaminationRollsRefreshKey((key) => key + 1);
                                        setLaminationClosedRefreshKey((key) => key + 1);
                                    }
                                    catch {
                                        setLaminationCreateChildMessage(wipPrintingTemplate
                                            ? "Failed to print label. Roll not added or movement not recorded."
                                            : "Failed to add roll or record movement.");
                                    }
                                    finally {
                                        setLaminationCreateChildLoading(false);
                                    }
                                }, children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] })), laminationCreateChildMessage && (_jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: laminationCreateChildMessage }))] }), stockPickers] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 space-y-1", children: [_jsxs(Label, { htmlFor: "floor-lamination-barcode", className: "text-xs text-gray-600 dark:text-gray-400", children: ["Barcode (", input1Label, ")"] }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: ["Load ", input1Label, " first to open the work order, then load ", input2Label, "."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 max-w-2xl", children: [_jsxs("div", { className: "relative min-w-[min(100%,18rem)] flex-1", children: [_jsx(ScanBarcode, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "floor-lamination-barcode", type: "text", placeholder: `Scan or enter ${input1Label} barcode`, value: floorLaminationBarcode, onChange: (e) => {
                                                    setFloorLaminationBarcode(e.target.value);
                                                    setFloorLaminationBarcodeError(null);
                                                }, onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        void handleFloorLaminationBarcodeSubmit();
                                                    }
                                                }, disabled: floorLaminationBarcodeChecking, className: "pl-9", autoComplete: "off" })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", className: "whitespace-nowrap", disabled: floorLaminationBarcodeChecking || floorLaminationWipRollsLoading, onClick: () => void openFloorLaminationWipPicker(), children: "Select Stock" })] }), floorLaminationBarcodeError && _jsx("p", { className: "text-sm text-red-500", children: floorLaminationBarcodeError })] }), stockPickers, laminationLoading ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Loading\u2026" })) : laminationError ? (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: laminationError })) : laminationWorkOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No work orders found." })) : (_jsx(DataTable, { columns: floorWorkOrderColumns, data: laminationWorkOrders, getRowId: (row) => String(row.id), onRowClick: (wo) => setLaminationSelectedWo(wo), scrollable: true, scrollHeight: "65vh", showSelectionSummary: false }))] })), _jsx(CloseWithoutOutputDialog, { target: laminationCloseTarget, saving: laminationCreateChildLoading, onOpenChange: (open) => {
                    if (!open)
                        setLaminationCloseTarget(null);
                }, onConfirm: handleLaminationCloseWithoutOutput }), _jsx(Dialog, { open: Boolean(laminationEditRoll), onOpenChange: (open) => { if (!open)
                    setLaminationEditRoll(null); }, children: _jsxs(DialogContent, { className: producedRollEditDialogClassName, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit produced roll" }), _jsx(DialogDescription, { children: "Update lamination output fields and leftover balance weights." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(ProducedRollEditField, { label: "Output weight (kg)", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.netweight, onValueChange: (netweight) => setLaminationEditForm((prev) => ({ ...prev, netweight })) }) }), _jsx(ProducedRollEditField, { label: "Meter", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.meter, onValueChange: (meter) => setLaminationEditForm((prev) => ({ ...prev, meter })) }) }), _jsx(ProducedRollEditField, { label: "Adhesive OH", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.adhesiveOh, onValueChange: (adhesiveOh) => setLaminationEditForm((prev) => ({ ...prev, adhesiveOh })) }) }), _jsx(ProducedRollEditField, { label: "Adhesive NCO", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.adhesiveNco, onValueChange: (adhesiveNco) => setLaminationEditForm((prev) => ({ ...prev, adhesiveNco })) }) }), _jsx(ProducedRollEditField, { label: "OH %", children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.ohPercent, onValueChange: (ohPercent) => setLaminationEditForm((prev) => ({ ...prev, ohPercent })) }) }), _jsx(ProducedRollEditField, { label: "Shift", children: _jsxs(Select, { value: laminationEditForm.shift || undefined, onValueChange: (shift) => setLaminationEditForm((prev) => ({ ...prev, shift })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Shift" }) }), _jsx(SelectContent, { children: LAMINATION_SHIFTS.map((shift) => (_jsx(SelectItem, { value: shift, children: shift }, shift))) })] }) }), _jsx(ProducedRollEditField, { label: "Operator name", className: "col-span-2", children: _jsx(Input, { value: laminationEditForm.operatorName, onChange: (e) => setLaminationEditForm((prev) => ({ ...prev, operatorName: e.target.value })) }) }), _jsx(ProducedRollEditField, { label: `${input1Label} balance (kg)`, children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.input1Balance, onValueChange: (input1Balance) => setLaminationEditForm((prev) => ({ ...prev, input1Balance })) }) }), _jsx(ProducedRollEditField, { label: `${input2Label} balance (kg)`, children: _jsx(NonNegativeDecimalInput, { className: producedRollEditInputClassName, value: laminationEditForm.input2Balance, onValueChange: (input2Balance) => setLaminationEditForm((prev) => ({ ...prev, input2Balance })) }) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setLaminationEditRoll(null), children: "Cancel" }), _jsx(Button, { type: "button", disabled: laminationEditSaving, onClick: () => void handleSaveLaminationProducedEdit(), children: "Save" })] })] }) })] }));
}
