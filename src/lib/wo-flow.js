export const SKIPPABLE_OPERATIONS = [
    "Inspection",
    "ECL",
    "Lamination",
    "Slitting",
];
const PREVIOUS_OPERATION = {
    Inspection: "Printing",
    ECL: "Inspection",
    Lamination: "ECL",
    Slitting: "Lamination",
};
const STAGE_AFTER = {
    Printing: "wip_printed",
    Inspection: "wip_inspection",
    ECL: "wip_ecl",
    Lamination: "wip_lamination",
};
export function normalizeRollStage(stage) {
    return (stage ?? "").toLowerCase().replace(/-/g, "_");
}
export function normalizeSkippedOperations(raw) {
    if (!raw)
        return [];
    return raw.filter(Boolean);
}
export function isOperationSkipped(skipped, operation) {
    return normalizeSkippedOperations(skipped).includes(operation);
}
/** WIP stage the department may load, walking back through skipped operations. */
export function allowedWipStagesForDept(operation, skipped) {
    const skippedSet = new Set(normalizeSkippedOperations(skipped));
    let previous = PREVIOUS_OPERATION[operation];
    while (previous !== "Printing" && skippedSet.has(previous)) {
        previous = PREVIOUS_OPERATION[previous] ?? "Printing";
    }
    return [STAGE_AFTER[previous]];
}
export function isAllowedWipStage(stage, allowed) {
    return allowed.includes(normalizeRollStage(stage));
}
export function wipStageLabel(stage) {
    const s = normalizeRollStage(stage);
    if (s === "wip_printed")
        return "WIP Printing";
    if (s === "wip_inspection")
        return "WIP Inspection";
    if (s === "wip_ecl")
        return "WIP ECL";
    if (s === "wip_lamination")
        return "WIP Lamination";
    return stage || "—";
}
