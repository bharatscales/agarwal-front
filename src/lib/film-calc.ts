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

const isPositive = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0

const round2 = (value: number) => Math.round(value * 100) / 100

export const meterFromNetWeight = (
  netweight: number | null | undefined,
  sizeMm: number | null | undefined,
  micron: number | null | undefined,
  density: number | null | undefined
): number | null => {
  if (!isPositive(netweight) || !isPositive(sizeMm) || !isPositive(micron) || !isPositive(density)) {
    return null
  }
  return round2((netweight * 1_000_000) / (density * sizeMm * micron))
}

export const netWeightFromMeter = (
  meter: number | null | undefined,
  sizeMm: number | null | undefined,
  micron: number | null | undefined,
  density: number | null | undefined
): number | null => {
  if (!isPositive(meter) || !isPositive(sizeMm) || !isPositive(micron) || !isPositive(density)) {
    return null
  }
  return round2((meter * density * sizeMm * micron) / 1_000_000)
}
