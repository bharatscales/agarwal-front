/** Item groups treated as raw material (BOM structure layers). */
export const RM_ITEM_GROUP_SET = new Set([
  "rm film",
  "rm ink/adhesive/chemicals",
  "rm extrusion",
  "ink",
  "adhesive",
  "chemical",
])

const GSM_BOM_GROUP_SET = new Set([
  "rm ink/adhesive/chemicals",
  "rm extrusion",
  "ink",
  "adhesive",
  "chemical",
])

export function isRmItemGroup(g: string | null | undefined): boolean {
  return RM_ITEM_GROUP_SET.has((g ?? "").trim().toLowerCase())
}

export function isRmFilmGroup(g: string | null | undefined): boolean {
  return (g ?? "").trim().toLowerCase() === "rm film"
}

export function isGsmBomItemGroup(g: string | null | undefined): boolean {
  return GSM_BOM_GROUP_SET.has((g ?? "").trim().toLowerCase())
}
