import api from "./axios"

export type ChemStockPayload = {
  itemId: number
  color?: string
  qty?: number
  uomId?: number
  stockVoucherId: number
}

type ChemStockResponse = {
  id: number
  item_id: number | null
  item_code?: string | null
  item_name?: string | null
  color?: string | null
  qty?: number | null
  uom_id?: number | null
  uom?: string | null
  stock_voucher_id?: number | null
}

const mapChemStock = (chemStock: ChemStockResponse) => ({
  id: chemStock.id,
  itemId: chemStock.item_id ?? 0,
  itemCode: chemStock.item_code ?? "",
  itemName: chemStock.item_name ?? "",
  color: chemStock.color ?? "",
  qty: chemStock.qty ?? 0,
  uomId: chemStock.uom_id ?? 0,
  uom: chemStock.uom ?? "",
  stockVoucherId: chemStock.stock_voucher_id ?? 0,
})

export const getChemStockByVoucher = async (voucherId: number) => {
  const response = await api.get<ChemStockResponse[]>(
    `/chem-stock/voucher/${voucherId}`
  )
  return response.data.map(mapChemStock)
}

export const createChemStock = async (payload: ChemStockPayload) => {
  const response = await api.post<ChemStockResponse>("/chem-stock/", {
    item_id: payload.itemId,
    color: payload.color,
    qty: payload.qty,
    uom_id: payload.uomId,
    stock_voucher_id: payload.stockVoucherId,
  })
  return mapChemStock(response.data)
}

export const updateChemStock = async (chemStockId: number, payload: Partial<ChemStockPayload>) => {
  const response = await api.patch<ChemStockResponse>(`/chem-stock/${chemStockId}`, {
    item_id: payload.itemId,
    color: payload.color,
    qty: payload.qty,
    uom_id: payload.uomId,
  })
  return mapChemStock(response.data)
}

export const deleteChemStock = async (chemStockId: number) => {
  await api.delete(`/chem-stock/${chemStockId}`)
}

