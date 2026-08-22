import api from "./axios"

export type OrderBookPayload = {
  partyId: number
  itemId: number
  qty: number
  orderDate?: string | null
  totalGsm?: number | null
  size?: number | null
  structure?: string | null
  coilWidth?: number | null
  repeatLength?: number | null
  noOfPanel?: number | null
  remarks?: string | null
}

type OrderBookResponse = {
  id: number
  order_number?: string | null
  party_id?: number | null
  party_code?: string | null
  party_name?: string | null
  item_id?: number | null
  item_code?: string | null
  item_name?: string | null
  qty: number
  order_date?: string | null
  total_gsm?: number | null
  size?: number | null
  structure?: string | null
  coil_width?: number | null
  repeat_length?: number | null
  no_of_panel?: number | null
  remarks?: string | null
  created_by?: number | null
  created_at?: string
}

const mapOrderBook = (row: OrderBookResponse) => ({
  id: row.id,
  orderNumber: row.order_number,
  partyId: row.party_id,
  partyCode: row.party_code,
  partyName: row.party_name,
  itemId: row.item_id,
  itemCode: row.item_code,
  itemName: row.item_name,
  qty: row.qty,
  orderDate: row.order_date,
  totalGsm: row.total_gsm ?? null,
  size: row.size ?? null,
  structure: row.structure ?? null,
  coilWidth: row.coil_width ?? null,
  repeatLength: row.repeat_length ?? null,
  noOfPanel: row.no_of_panel ?? null,
  remarks: row.remarks,
  createdBy: row.created_by,
  createdAt: row.created_at,
})

export const getAllOrderBooks = async (skip = 0, limit = 500) => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  })
  const response = await api.get<OrderBookResponse[]>(`/order-book/?${params.toString()}`)
  return response.data.map(mapOrderBook)
}

export const createOrderBook = async (payload: OrderBookPayload) => {
  const requestPayload: Record<string, unknown> = {
    party_id: payload.partyId,
    item_id: payload.itemId,
    qty: payload.qty,
  }
  if (payload.orderDate) requestPayload.order_date = payload.orderDate
  if (payload.totalGsm !== undefined) requestPayload.total_gsm = payload.totalGsm
  if (payload.size !== undefined) requestPayload.size = payload.size
  if (payload.structure !== undefined) requestPayload.structure = payload.structure || null
  if (payload.coilWidth !== undefined) requestPayload.coil_width = payload.coilWidth
  if (payload.repeatLength !== undefined) requestPayload.repeat_length = payload.repeatLength
  if (payload.noOfPanel !== undefined) requestPayload.no_of_panel = payload.noOfPanel
  if (payload.remarks !== undefined) requestPayload.remarks = payload.remarks || null

  const response = await api.post<OrderBookResponse>("/order-book/", requestPayload)
  return mapOrderBook(response.data)
}

export const updateOrderBook = async (orderBookId: number, payload: Partial<OrderBookPayload>) => {
  const updatePayload: Record<string, unknown> = {}
  if (payload.partyId !== undefined) updatePayload.party_id = payload.partyId
  if (payload.itemId !== undefined) updatePayload.item_id = payload.itemId
  if (payload.qty !== undefined) updatePayload.qty = payload.qty
  if (payload.orderDate !== undefined) updatePayload.order_date = payload.orderDate || null
  if (payload.totalGsm !== undefined) updatePayload.total_gsm = payload.totalGsm
  if (payload.size !== undefined) updatePayload.size = payload.size
  if (payload.structure !== undefined) updatePayload.structure = payload.structure || null
  if (payload.coilWidth !== undefined) updatePayload.coil_width = payload.coilWidth
  if (payload.repeatLength !== undefined) updatePayload.repeat_length = payload.repeatLength
  if (payload.noOfPanel !== undefined) updatePayload.no_of_panel = payload.noOfPanel
  if (payload.remarks !== undefined) updatePayload.remarks = payload.remarks || null

  const response = await api.patch<OrderBookResponse>(`/order-book/${orderBookId}`, updatePayload)
  return mapOrderBook(response.data)
}

export const deleteOrderBook = async (orderBookId: number) => {
  await api.delete(`/order-book/${orderBookId}`)
}
