import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatWeightWithMeter } from "@/lib/film-calc";
import { jobCardApiErrorMessage, undoLastOutput } from "@/lib/job-card-api";
import { getRollsStockByWorkOrder } from "@/lib/rolls-stock-api";
import { allowedWipStagesForDept, wipStageLabel } from "@/lib/wo-flow";
export const PRODUCED_ROLL_STAGE_BY_OPERATION = {
    Printing: "wip_printed",
    Inspection: "wip_inspection",
    ECL: "wip_ecl",
    Lamination: "wip_lamination",
    Slitting: "finished_goods",
};
function cardNumbersOnRoll(roll) {
    return (roll.jobCardNumber ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
}
export function assignProducedRolls(cards, rollsByStage) {
    const byCardId = {};
    const cardsByOperation = new Map();
    for (const card of cards) {
        const list = cardsByOperation.get(card.operation) ?? [];
        list.push(card);
        cardsByOperation.set(card.operation, list);
        byCardId[card.id] = [];
    }
    const unassignedByOperation = {};
    for (const [operation, stage] of Object.entries(PRODUCED_ROLL_STAGE_BY_OPERATION)) {
        const rolls = rollsByStage[stage] ?? [];
        const opCards = cardsByOperation.get(operation) ?? [];
        const numberToCards = new Map();
        for (const card of opCards) {
            const key = card.jobCardNumber.trim();
            const list = numberToCards.get(key) ?? [];
            list.push(card);
            numberToCards.set(key, list);
        }
        const unassigned = [];
        for (const roll of rolls) {
            const numbers = cardNumbersOnRoll(roll);
            const matched = [
                ...new Map(numbers.flatMap((number) => numberToCards.get(number) ?? []).map((card) => [card.id, card])).values(),
            ];
            if (matched.length > 0) {
                for (const card of matched)
                    byCardId[card.id].push(roll);
                continue;
            }
            if (numbers.length === 0 && opCards.length === 1) {
                byCardId[opCards[0].id].push(roll);
                continue;
            }
            unassigned.push(roll);
        }
        if (unassigned.length > 0)
            unassignedByOperation[operation] = unassigned;
    }
    return { byCardId, unassignedByOperation };
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
function displayMeter(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) || n <= 0 ? "-" : `${Math.round(n)} m`;
}
function displayDecimal(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) ? "-" : n.toFixed(2);
}
function displayOhPercent(value) {
    if (value == null || value === "")
        return "-";
    const n = Number(value);
    return Number.isNaN(n) ? "-" : `${n.toFixed(2)} %`;
}
function isRmFilmStage(stage) {
    const s = (stage ?? "").toLowerCase().replace(/-/g, "_");
    return s === "virgin_rm" || s === "rm_balance";
}
function parentRole(operation, stage) {
    const s = (stage ?? "").toLowerCase().replace(/-/g, "_");
    if (isRmFilmStage(s))
        return "rm";
    if (operation === "ECL" && (s === "wip_printed" || s === "wip_inspection"))
        return "wip";
    if (operation === "Lamination" &&
        (s === "wip_printed" || s === "wip_inspection" || s === "wip_ecl")) {
        return "wip";
    }
    return null;
}
function parentsForColumn(row, operation, role) {
    const parents = row.parentRolls ?? [];
    const matched = parents.filter((parent) => parentRole(operation, parent.stage) === role);
    if (matched.length > 0 || parents.some((parent) => parentRole(operation, parent.stage) != null)) {
        return matched;
    }
    if (role === "wip")
        return parents[0] ? [parents[0]] : [];
    return parents[1] ? [parents[1]] : [];
}
function renderParentLines(parents, render) {
    if (parents.length === 0)
        return _jsx("div", { className: "text-xs", children: "-" });
    return (_jsx("div", { className: "text-xs space-y-0.5", children: parents.map((parent) => (_jsx("div", { children: render(parent) }, parent.id))) }));
}
function inputGroupColumns(operation, id, label, role) {
    const pick = (row) => parentsForColumn(row, operation, role);
    const mergeByParent = {
        mergeRows: true,
        getMergeKey: (row) => pick(row).map((parent) => parent.id).join("-") || null,
    };
    return {
        id,
        header: () => _jsx("div", { className: "text-center w-full", children: label }),
        columns: [
            {
                id: `${id}Structure`,
                header: () => _jsx("div", { children: "Structure" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => displayValue(parent.itemName)),
                meta: mergeByParent,
            },
            {
                id: `${id}Size`,
                header: () => _jsx("div", { children: "Size" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => parent.size != null ? String(parent.size) : "-"),
                meta: mergeByParent,
            },
            {
                id: `${id}Micron`,
                header: () => _jsx("div", { children: "Micron" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => parent.micron != null ? String(parent.micron) : "-"),
                meta: mergeByParent,
            },
            {
                id: `${id}InputWeight`,
                header: () => _jsx("div", { children: "Input weight" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => formatWeightWithMeter(parent.netweight, parent.meter)),
                meta: mergeByParent,
            },
            {
                id: `${id}Wastage`,
                header: () => _jsx("div", { children: "Wastage" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => displayKg(parent.wastage)),
                meta: mergeByParent,
            },
            {
                id: `${id}BalanceWeight`,
                header: () => _jsx("div", { children: "Balance weight" }),
                cell: ({ row }) => renderParentLines(pick(row.original), (parent) => displayKg(parent.balanceWeight)),
                meta: mergeByParent,
            },
        ],
    };
}
function singleColumn(id, column) {
    return {
        id,
        header: () => null,
        columns: [column],
    };
}
function kgColumn(key, title) {
    return {
        accessorKey: key,
        header: () => _jsx("div", { children: title }),
        cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayKg(row.original[key]) }),
    };
}
function textColumn(key, title) {
    return {
        accessorKey: key,
        header: () => _jsx("div", { children: title }),
        cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayValue(row.original[key]) }),
    };
}
function balanceCell(row) {
    const value = row.parentBalanceWeight ?? row.balanceWeight;
    return value != null ? `${Number(value).toFixed(2)} kg` : "-";
}
function printingColumns() {
    return [
        textColumn("size", "Size"),
        textColumn("micron", "Micron"),
        {
            accessorKey: "parentNetweight",
            header: () => _jsx("div", { children: "Input weight (kg)" }),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter) })),
            meta: { mergeRows: true },
        },
        kgColumn("netweight", "Output weight (kg)"),
        {
            accessorKey: "meter",
            header: () => _jsx("div", { children: "Meter" }),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayMeter(row.original.meter) }),
        },
        kgColumn("plainWastage", "Plain wastage (kg)"),
        kgColumn("printedWastage", "Printed wastage (kg)"),
        textColumn("inkGsm", "Ink gsm"),
        textColumn("inkGsmByInkWt", "Ink gsm (by ink wt)"),
        {
            id: "balanceWeight",
            header: () => _jsx("div", { children: "Balance weight (kg)" }),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: balanceCell(row.original) }),
        },
    ];
}
function inspectionColumns() {
    return [
        textColumn("size", "Size"),
        textColumn("micron", "Micron"),
        {
            accessorKey: "parentNetweight",
            header: () => _jsx("div", { children: "Input weight (kg)" }),
            cell: ({ row }) => (_jsx("div", { className: "text-xs", children: formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter) })),
            meta: { mergeRows: true },
        },
        kgColumn("netweight", "Output weight (kg)"),
        kgColumn("wastage", "Wastage (kg)"),
        {
            id: "balanceWeight",
            header: () => _jsx("div", { children: "Balance weight (kg)" }),
            cell: ({ row }) => _jsx("div", { className: "text-xs", children: balanceCell(row.original) }),
        },
        textColumn("wastageReason", "Reason of wastage"),
        textColumn("noOfTag", "No. of tag"),
        textColumn("noOfCuts", "No. of cuts"),
        textColumn("operatorName", "Operator name"),
        textColumn("shift", "Shift"),
        textColumn("remark", "Remark"),
    ];
}
function eclColumns(input1Label, input2Label) {
    return [
        inputGroupColumns("ECL", "input1", input1Label, "wip"),
        inputGroupColumns("ECL", "input2", input2Label, "rm"),
        {
            id: "extrusion",
            header: () => _jsx("div", { className: "text-center w-full", children: "Extrusion" }),
            columns: [
                kgColumn("inkGsm", "Coating (kg)"),
                kgColumn("trimWastage", "Trim wastage (kg)"),
                kgColumn("lumpsWastage", "Lumps wastage (kg)"),
                kgColumn("eclOutputWastage", "Output wastage (kg)"),
            ],
        },
        singleColumn("netweightGroup", kgColumn("netweight", "Output weight (kg)")),
        singleColumn("operatorNameGroup", textColumn("operatorName", "Operator name")),
        singleColumn("shiftGroup", textColumn("shift", "Shift")),
    ];
}
function laminationColumns(input1Label, input2Label) {
    return [
        inputGroupColumns("Lamination", "input1", input1Label, "wip"),
        inputGroupColumns("Lamination", "input2", input2Label, "rm"),
        {
            id: "output",
            header: () => _jsx("div", { className: "text-center w-full", children: "Output" }),
            columns: [
                kgColumn("netweight", "Output weight (kg)"),
                {
                    accessorKey: "meter",
                    header: () => _jsx("div", { children: "Output meter" }),
                    cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayMeter(row.original.meter) }),
                },
            ],
        },
        {
            id: "adhesive",
            header: () => _jsx("div", { className: "text-center w-full", children: "Adhesive" }),
            columns: [
                {
                    accessorKey: "adhesiveOh",
                    header: () => _jsx("div", { children: "Adhesive OH" }),
                    cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayDecimal(row.original.adhesiveOh) }),
                },
                {
                    accessorKey: "adhesiveNco",
                    header: () => _jsx("div", { children: "Adhesive NCO" }),
                    cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayDecimal(row.original.adhesiveNco) }),
                },
                {
                    accessorKey: "ohPercent",
                    header: () => _jsx("div", { children: "OH %" }),
                    cell: ({ row }) => _jsx("div", { className: "text-xs", children: displayOhPercent(row.original.ohPercent) }),
                },
            ],
        },
        singleColumn("operatorNameGroup", textColumn("operatorName", "Operator name")),
        singleColumn("shiftGroup", textColumn("shift", "Shift")),
    ];
}
function slittingColumns() {
    return [
        {
            accessorKey: "barcode",
            header: () => _jsx("div", { children: "Barcode" }),
            cell: ({ row }) => _jsx("div", { className: "font-mono text-xs", children: displayValue(row.original.barcode) }),
        },
        kgColumn("trimWastage", "Trim wastage"),
        kgColumn("eclWastage", "ECL wastage"),
        kgColumn("printedWastage", "Print wastage"),
        kgColumn("laminationWastage", "Lamination wastage"),
        kgColumn("slitterWastage", "Slitter wastage"),
        kgColumn("wastage", "Total wastage"),
        textColumn("coilRewinding", "Coil rewinding"),
        textColumn("slitDirection", "Direction"),
        textColumn("coreSize", "Core size"),
        textColumn("coilDia", "Coil dia"),
        {
            id: "jobSize",
            header: () => _jsx("div", { className: "text-center w-full", children: "Job size" }),
            columns: [textColumn("size", "Width"), textColumn("jobRepeat", "Repeat")],
        },
    ];
}
function rowWastageKg(operation, row) {
    if (operation === "Printing") {
        if (row.plainWastage != null || row.printedWastage != null) {
            return Number(row.plainWastage || 0) + Number(row.printedWastage || 0);
        }
        return Number(row.wastage || 0);
    }
    if (operation === "ECL" && row.wastage == null) {
        return Number(row.trimWastage || 0) + Number(row.lumpsWastage || 0) + Number(row.eclOutputWastage || 0);
    }
    return Number(row.wastage || 0);
}
function balanceTotal(rows) {
    const seen = new Map();
    for (const row of rows) {
        const parents = row.parentRolls ?? [];
        if (parents.length > 0) {
            for (const parent of parents) {
                if (parent.balanceWeight == null)
                    continue;
                const key = String(parent.id);
                if (!seen.has(key))
                    seen.set(key, Number(parent.balanceWeight));
            }
            continue;
        }
        const value = row.parentBalanceWeight ?? row.balanceWeight;
        if (value == null)
            continue;
        const key = row.parentRollIds?.length
            ? row.parentRollIds.join("-")
            : row.parentRollId != null
                ? String(row.parentRollId)
                : `row-${row.id}`;
        if (!seen.has(key))
            seen.set(key, Number(value));
    }
    if (seen.size === 0)
        return null;
    return [...seen.values()].reduce((sum, value) => sum + value, 0);
}
function ProducedRollTotals({ operation, rows }) {
    const output = rows.reduce((sum, row) => sum + Number(row.netweight || 0), 0);
    const wastage = rows.reduce((sum, row) => sum + rowWastageKg(operation, row), 0);
    const balance = operation === "Slitting" ? null : balanceTotal(rows);
    const showOutput = operation !== "Slitting";
    return (_jsxs("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: ["Rolls ", rows.length, showOutput ? ` · Output ${output.toFixed(2)} kg` : "", ` · Wastage ${wastage.toFixed(2)} kg`, balance != null ? ` · Balance ${balance.toFixed(2)} kg` : ""] }));
}
export function JobCardProducedRolls({ operation, rolls, skippedOperations, loadedRoll, loading = false, }) {
    const dualOperation = operation === "ECL" || operation === "Lamination" ? operation : null;
    const dualInput = dualOperation
        ? {
            input1: `Input 1 (${wipStageLabel(allowedWipStagesForDept(dualOperation, skippedOperations)[0])})`,
            input2: "Input 2 (RM Film)",
        }
        : null;
    const columns = useMemo(() => {
        if (operation === "Printing")
            return printingColumns();
        if (operation === "Inspection")
            return inspectionColumns();
        if (operation === "ECL" && dualInput)
            return eclColumns(dualInput.input1, dualInput.input2);
        if (operation === "Lamination" && dualInput)
            return laminationColumns(dualInput.input1, dualInput.input2);
        if (operation === "Slitting")
            return slittingColumns();
        return [];
    }, [operation, dualInput?.input1, dualInput?.input2]);
    if (columns.length === 0)
        return null;
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-baseline justify-between gap-2", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-gray-400", children: "Produced rolls" }), !loading && rolls.length > 0 && _jsx(ProducedRollTotals, { operation: operation, rows: rolls })] }), operation === "Slitting" && loadedRoll && (_jsxs("p", { className: "text-xs text-gray-700 dark:text-gray-300", children: ["Input weight ", formatWeightWithMeter(loadedRoll.netweight, loadedRoll.meter), loadedRoll.barcode ? ` · ${loadedRoll.barcode}` : ""] })), loading ? (_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Loading produced rolls\u2026" })) : rolls.length === 0 ? (_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "No produced rolls for this job card." })) : (_jsx(DataTable, { columns: columns, data: rolls, getRowId: (row) => String(row.id), compact: true, size: "xs", scrollable: true, scrollHeight: "320px" }))] }));
}
export function UndoLastOutputButton({ jobCardId, jobCardNumber, onUndone, }) {
    const [undoOpen, setUndoOpen] = useState(false);
    const [undoText, setUndoText] = useState("");
    const [undoError, setUndoError] = useState(null);
    const [undoSaving, setUndoSaving] = useState(false);
    const closeUndo = () => {
        if (undoSaving)
            return;
        setUndoOpen(false);
        setUndoText("");
        setUndoError(null);
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "absolute top-1 right-1 size-8 text-gray-500 hover:text-red-600", "aria-label": "Undo last output", onClick: () => setUndoOpen(true), children: _jsx(Undo2, { className: "size-4" }) }) }), _jsx(TooltipContent, { children: "Undo last output" })] }), _jsx(Dialog, { open: undoOpen, onOpenChange: (open) => { if (!open)
                    closeUndo(); }, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Undo last output" }), _jsxs(DialogDescription, { children: ["This deletes the latest output on ", jobCardNumber, ", removes its balance rolls, and returns the input films to the job card."] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-medium text-gray-600 dark:text-gray-300", htmlFor: `undo-${jobCardId}`, children: "Type undo to confirm" }), _jsx(Input, { id: `undo-${jobCardId}`, value: undoText, autoComplete: "off", onChange: (event) => setUndoText(event.target.value), disabled: undoSaving }), undoError && _jsx("p", { className: "text-xs text-red-500", children: undoError })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: undoSaving, onClick: closeUndo, children: "Cancel" }), _jsx(Button, { type: "button", variant: "destructive", disabled: undoSaving || undoText !== "undo", onClick: () => {
                                        setUndoSaving(true);
                                        setUndoError(null);
                                        void undoLastOutput(jobCardId)
                                            .then(() => {
                                            setUndoOpen(false);
                                            setUndoText("");
                                            onUndone();
                                        })
                                            .catch((error) => {
                                            setUndoError(jobCardApiErrorMessage(error, "Could not undo the last output."));
                                        })
                                            .finally(() => setUndoSaving(false));
                                    }, children: undoSaving ? "Undoing…" : "Undo" })] })] }) })] }));
}
