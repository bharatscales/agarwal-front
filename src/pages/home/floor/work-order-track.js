import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SHORT_LABEL = {
    Printing: "Print",
    Inspection: "Insp",
    ECL: "ECL",
    Lamination: "Lam",
    Slitting: "Slit",
};
const EMPTY_STAGES = [
    { operation: "Printing", state: "not_started", rolls: 0, weight: 0 },
    { operation: "Inspection", state: "not_started", rolls: 0, weight: 0 },
    { operation: "ECL", state: "not_started", rolls: 0, weight: 0 },
    { operation: "Lamination", state: "not_started", rolls: 0, weight: 0 },
    { operation: "Slitting", state: "not_started", rolls: 0, weight: 0 },
];
function formatWeightKg(weight) {
    const rounded = Math.round(weight * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
const WIP_BIN = {
    Printing: "WIP Printing",
    Inspection: "WIP Inspection",
    ECL: "WIP ECL",
    Lamination: "WIP Lamination",
};
function stageTitle(stage) {
    if (stage.state === "skipped")
        return `${stage.operation}: skipped`;
    const stateLabel = stage.state === "completed" ? "completed" : stage.state === "in_process" ? "in process" : "not started";
    const bin = WIP_BIN[stage.operation];
    if (bin && stage.rolls > 0) {
        const rollsLabel = stage.rolls === 1 ? "roll" : "rolls";
        return `${stage.operation}: ${stateLabel}. ${bin}: ${stage.rolls} ${rollsLabel}, ${formatWeightKg(stage.weight)} kg`;
    }
    return `${stage.operation}: ${stateLabel}`;
}
function TrackDot({ stage }) {
    if (stage.state === "skipped") {
        return (_jsxs("span", { className: "relative inline-flex h-3.5 w-3.5 items-center justify-center", title: "Skipped", children: [_jsx("span", { className: "h-3.5 w-3.5 rounded-full border border-dashed border-zinc-400" }), _jsx("span", { className: "absolute h-px w-3 rotate-45 bg-zinc-400" })] }));
    }
    const fill = stage.state === "completed"
        ? "border-green-500 bg-green-500"
        : stage.state === "in_process"
            ? "border-amber-400 bg-amber-400"
            : "border-zinc-400 bg-transparent dark:border-zinc-300";
    return _jsx("span", { className: `inline-block h-3.5 w-3.5 rounded-full border-2 ${fill}` });
}
export function WorkOrderTrackCell({ track }) {
    const stages = track?.stages?.length ? track.stages : EMPTY_STAGES;
    const title = stages.map(stageTitle).join("\n");
    return (_jsx("div", { className: "flex shrink-0 items-start pt-2.5", title: title, children: stages.map((stage, index) => {
            const showStock = stage.state !== "skipped" && index < stages.length - 1 && stage.rolls > 0;
            return (_jsxs("div", { className: "flex shrink-0 items-start", children: [_jsxs("div", { className: "flex w-11 flex-col items-center", title: stageTitle(stage), children: [_jsx(TrackDot, { stage: stage }), _jsx("span", { className: `mt-0.5 text-[10px] leading-none ${stage.state === "skipped"
                                    ? "text-zinc-400"
                                    : "text-gray-600 dark:text-gray-300"}`, children: SHORT_LABEL[stage.operation] ?? stage.operation })] }), index < stages.length - 1 ? (_jsxs("div", { className: "relative flex h-3.5 w-12 items-center", children: [showStock ? (_jsx("span", { className: "absolute inset-x-0 bottom-1/2 mb-px text-center text-[10px] font-medium leading-none text-gray-800 dark:text-gray-100", children: formatWeightKg(stage.weight) })) : null, _jsx("span", { className: "h-px w-full bg-gray-400 dark:bg-gray-500" }), showStock ? (_jsx("span", { className: "absolute inset-x-0 top-1/2 mt-px text-center text-[10px] font-medium leading-none text-gray-800 dark:text-gray-100", children: stage.rolls })) : null] })) : null] }, stage.operation));
        }) }));
}
