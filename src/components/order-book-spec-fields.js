import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function parseOptionalNumber(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
}
export function parseOptionalInt(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
}
export function OrderBookSpecFields({ value, onChange, idPrefix = "", fieldRefs, startIndex = 0, onEnterKey, }) {
    const bindRef = (offset) => (el) => {
        if (!fieldRefs)
            return;
        fieldRefs[startIndex + offset] = el;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}totalGsm`, children: "Total GSM" }), _jsx(Input, { id: `${idPrefix}totalGsm`, type: "number", step: "any", min: "0", ref: bindRef(0), value: value.totalGsm, onChange: (e) => onChange("totalGsm", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex), placeholder: "From FG BOM" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}size`, children: "Size" }), _jsx(Input, { id: `${idPrefix}size`, type: "number", step: "any", min: "0", ref: bindRef(1), value: value.size, onChange: (e) => onChange("size", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex + 1), placeholder: "From FG BOM" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}structure`, children: "Structure" }), _jsx(Input, { id: `${idPrefix}structure`, ref: bindRef(2), value: value.structure, onChange: (e) => onChange("structure", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex + 2), placeholder: "From FG BOM layers" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}coilWidth`, children: "Coil width" }), _jsx(Input, { id: `${idPrefix}coilWidth`, type: "number", step: "any", min: "0", ref: bindRef(3), value: value.coilWidth, onChange: (e) => onChange("coilWidth", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex + 3), placeholder: "Enter coil width" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}repeatLength`, children: "Repeat length" }), _jsx(Input, { id: `${idPrefix}repeatLength`, type: "number", step: "any", min: "0", ref: bindRef(4), value: value.repeatLength, onChange: (e) => onChange("repeatLength", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex + 4), placeholder: "Enter repeat length" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: `${idPrefix}noOfPanel`, children: "No of Panel" }), _jsx(Input, { id: `${idPrefix}noOfPanel`, type: "number", step: "1", min: "0", ref: bindRef(5), value: value.noOfPanel, onChange: (e) => onChange("noOfPanel", e.target.value), onKeyDown: (e) => onEnterKey?.(e, startIndex + 5), placeholder: "Enter no of panel" })] })] })] }));
}
