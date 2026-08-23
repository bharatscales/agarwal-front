import type { BomLine } from "@/lib/item-api"
import { filmGsm } from "@/lib/film-calc"
import { isRmFilmGroup } from "@/lib/rm-item-groups"
import { availableQtyChem, type ChemStockRow } from "@/lib/chem-stock-api"
import { getAllRollsStock } from "@/lib/rolls-stock-api"

export type FilmStockRow = Awaited<ReturnType<typeof getAllRollsStock>>[number]

export type BomMaterialRow = {
  key: string
  rmItemId: number
  itemCode: string
  itemName: string
  itemGroup: string
  isFilm: boolean
  size: number | null
  micron: number | null
  gsm: number
  stages: string[]
  requiredKg: number
  availableKg: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

const closeNum = (a: number, b: number) => Math.abs(a - b) < 0.051

export function bomLineGsm(line: BomLine): number | null {
  if (isRmFilmGroup(line.rmItemGroup)) {
    const computed = filmGsm(line.rmDensity, line.micron)
    if (computed != null && computed > 0) return computed
  }
  if (line.gsm != null) {
    const n = Number(line.gsm)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

function filmRollKg(roll: FilmStockRow): number {
  if (roll.consumed || roll.issued) return 0
  const stage = (roll.stage ?? "").toLowerCase()
  if (stage === "rm_balance") {
    return Number(roll.balanceWeight ?? roll.netweight ?? 0) || 0
  }
  if (stage === "virgin_rm") {
    return Number(roll.netweight ?? 0) || 0
  }
  return 0
}

function filmAvailableKg(
  rolls: FilmStockRow[],
  itemId: number,
  size: number | null,
  micron: number | null
): number {
  let total = 0
  for (const roll of rolls) {
    if (roll.itemId !== itemId) continue
    const kg = filmRollKg(roll)
    if (!(kg > 0)) continue
    if (size != null && Number(roll.size) > 0 && !closeNum(Number(roll.size), size)) continue
    if (micron != null && Number(roll.micron) > 0 && !closeNum(Number(roll.micron), micron)) continue
    total += kg
  }
  return round2(total)
}

function chemAvailableKg(rows: ChemStockRow[], itemId: number): number {
  let total = 0
  for (const row of rows) {
    if (row.itemId !== itemId) continue
    const qty = availableQtyChem(row)
    if (qty > 0) total += qty
  }
  return round2(total)
}

/** Required RM kg = order qty × (layer GSM / total BOM GSM). Available is live stock. */
export function materialRowsFromBom(params: {
  bomLines: BomLine[]
  orderQtyKg: number
  filmStock: FilmStockRow[]
  chemStock: ChemStockRow[]
}): BomMaterialRow[] {
  const orderQty = Number(params.orderQtyKg)
  if (!(orderQty > 0)) return []

  const usable = params.bomLines.filter((line) => line.rmItemId != null && bomLineGsm(line) != null)
  const totalGsm = usable.reduce((sum, line) => sum + (bomLineGsm(line) ?? 0), 0)
  if (!(totalGsm > 0)) return []

  const grouped = new Map<string, BomMaterialRow>()
  for (const line of usable) {
    const rmItemId = line.rmItemId as number
    const gsm = bomLineGsm(line) as number
    const isFilm = isRmFilmGroup(line.rmItemGroup)
    const size = isFilm && line.size != null ? Number(line.size) : null
    const micron = isFilm && line.micron != null ? Number(line.micron) : null
    const key = isFilm
      ? `${rmItemId}|${size ?? ""}|${micron ?? ""}`
      : String(rmItemId)
    const existing = grouped.get(key)
    const stage = (line.operation || "").trim()
    if (existing) {
      existing.gsm = round2(existing.gsm + gsm)
      existing.requiredKg = round2(existing.requiredKg + orderQty * (gsm / totalGsm))
      if (stage && !existing.stages.includes(stage)) existing.stages.push(stage)
      continue
    }
    grouped.set(key, {
      key,
      rmItemId,
      itemCode: line.rmItemCode || "",
      itemName: line.rmItemName || "",
      itemGroup: line.rmItemGroup || "",
      isFilm,
      size,
      micron,
      gsm: round2(gsm),
      stages: stage ? [stage] : [],
      requiredKg: round2(orderQty * (gsm / totalGsm)),
      availableKg: isFilm
        ? filmAvailableKg(params.filmStock, rmItemId, size, micron)
        : chemAvailableKg(params.chemStock, rmItemId),
    })
  }

  return [...grouped.values()].sort((a, b) =>
    (a.itemCode || a.itemName).localeCompare(b.itemCode || b.itemName)
  )
}
