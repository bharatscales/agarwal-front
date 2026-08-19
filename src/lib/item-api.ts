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

export type ItemPayload = {
  itemCode: string
  itemName: string
  itemGroup: string
  partyId?: number | null
  density?: number | null
  routing?: RoutingStep[]
  uomId?: number
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

export const createItem = async (payload: ItemPayload) => {
  const response = await api.post<ItemResponse>("/item/", {
    item_code: payload.itemCode,
    name: payload.itemName,
    item_group: payload.itemGroup,
    party_id: payload.partyId ?? null,
    density: payload.density ?? null,
    routing: payload.routing ?? [],
    uom_id: payload.uomId || null,
  })
  return mapItem(response.data)
}

export const updateItem = async (itemId: number, payload: Partial<ItemPayload>) => {
  const body: Record<string, unknown> = {}
  if (payload.itemCode !== undefined) body.item_code = payload.itemCode
  if (payload.itemName !== undefined) body.name = payload.itemName
  if (payload.itemGroup !== undefined) body.item_group = payload.itemGroup
  if (payload.partyId !== undefined) body.party_id = payload.partyId ?? null
  if (payload.density !== undefined) body.density = payload.density ?? null
  if (payload.routing !== undefined) body.routing = payload.routing
  if (payload.uomId !== undefined) body.uom_id = payload.uomId
  const response = await api.patch<ItemResponse>(`/item/${itemId}`, body)
  return mapItem(response.data)
}

export const deleteItem = async (itemId: number) => {
  await api.delete(`/item/${itemId}`)
}

