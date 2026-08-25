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

/** Map enum names / odd casing to the stored values, e.g. rm_extrusion → rm extrusion. */
export function canonicalItemGroup(g: string | null | undefined): string {
  const raw = (g ?? "").trim().toLowerCase()
  if (!raw) return ""
  const spaced = raw.replace(/_/g, " ")
  if (RM_ITEM_GROUP_SET.has(raw) || GSM_BOM_GROUP_SET.has(raw)) return raw
  if (raw === "rm_film" || spaced === "rm film") return "rm film"
  if (raw === "rm_extrusion" || spaced === "rm extrusion") return "rm extrusion"
  if (
    raw === "rm_ink_adhesive_chemicals" ||
    spaced === "rm ink adhesive chemicals" ||
    (spaced.includes("ink") && spaced.includes("adhesive") && spaced.includes("chemical"))
  ) {
    return "rm ink/adhesive/chemicals"
  }
  if (RM_ITEM_GROUP_SET.has(spaced)) return spaced
  return raw
}

export function isRmItemGroup(g: string | null | undefined): boolean {
  return RM_ITEM_GROUP_SET.has(canonicalItemGroup(g))
}

export function isRmFilmGroup(g: string | null | undefined): boolean {
  return canonicalItemGroup(g) === "rm film"
}

export function isGsmBomItemGroup(g: string | null | undefined): boolean {
  const group = canonicalItemGroup(g)
  return GSM_BOM_GROUP_SET.has(group) || (isRmItemGroup(group) && !isRmFilmGroup(group))
}
