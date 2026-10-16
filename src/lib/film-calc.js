/**
 * Film length / weight conversion for RM films.
 *
 * Units:
 * - size (width): mm
 * - micron (thickness): µm
 * - density: g/cm³
 * - netweight: kg
 * - meter (length): m
 *
 * meter = (netweight × 1_000_000) / (density × size × micron)
 * netweight = (meter × density × size × micron) / 1_000_000
 */
const toPositiveNumber = (value) => {
    if (value == null || value === "")
        return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
};
const round2 = (value) => Math.round(value * 100) / 100;
export const meterFromNetWeight = (netweight, sizeMm, micron, density) => {
    const w = toPositiveNumber(netweight);
    const size = toPositiveNumber(sizeMm);
    const thick = toPositiveNumber(micron);
    const d = toPositiveNumber(density);
    if (w == null || size == null || thick == null || d == null)
        return null;
    return Math.round((w * 1_000_000) / (d * size * thick));
};
/** Film GSM (g/m²) = density (g/cm³) × micron (µm). Size is not part of GSM. */
export const filmGsm = (density, micron) => {
    const d = toPositiveNumber(density);
    const thick = toPositiveNumber(micron);
    if (d == null || thick == null)
        return null;
    return round2(d * thick);
};
export const netWeightFromMeter = (meter, sizeMm, micron, density) => {
    const m = toPositiveNumber(meter);
    const size = toPositiveNumber(sizeMm);
    const thick = toPositiveNumber(micron);
    const d = toPositiveNumber(density);
    if (m == null || size == null || thick == null || d == null)
        return null;
    return round2((m * d * size * thick) / 1_000_000);
};
/** Ink gsm from weight gain on the consumed RM film. */
export const inkGsmByInkWt = (params) => {
    const input = toPositiveNumber(params.inputKg);
    const density = toPositiveNumber(params.density);
    const micron = toPositiveNumber(params.micron);
    if (input == null || density == null || micron == null)
        return null;
    const consumed = input - (params.plainWastageKg || 0) - (params.balanceKg || 0);
    if (!(consumed > 0))
        return null;
    const weightGain = (params.outputKg || 0) + (params.printedWastageKg || 0) - consumed;
    if (weightGain <= 0)
        return 0;
    return round2((weightGain * density * micron) / consumed);
};
/** Fill meter from net weight (or the reverse) for an RM film row. */
export const applyFilmAutofill = (row, density, options) => {
    const inheritSize = options?.changedField === "size" ? undefined : options?.inheritSize;
    const inheritMicron = options?.changedField === "micron" ? undefined : options?.inheritMicron;
    const size = toPositiveNumber(row.size) ?? toPositiveNumber(inheritSize);
    const micron = toPositiveNumber(row.micron) ?? toPositiveNumber(inheritMicron);
    const updates = {};
    if (toPositiveNumber(row.size) == null && size != null)
        updates.size = size;
    if (toPositiveNumber(row.micron) == null && micron != null)
        updates.micron = micron;
    const changed = options?.changedField;
    const preferMeter = changed === "meter" || (changed !== "netweight" && row.lastFilmInput === "meter");
    if (changed === "meter")
        updates.lastFilmInput = "meter";
    if (changed === "netweight")
        updates.lastFilmInput = "netweight";
    if (preferMeter) {
        const netweight = netWeightFromMeter(row.meter, size, micron, toPositiveNumber(density));
        if (netweight != null)
            updates.netweight = netweight;
        return updates;
    }
    const meter = meterFromNetWeight(row.netweight, size, micron, toPositiveNumber(density));
    if (meter != null) {
        updates.meter = meter;
        return updates;
    }
    const netweight = netWeightFromMeter(row.meter, size, micron, toPositiveNumber(density));
    if (netweight != null)
        updates.netweight = netweight;
    return updates;
};
export const formatWeightWithMeter = (kg, meter) => {
    if (kg == null || !Number.isFinite(Number(kg)))
        return "—";
    const weight = `${Number(kg).toFixed(2)} kg`;
    const meters = meter != null && Number(meter) > 0 ? Math.round(Number(meter)) : null;
    return meters != null ? `${weight}  ( ${meters} m)` : weight;
};
