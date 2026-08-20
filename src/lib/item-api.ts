import api from "./axios"

export type RoutingStep = {
  sno: number
  operation: string
}

type ItemResponse = {
  id: number
  item_code: string
  name: string
  item_group: string
  party_id?: number | null
  party_code?: string | null
  party_name?: string | null
  density?: number | null
  uom_id?: number | null
  uom?: string | null
  routing?: RoutingStep[] | null
  created_by?: number | null
  created_at?: string
}

export type Item = {
  id: number
  itemCode: string
  itemName: string
  itemGroup: string
  partyId?: number | null
  partyCode?: string | null
  partyName?: string | null
  density?: number | null
  routing: RoutingStep[]
  uom: string
}

/** Manufacturing stages allowed on FG variety BOM. */
export const FG_BOM_STAGE_OPERATIONS = [
  "Printing",
  "Inspection",
  "ECL",
  "Lamination",
  "Slitting",
] as const

export type FgBomStageOperation = (typeof FG_BOM_STAGE_OPERATIONS)[number]

/** ECL and Lamination may be added multiple times per FG variety. */
export const FG_BOM_MULTI_STAGE_OPERATIONS = ["ECL", "Lamination"] as const

/** Stages that exist for routing only and have no RM structure. */
export const FG_BOM_NO_RM_OPERATIONS = ["Inspection", "Slitting"] as const

export type BomLinePayload = {
  operation: string
  stageSeq: number
  layerNo: number
  rmItemId?: number | null
  size?: number | null
  micron?: number | null
  gsm?: number | null
}

type BomLineResponse = {
  id: number
  fg_item_id: number
  operation: string
  stage_seq: number
  layer_no: number
  rm_item_id?: number | null
  rm_item_code?: string | null
  rm_item_name?: string | null
  rm_item_group?: string | null
  rm_density?: number | null
  size?: number | null
  micron?: number | null
  gsm?: number | null
}

export type BomLine = {
  id: number
  fgItemId: number
  operation: string
  stageSeq: number
  layerNo: number
  rmItemId?: number | null
  rmItemCode?: string | null
  rmItemName?: string | null
  rmItemGroup?: string | null
  rmDensity?: number | null
  size?: number | null
  micron?: number | null
  gsm?: number | null
}

const mapBomLine = (row: BomLineResponse): BomLine => ({
  id: row.id,
  fgItemId: row.fg_item_id,
  operation: row.operation,
  stageSeq: row.stage_seq ?? 1,
  layerNo: row.layer_no,
  rmItemId: row.rm_item_id ?? null,
  rmItemCode: row.rm_item_code ?? null,
  rmItemName: row.rm_item_name ?? null,
  rmItemGroup: row.rm_item_group ?? null,
  rmDensity: row.rm_density ?? null,
  size: row.size ?? null,
  micron: row.micron ?? null,
  gsm: row.gsm ?? null,
})

export const getItemBom = async (itemId: number): Promise<BomLine[]> => {
  const response = await api.get<BomLineResponse[]>(`/item/${itemId}/bom`)
  return response.data.map(mapBomLine)
}

export type ItemPayload = {
  itemCode: string
  itemName: string
  itemGroup: string
  partyId?: number | null
  density?: number | null
  uomId?: number
  bomLines?: BomLinePayload[]
}

const mapItem = (item: ItemResponse): Item => ({
  id: item.id,
  itemCode: item.item_code,
  itemName: item.name,
  itemGroup: item.item_group,
  partyId: item.party_id,
  partyCode: item.party_code,
  partyName: item.party_name,
  density: item.density ?? null,
  routing: Array.isArray(item.routing) ? item.routing : [],
  uom: item.uom || "",
})

export const getItems = async (skip = 0, limit = 100): Promise<Item[]> => {
  const response = await api.get<ItemResponse[]>(`/item/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapItem)
}

export type MenuItem = { id: number; item_code: string; name: string }

export const getItemsByGroupForMenu = async (group: string): Promise<MenuItem[]> => {
  const response = await api.get<MenuItem[]>(`/item/menu/by-group`, {
    params: { group },
  })
  return response.data
}

/** FG variety items for the given party (for work order item dropdown). */
export const getItemsFgVarietyByParty = async (partyId: number): Promise<Item[]> => {
  const response = await api.get<ItemResponse[]>(`/meta/items-fg-variety-by-party`, {
    params: { party_id: partyId },
  })
  return response.data.map(mapItem)
}

const bomLinesBody = (lines: BomLinePayload[]) =>
  lines.map((l) => ({
    operation: l.operation,
    stage_seq: l.stageSeq,
    layer_no: l.layerNo,
    rm_item_id: l.rmItemId ?? null,
    size: l.size ?? null,
    micron: l.micron ?? null,
    gsm: l.gsm ?? null,
  }))

export const createItem = async (payload: ItemPayload) => {
  const body: Record<string, unknown> = {
    item_code: payload.itemCode,
    name: payload.itemName,
    item_group: payload.itemGroup,
    party_id: payload.partyId ?? null,
    density: payload.density ?? null,
    uom_id: payload.uomId || null,
  }
  if (payload.bomLines !== undefined) {
    body.bom_lines = bomLinesBody(payload.bomLines)
  }
  const response = await api.post<ItemResponse>("/item/", body)
  return mapItem(response.data)
}

export const updateItem = async (itemId: number, payload: Partial<ItemPayload>) => {
  const body: Record<string, unknown> = {}
  if (payload.itemCode !== undefined) body.item_code = payload.itemCode
  if (payload.itemName !== undefined) body.name = payload.itemName
  if (payload.itemGroup !== undefined) body.item_group = payload.itemGroup
  if (payload.partyId !== undefined) body.party_id = payload.partyId ?? null
  if (payload.density !== undefined) body.density = payload.density ?? null
  if (payload.uomId !== undefined) body.uom_id = payload.uomId
  if (payload.bomLines !== undefined) body.bom_lines = bomLinesBody(payload.bomLines)
  const response = await api.patch<ItemResponse>(`/item/${itemId}`, body)
  return mapItem(response.data)
}

export const deleteItem = async (itemId: number) => {
  await api.delete(`/item/${itemId}`)
}
