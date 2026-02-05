import api from "./axios"

type ItemResponse = {
  id: number
  item_code: string
  name: string
  item_group: string
  uom_id?: number | null
  uom?: string | null
  created_by?: number | null
  created_at?: string
}

export type Item = {
  id: number
  itemCode: string
  itemName: string
  itemGroup: string
  uom: string
}

export type ItemPayload = {
  itemCode: string
  itemName: string
  itemGroup: string
  uomId?: number
}

const mapItem = (item: ItemResponse): Item => ({
  id: item.id,
  itemCode: item.item_code,
  itemName: item.name,
  itemGroup: item.item_group,
  uom: item.uom || "",
})

export const getItems = async (skip = 0, limit = 100): Promise<Item[]> => {
  const response = await api.get<ItemResponse[]>(`/item/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapItem)
}

export const createItem = async (payload: ItemPayload) => {
  const response = await api.post<ItemResponse>("/item/", {
    item_code: payload.itemCode,
    name: payload.itemName,
    item_group: payload.itemGroup,
    uom_id: payload.uomId || null,
  })
  return mapItem(response.data)
}

export const updateItem = async (itemId: number, payload: Partial<ItemPayload>) => {
  const response = await api.patch<ItemResponse>(`/item/${itemId}`, {
    item_code: payload.itemCode,
    name: payload.itemName,
    item_group: payload.itemGroup,
    uom_id: payload.uomId,
  })
  return mapItem(response.data)
}

export const deleteItem = async (itemId: number) => {
  await api.delete(`/item/${itemId}`)
}

