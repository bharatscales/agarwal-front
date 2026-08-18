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

const toPositiveNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

const round2 = (value: number) => Math.round(value * 100) / 100

export const meterFromNetWeight = (
  netweight: number | null | undefined,
  sizeMm: number | null | undefined,
  micron: number | null | undefined,
  density: number | null | undefined
): number | null => {
  const w = toPositiveNumber(netweight)
  const size = toPositiveNumber(sizeMm)
  const thick = toPositiveNumber(micron)
  const d = toPositiveNumber(density)
  if (w == null || size == null || thick == null || d == null) return null
  return Math.round((w * 1_000_000) / (d * size * thick))
}

export const netWeightFromMeter = (
  meter: number | null | undefined,
  sizeMm: number | null | undefined,
  micron: number | null | undefined,
  density: number | null | undefined
): number | null => {
  const m = toPositiveNumber(meter)
  const size = toPositiveNumber(sizeMm)
  const thick = toPositiveNumber(micron)
  const d = toPositiveNumber(density)
  if (m == null || size == null || thick == null || d == null) return null
  return round2((m * d * size * thick) / 1_000_000)
}

/** Ink gsm from weight gain on the consumed RM film. */
export const inkGsmByInkWt = (params: {
  inputKg: number | null | undefined
  outputKg: number | null | undefined
  plainWastageKg?: number | null
  printedWastageKg?: number | null
  balanceKg?: number | null
  density: number | null | undefined
  micron: number | null | undefined
}): number | null => {
  const input = toPositiveNumber(params.inputKg)
  const density = toPositiveNumber(params.density)
  const micron = toPositiveNumber(params.micron)
  if (input == null || density == null || micron == null) return null
  const consumed = input - (params.plainWastageKg || 0) - (params.balanceKg || 0)
  if (!(consumed > 0)) return null
  const weightGain = (params.outputKg || 0) + (params.printedWastageKg || 0) - consumed
  if (weightGain <= 0) return 0
  return round2((weightGain * density * micron) / consumed)
}

export type FilmAutofillChangedField = "netweight" | "meter" | "size" | "micron" | "itemId"

export type FilmAutofillFields = {
  size?: number | null
  micron?: number | null
  netweight?: number | null
  meter?: number | null
  lastFilmInput?: "netweight" | "meter"
}

export type FilmAutofillUpdates = {
  size?: number
  micron?: number
  netweight?: number
  meter?: number
  lastFilmInput?: "netweight" | "meter"
}

/** Fill meter from net weight (or the reverse) for an RM film row. */
export const applyFilmAutofill = (
  row: FilmAutofillFields,
  density: number | string | null | undefined,
  options?: {
    changedField?: FilmAutofillChangedField
    inheritSize?: number | null
    inheritMicron?: number | null
  }
): FilmAutofillUpdates => {
  const inheritSize = options?.changedField === "size" ? undefined : options?.inheritSize
  const inheritMicron = options?.changedField === "micron" ? undefined : options?.inheritMicron
  const size = toPositiveNumber(row.size) ?? toPositiveNumber(inheritSize)
  const micron = toPositiveNumber(row.micron) ?? toPositiveNumber(inheritMicron)
  const updates: FilmAutofillUpdates = {}

  if (toPositiveNumber(row.size) == null && size != null) updates.size = size
  if (toPositiveNumber(row.micron) == null && micron != null) updates.micron = micron

  const changed = options?.changedField
  const preferMeter =
    changed === "meter" || (changed !== "netweight" && row.lastFilmInput === "meter")

  if (changed === "meter") updates.lastFilmInput = "meter"
  if (changed === "netweight") updates.lastFilmInput = "netweight"

  if (preferMeter) {
    const netweight = netWeightFromMeter(row.meter, size, micron, toPositiveNumber(density))
    if (netweight != null) updates.netweight = netweight
    return updates
  }

  const meter = meterFromNetWeight(row.netweight, size, micron, toPositiveNumber(density))
  if (meter != null) {
    updates.meter = meter
    return updates
  }

  const netweight = netWeightFromMeter(row.meter, size, micron, toPositiveNumber(density))
  if (netweight != null) updates.netweight = netweight
  return updates
}

export const formatWeightWithMeter = (
  kg: number | null | undefined,
  meter: number | null | undefined
): string => {
  if (kg == null || !Number.isFinite(Number(kg))) return "—"
  const weight = `${Number(kg).toFixed(2)} kg`
  const meters = meter != null && Number(meter) > 0 ? Math.round(Number(meter)) : null
  return meters != null ? `${weight}  ( ${meters} m)` : weight
}
