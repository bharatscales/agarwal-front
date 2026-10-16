import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FgBomEditor, createBomEditorLine, validateBomEditorLines, } from "@/components/fg-bom-editor";
import { filmGsm } from "@/lib/film-calc";
import { isRmFilmGroup } from "@/lib/rm-item-groups";
import { FG_BOM_MULTI_STAGE_OPERATIONS, FG_BOM_NO_RM_OPERATIONS, FG_BOM_STAGE_OPERATIONS, } from "@/lib/item-api";
const STAGE_ORDER = [...FG_BOM_STAGE_OPERATIONS];
const MULTI_STAGE_SET = new Set(FG_BOM_MULTI_STAGE_OPERATIONS);
const NO_RM_SET = new Set(FG_BOM_NO_RM_OPERATIONS);
const PRINTING_OP = "Printing";
const INSPECTION_OP = "Inspection";
const SLITTING_OP = "Slitting";
function stageSortKey(operation, stageSeq) {
    const i = STAGE_ORDER.indexOf(operation);
    const opOrder = i >= 0 ? i : STAGE_ORDER.length;
    return opOrder * 1000 + stageSeq;
}
function stageKey(operation, stageSeq) {
    return `${operation}:${stageSeq}`;
}
export function formatStageLabel(operation, stageSeq, countForOperation = 1) {
    if (MULTI_STAGE_SET.has(operation) && (countForOperation > 1 || stageSeq > 1)) {
        return `${operation} ${stageSeq}`;
    }
    return operation;
}
export function createBomStageEditor(id, operation, stageSeq) {
    return {
        id,
        operation,
        stageSeq,
        lines: NO_RM_SET.has(operation) ? [] : [createBomEditorLine(1, 1)],
    };
}
function nextStageSeq(stages, operation) {
    const seqs = stages.filter((s) => s.operation === operation).map((s) => s.stageSeq);
    return seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
}
function parseOptionalNumber(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
}
export function bomLinesToStageEditors(lines) {
    const byStage = new Map();
    for (const line of lines) {
        const op = line.operation?.trim() || PRINTING_OP;
        const seq = line.stageSeq ?? 1;
        const key = stageKey(op, seq);
        const list = byStage.get(key) ?? [];
        list.push(line);
        byStage.set(key, list);
    }
    const stages = [];
    let stageId = 1;
    const sortedKeys = [...byStage.keys()].sort((a, b) => {
        const [opA, seqA] = a.split(":");
        const [opB, seqB] = b.split(":");
        return stageSortKey(opA, parseInt(seqA, 10)) - stageSortKey(opB, parseInt(seqB, 10));
    });
    for (const key of sortedKeys) {
        const [operation, seqStr] = key.split(":");
        const stageSeq = parseInt(seqStr, 10);
        const opLines = byStage.get(key) ?? [];
        opLines.sort((a, b) => (a.layerNo ?? 0) - (b.layerNo ?? 0));
        const rmLines = opLines.filter((l) => l.rmItemId != null);
        stages.push({
            id: stageId++,
            operation,
            stageSeq,
            lines: NO_RM_SET.has(operation)
                ? []
                : rmLines.length > 0
                    ? rmLines.map((l, i) => {
                        const computedGsm = isRmFilmGroup(l.rmItemGroup)
                            ? filmGsm(l.rmDensity, l.micron)
                            : null;
                        return {
                            id: l.id ?? i + 1,
                            layerNo: l.layerNo ?? i + 1,
                            rmItemId: String(l.rmItemId),
                            rmItemGroup: l.rmItemGroup ?? "",
                            size: l.size != null ? String(l.size) : "",
                            micron: l.micron != null ? String(l.micron) : "",
                            gsm: computedGsm != null
                                ? String(computedGsm)
                                : l.gsm != null
                                    ? String(l.gsm)
                                    : "",
                        };
                    })
                    : [createBomEditorLine(1, 1)],
        });
    }
    return stages;
}
export function stageEditorsToPayload(stages) {
    const out = [];
    for (const stage of stages) {
        if (stage.operation === INSPECTION_OP || stage.operation === SLITTING_OP) {
            out.push({
                operation: stage.operation,
                stageSeq: stage.stageSeq,
                layerNo: 1,
                rmItemId: null,
            });
            continue;
        }
        const lines = stage.lines
            .filter((r) => r.rmItemId.trim())
            .map((r, index) => ({
            operation: stage.operation,
            stageSeq: stage.stageSeq,
            layerNo: index + 1,
            rmItemId: parseInt(r.rmItemId, 10),
            size: parseOptionalNumber(r.size),
            micron: parseOptionalNumber(r.micron),
            gsm: parseOptionalNumber(r.gsm),
        }));
        out.push(...lines);
    }
    return out;
}
export function validateBomStages(stages) {
    for (const stage of stages) {
        if (NO_RM_SET.has(stage.operation))
            continue;
        const error = validateBomEditorLines(stage.lines, formatStageLabel(stage.operation, stage.stageSeq));
        if (error)
            return error;
    }
    return null;
}
/** Group readonly BOM lines by operation + stage for work-order display. */
export function groupBomLinesByStage(lines) {
    const byStage = new Map();
    for (const line of lines) {
        const op = line.operation?.trim() || PRINTING_OP;
        const seq = line.stageSeq ?? 1;
        const key = stageKey(op, seq);
        const list = byStage.get(key) ?? [];
        list.push(line);
        byStage.set(key, list);
    }
    const countByOp = new Map();
    for (const key of byStage.keys()) {
        const op = key.split(":")[0];
        countByOp.set(op, (countByOp.get(op) ?? 0) + 1);
    }
    return [...byStage.entries()]
        .sort(([a], [b]) => {
        const [opA, seqA] = a.split(":");
        const [opB, seqB] = b.split(":");
        return stageSortKey(opA, parseInt(seqA, 10)) - stageSortKey(opB, parseInt(seqB, 10));
    })
        .map(([key, stageLines]) => {
        const [operation, seqStr] = key.split(":");
        const stageSeq = parseInt(seqStr, 10);
        return {
            operation,
            stageSeq,
            label: formatStageLabel(operation, stageSeq, countByOp.get(operation) ?? 1),
            lines: [...stageLines].sort((a, b) => (a.layerNo ?? 0) - (b.layerNo ?? 0)),
        };
    });
}
export function FgStageBomEditor({ value, onChange }) {
    const nextStageId = useRef(1000);
    const usedSingleStages = useMemo(() => {
        const used = new Set();
        for (const stage of value) {
            if (!MULTI_STAGE_SET.has(stage.operation)) {
                used.add(stage.operation);
            }
        }
        return used;
    }, [value]);
    const availableStages = STAGE_ORDER.filter((op) => MULTI_STAGE_SET.has(op) || !usedSingleStages.has(op));
    const countByOperation = useMemo(() => {
        const counts = new Map();
        for (const stage of value) {
            counts.set(stage.operation, (counts.get(stage.operation) ?? 0) + 1);
        }
        return counts;
    }, [value]);
    const sortedStages = useMemo(() => [...value].sort((a, b) => stageSortKey(a.operation, a.stageSeq) - stageSortKey(b.operation, b.stageSeq)), [value]);
    const addStage = (operation) => {
        const id = nextStageId.current++;
        const stageSeq = nextStageSeq(value, operation);
        onChange([...value, createBomStageEditor(id, operation, stageSeq)]);
    };
    const removeStage = (stageId) => {
        onChange(value.filter((s) => s.id !== stageId));
    };
    const updateStageLines = (stageId, lines) => {
        onChange(value.map((s) => (s.id === stageId ? { ...s, lines } : s)));
    };
    const noRmMessage = (operation) => operation === INSPECTION_OP
        ? "No RM — inspection uses WIP Printing from the prior stage."
        : "No RM — slitting uses WIP from the prior stage.";
    return (_jsxs("div", { className: "space-y-4", children: [sortedStages.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No stages added yet. Add a manufacturing stage to define routing and RM structure." })) : (sortedStages.map((stage) => (_jsxs("div", { className: "rounded-lg border border-border bg-muted/10 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h4", { className: "text-sm font-semibold", children: formatStageLabel(stage.operation, stage.stageSeq, countByOperation.get(stage.operation) ?? 1) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive", onClick: () => removeStage(stage.id), "aria-label": `Remove ${stage.operation} stage`, children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), NO_RM_SET.has(stage.operation) ? (_jsx("p", { className: "text-sm text-muted-foreground", children: noRmMessage(stage.operation) })) : (_jsx(FgBomEditor, { mode: "edit", value: stage.lines, onChange: (lines) => updateStageLines(stage.id, lines) }))] }, stage.id)))), availableStages.length > 0 ? (_jsx("div", { className: "flex flex-wrap items-center gap-2 justify-end", children: availableStages.map((op) => (_jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "gap-1", onClick: () => addStage(op), children: [_jsx(Plus, { className: "h-4 w-4" }), "Add ", op] }, op))) })) : null] }));
}
