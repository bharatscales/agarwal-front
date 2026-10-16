import {} from "@tanstack/react-table";
/** Substring match for text-box column filters. TanStack defaults numeric columns to inNumberRange. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared across typed ColumnDef row shapes
export const includesStringFilterFn = (row, columnId, filterValue) => {
    const val = row.getValue(columnId);
    return String(val ?? "").toLowerCase().includes(String(filterValue ?? "").toLowerCase());
};
/** Stable key for sibling child rolls that share the same parent roll(s). */
export function getProducedRollParentGroupKey(row) {
    const ids = row.parentRollIds && row.parentRollIds.length > 0
        ? [...row.parentRollIds].sort((a, b) => a - b)
        : row.parentRollId != null
            ? [row.parentRollId]
            : [];
    return ids.length > 0 ? ids.join(",") : null;
}
function maxParentFrequency(ids) {
    const counts = new Map();
    let max = 0;
    for (const id of ids) {
        if (id == null)
            continue;
        const next = (counts.get(id) ?? 0) + 1;
        counts.set(id, next);
        if (next > max)
            max = next;
    }
    return max;
}
/** Prefer grouping by the input that is reused across more produced children. */
export function chooseDualInputPrimary(rows) {
    const input1Max = maxParentFrequency(rows.map((row) => row.input1Id));
    const input2Max = maxParentFrequency(rows.map((row) => row.input2Id));
    return input2Max > input1Max ? "input2" : "input1";
}
export function getDualInputGroupPath(ids, primary) {
    const input1 = ids.input1Id != null ? String(ids.input1Id) : null;
    const input2 = ids.input2Id != null ? String(ids.input2Id) : null;
    return primary === "input1" ? [input1, input2] : [input2, input1];
}
export function createDualInputGroupPathGetter(rows, getIds) {
    const primary = chooseDualInputPrimary(rows.map(getIds));
    return (row) => getDualInputGroupPath(getIds(row), primary);
}
