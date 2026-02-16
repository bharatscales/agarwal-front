import api from "./axios"

export type RollsStockPayload = {
  itemId: number
  rollno?: string
  size?: number
  micron?: number
  netweight?: number
  grossweight?: number
  stockVoucherId: number
}

type RollsStockResponse = {
  id: number
  item_id: number | null
  item_code?: string | null
  item_name?: string | null
  barcode?: string | null
  rollno?: string | null
  size?: number | null
  micron?: number | null
  netweight?: number | null
  grossweight?: number | null
  stock_voucher_id?: number | null
}

const mapRollsStock = (rollsStock: RollsStockResponse) => ({
  id: rollsStock.id,
  itemId: rollsStock.item_id ?? 0,
  itemCode: rollsStock.item_code ?? "",
  itemName: rollsStock.item_name ?? "",
  barcode: rollsStock.barcode ?? "",
  rollno: rollsStock.rollno ?? "",
  size: rollsStock.size ?? 0,
  micron: rollsStock.micron ?? 0,
  netweight: rollsStock.netweight ?? 0,
  grossweight: rollsStock.grossweight ?? 0,
  stockVoucherId: rollsStock.stock_voucher_id ?? 0,
})

export const getRollsStockByVoucher = async (voucherId: number) => {
  const response = await api.get<RollsStockResponse[]>(
    `/rolls-stock/voucher/${voucherId}`
  )
  return response.data.map(mapRollsStock)
}

export const createRollsStock = async (payload: RollsStockPayload) => {
  const response = await api.post<RollsStockResponse>("/rolls-stock/", {
    item_id: payload.itemId,
    rollno: payload.rollno,
    size: payload.size,
    micron: payload.micron,
    netweight: payload.netweight,
    grossweight: payload.grossweight,
    stock_voucher_id: payload.stockVoucherId,
  })
  return mapRollsStock(response.data)
}

export const updateRollsStock = async (rollsStockId: number, payload: Partial<RollsStockPayload>) => {
  const response = await api.patch<RollsStockResponse>(`/rolls-stock/${rollsStockId}`, {
    item_id: payload.itemId,
    rollno: payload.rollno,
    size: payload.size,
    micron: payload.micron,
    netweight: payload.netweight,
    grossweight: payload.grossweight,
  })
  return mapRollsStock(response.data)
}

export const deleteRollsStock = async (rollsStockId: number) => {
  await api.delete(`/rolls-stock/${rollsStockId}`)
}

