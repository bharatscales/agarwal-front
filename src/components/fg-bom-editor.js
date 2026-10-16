import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { getItems } from "@/lib/item-api";
import { filmGsm } from "@/lib/film-calc";
import { isGsmBomItemGroup, isRmFilmGroup, isRmItemGroup } from "@/lib/rm-item-groups";
function gsmForFilmLine(density, micron) {
    const computed = filmGsm(density, micron);
    return computed != null ? String(computed) : "";
}
export const createBomEditorLine = (id, layerNo) => ({
    id,
    layerNo,
    rmItemId: "",
    rmItemGroup: "",
    size: "",
    micron: "",
    gsm: "",
});
function parsePositive(value) {
    const n = Number(value.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}
export function FgBomEditor(props) {
    const isEdit = props.mode !== "readonly";
    const nextRowId = useRef(100);
    const [rmItemOptions, setRmItemOptions] = useState([]);
    const [rmItemsById, setRmItemsById] = useState({});
    const [rmItemsLoading, setRmItemsLoading] = useState(false);
    const editLines = isEdit ? props.value : [];
    const readonlyLines = !isEdit ? props.readonlyLines : [];
    useEffect(() => {
        if (!isEdit)
            return;
        let cancelled = false;
        setRmItemsLoading(true);
        getItems(0, 500)
            .then((items) => {
            if (cancelled)
                return;
            const rm = items.filter((i) => isRmItemGroup(i.itemGroup));
            const byId = {};
            for (const it of rm)
                byId[String(it.id)] = it;
            setRmItemsById(byId);
            setRmItemOptions(rm.map((it) => ({
                value: String(it.id),
                label: `${it.itemCode} — ${it.itemName || it.itemCode}`,
            })));
        })
            .catch(() => {
            if (!cancelled) {
                setRmItemOptions([]);
                setRmItemsById({});
            }
        })
            .finally(() => {
            if (!cancelled)
                setRmItemsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [isEdit]);
    const updateLine = (rowId, patch) => {
        if (!isEdit)
            return;
        props.onChange(editLines.map((row) => {
            if (row.id !== rowId)
                return row;
            const next = { ...row, ...patch };
            if (patch.rmItemId !== undefined && patch.rmItemId !== row.rmItemId) {
                const group = rmItemsById[patch.rmItemId]?.itemGroup ?? "";
                next.rmItemGroup = group;
                next.size = "";
                next.micron = "";
                next.gsm = "";
            }
            const group = next.rmItemGroup || rmItemsById[next.rmItemId]?.itemGroup || "";
            if (isRmFilmGroup(group)) {
                next.gsm = gsmForFilmLine(rmItemsById[next.rmItemId]?.density, next.micron);
            }
            return next;
        }));
    };
    const addRow = () => {
        if (!isEdit)
            return;
        const id = nextRowId.current++;
        const layerNo = editLines.length + 1;
        props.onChange([...editLines, createBomEditorLine(id, layerNo)]);
    };
    const removeRow = (rowId) => {
        if (!isEdit || editLines.length <= 1)
            return;
        props.onChange(editLines.filter((r) => r.id !== rowId).map((r, i) => ({ ...r, layerNo: i + 1 })));
    };
    if (!isEdit && readonlyLines.length === 0) {
        return (_jsx("p", { className: "text-sm text-muted-foreground", children: "No structure defined for this stage." }));
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "hover:bg-transparent", children: [_jsx(TableHead, { className: "bg-muted/40 text-xs font-semibold w-14 rounded-tl-md border-b", children: "Layer" }), _jsx(TableHead, { className: "bg-muted/40 text-xs font-semibold min-w-[9rem] border-b", children: "Structure (RM item)" }), _jsx(TableHead, { className: "bg-muted/40 text-xs font-semibold w-[6.5rem] border-b", children: "Size" }), _jsx(TableHead, { className: "bg-muted/40 text-xs font-semibold w-[6.5rem] border-b", children: "Micron" }), _jsx(TableHead, { className: "bg-muted/40 text-xs font-semibold w-[6.5rem] border-b", children: "GSM" }), isEdit ? (_jsx(TableHead, { className: "bg-muted/40 w-10 border-b rounded-tr-md p-0" })) : null] }) }), _jsx(TableBody, { children: isEdit
                            ? editLines.map((row) => {
                                const group = row.rmItemGroup || rmItemsById[row.rmItemId]?.itemGroup || "";
                                const film = isRmFilmGroup(group);
                                const gsm = isGsmBomItemGroup(group);
                                const filmGsmValue = film
                                    ? gsmForFilmLine(rmItemsById[row.rmItemId]?.density, row.micron) || row.gsm
                                    : row.gsm;
                                return (_jsxs(TableRow, { className: "hover:bg-transparent", children: [_jsx(TableCell, { className: "py-2 align-middle", children: _jsx("div", { className: "flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-muted/30 px-2 text-sm font-medium tabular-nums", children: row.layerNo }) }), _jsx(TableCell, { className: "py-2 align-middle min-w-[9rem]", children: _jsx(CreatableCombobox, { options: rmItemOptions, value: row.rmItemId || null, onValueChange: (selected) => updateLine(row.id, { rmItemId: selected ?? "" }), placeholder: "Select RM item", searchPlaceholder: "Search RM item\u2026", emptyMessage: "No RM items found.", loading: rmItemsLoading }) }), _jsx(TableCell, { className: "py-2 align-middle", children: _jsx(Input, { type: "number", step: "any", min: "0", className: "h-9 tabular-nums", placeholder: film ? "Size *" : "—", value: row.size, disabled: !film, onChange: (e) => updateLine(row.id, { size: e.target.value }) }) }), _jsx(TableCell, { className: "py-2 align-middle", children: _jsx(Input, { type: "number", step: "any", min: "0", className: "h-9 tabular-nums", placeholder: film ? "Micron *" : "—", value: row.micron, disabled: !film, onChange: (e) => updateLine(row.id, { micron: e.target.value }) }) }), _jsx(TableCell, { className: "py-2 align-middle", children: _jsx(Input, { type: "number", step: "any", min: "0", className: `h-9 tabular-nums${film ? " bg-muted/30" : ""}`, placeholder: gsm ? "GSM *" : film ? "auto" : "—", value: film ? filmGsmValue : row.gsm, disabled: !gsm && !film, readOnly: film, title: film
                                                    ? "GSM = density × micron from the selected RM film"
                                                    : undefined, onChange: (e) => updateLine(row.id, { gsm: e.target.value }) }) }), _jsx(TableCell, { className: "w-10 p-2 align-middle", children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive", disabled: editLines.length <= 1, onClick: () => removeRow(row.id), "aria-label": "Remove row", children: _jsx(Trash2, { className: "h-4 w-4" }) }) })] }, row.id));
                            })
                            : readonlyLines.map((line) => (_jsxs(TableRow, { className: "hover:bg-transparent", children: [_jsx(TableCell, { className: "py-2 align-middle", children: _jsx("div", { className: "flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-muted/30 px-2 text-sm font-medium tabular-nums", children: line.layerNo }) }), _jsx(TableCell, { className: "py-2 align-middle text-sm", children: line.rmItemCode
                                            ? `${line.rmItemCode}${line.rmItemName ? ` — ${line.rmItemName}` : ""}`
                                            : "—" }), _jsx(TableCell, { className: "py-2 align-middle text-sm tabular-nums", children: isRmFilmGroup(line.rmItemGroup) && line.size != null ? line.size : "—" }), _jsx(TableCell, { className: "py-2 align-middle text-sm tabular-nums", children: isRmFilmGroup(line.rmItemGroup) && line.micron != null ? line.micron : "—" }), _jsx(TableCell, { className: "py-2 align-middle text-sm tabular-nums", children: isGsmBomItemGroup(line.rmItemGroup) && line.gsm != null
                                            ? line.gsm
                                            : isRmFilmGroup(line.rmItemGroup)
                                                ? filmGsm(line.rmDensity, line.micron) ?? line.gsm ?? "—"
                                                : "—" })] }, line.id))) })] }), isEdit ? (_jsx("div", { className: "flex justify-end", children: _jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "gap-1", onClick: addRow, children: [_jsx(Plus, { className: "h-4 w-4" }), "Add layer"] }) })) : null] }));
}
export function bomLinesToEditorLines(lines) {
    return lines
        .filter((l) => l.rmItemId != null)
        .map((l, i) => ({
        id: l.id ?? i + 1,
        layerNo: l.layerNo ?? i + 1,
        rmItemId: String(l.rmItemId),
        rmItemGroup: l.rmItemGroup ?? "",
        size: l.size != null ? String(l.size) : "",
        micron: l.micron != null ? String(l.micron) : "",
        gsm: isRmFilmGroup(l.rmItemGroup)
            ? gsmForFilmLine(l.rmDensity, l.micron) || (l.gsm != null ? String(l.gsm) : "")
            : l.gsm != null
                ? String(l.gsm)
                : "",
    }));
}
export function validateBomEditorLines(lines, stageLabel) {
    for (const row of lines) {
        if (!row.rmItemId.trim())
            continue;
        const group = row.rmItemGroup;
        if (isRmFilmGroup(group)) {
            if (parsePositive(row.size) == null || parsePositive(row.micron) == null) {
                return `${stageLabel} layer ${row.layerNo}: size and micron are required for RM film.`;
            }
        }
        else if (isGsmBomItemGroup(group)) {
            if (parsePositive(row.gsm) == null) {
                return `${stageLabel} layer ${row.layerNo}: GSM is required for extrusion, ink, adhesive, or chemical.`;
            }
        }
    }
    return null;
}
