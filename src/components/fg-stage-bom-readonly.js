import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { FgBomEditor } from "@/components/fg-bom-editor";
import { groupBomLinesByStage } from "@/components/fg-stage-bom-editor";
import { FG_BOM_NO_RM_OPERATIONS } from "@/lib/item-api";
const NO_RM_SET = new Set(FG_BOM_NO_RM_OPERATIONS);
function noRmMessage(operation) {
    if (operation === "Inspection") {
        return "No RM — inspection uses WIP Printing from the prior stage.";
    }
    if (operation === "Slitting") {
        return "No RM — slitting uses WIP from the prior stage.";
    }
    return "No RM items for this stage.";
}
export function FgStageBomReadonly({ lines }) {
    const stages = useMemo(() => groupBomLinesByStage(lines), [lines]);
    if (stages.length === 0) {
        return (_jsx("p", { className: "text-sm text-muted-foreground", children: "No BOM defined for this FG variety in Item Master." }));
    }
    return (_jsx("div", { className: "space-y-6", children: stages.map((stage) => {
            const structureLines = stage.lines.filter((l) => l.rmItemId != null);
            const isNoRm = NO_RM_SET.has(stage.operation) || structureLines.length === 0;
            return (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-semibold", children: stage.label }), isNoRm ? (_jsx("p", { className: "text-sm text-muted-foreground", children: noRmMessage(stage.operation) })) : (_jsx(FgBomEditor, { mode: "readonly", readonlyLines: structureLines }))] }, `${stage.operation}-${stage.stageSeq}`));
        }) }));
}
