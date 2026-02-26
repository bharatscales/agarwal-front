import api from "./axios"

export type ChemItemGroup = "ink" | "adhesive" | "chemical"

/** Payload for create/update chem stock (stock entry page). */
export type ChemStockPayload = {
  itemId: number
  color?: string
  qty?: number
  uomId?: number
  stockVoucherId: number
}

export type ChemStockRow = {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  color: string
  qty: number
  uomId: number
  uom: string
  stockVoucherId: number
  issued: boolean
  issuedAt: string | null
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
  issued?: boolean
  issued_at?: string | null
}

const mapChemStock = (row: ChemStockResponse): ChemStockRow => ({
  id: row.id,
  itemId: row.item_id ?? 0,
  itemCode: row.item_code ?? "",
  itemName: row.item_name ?? "",
  color: row.color ?? "",
  qty: row.qty ?? 0,
  uomId: row.uom_id ?? 0,
  uom: row.uom ?? "",
  stockVoucherId: row.stock_voucher_id ?? 0,
  issued: row.issued ?? false,
  issuedAt: row.issued_at ?? null,
})

export const getAllChemStock = async (
  skip = 0,
  limit = 5000,
  itemGroup: ChemItemGroup,
  issued?: boolean
): Promise<ChemStockRow[]> => {
  const params: { skip: number; limit: number; item_group: string; issued?: boolean } = {
    skip,
    limit,
    item_group: itemGroup,
  }
  if (issued !== undefined) params.issued = issued
  const response = await api.get<ChemStockResponse[]>(`/chem-stock/`, { params })
  return response.data.map(mapChemStock)
}

export const getChemStockByVoucher = async (voucherId: number): Promise<ChemStockRow[]> => {
  const response = await api.get<ChemStockResponse[]>(`/chem-stock/voucher/${voucherId}`)
  return response.data.map(mapChemStock)
}

export const createChemStock = async (payload: ChemStockPayload): Promise<ChemStockRow> => {
  const response = await api.post<ChemStockResponse>("/chem-stock/", {
    item_id: payload.itemId,
    color: payload.color ?? null,
    qty: payload.qty ?? null,
    uom_id: payload.uomId ?? null,
    stock_voucher_id: payload.stockVoucherId,
  })
  return mapChemStock(response.data)
}

export const updateChemStock = async (
  chemStockId: number,
  payload: Partial<ChemStockPayload>
): Promise<ChemStockRow> => {
  const body: Record<string, unknown> = {}
  if (payload.itemId !== undefined) body.item_id = payload.itemId
  if (payload.color !== undefined) body.color = payload.color
  if (payload.qty !== undefined) body.qty = payload.qty
  if (payload.uomId !== undefined) body.uom_id = payload.uomId
  const response = await api.patch<ChemStockResponse>(`/chem-stock/${chemStockId}`, body)
  return mapChemStock(response.data)
}

export const deleteChemStock = async (chemStockId: number): Promise<void> => {
  await api.delete(`/chem-stock/${chemStockId}`)
}

export const bulkIssueChemStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/chem-stock/bulk-issue", { ids })
  return response.data
}

export const bulkRestoreChemStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/chem-stock/bulk-restore", { ids })
  return response.data
}

export const exportChemStockItemWiseXlsx = async (
  itemGroup: ChemItemGroup,
  issued?: boolean
): Promise<Blob> => {
  const params: { item_group: string; issued?: boolean } = { item_group: itemGroup }
  if (issued !== undefined) params.issued = issued
  const response = await api.get("/chem-stock/export/item-wise", {
    params,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

export const exportChemStockSummaryXlsx = async (
  itemCode: string | null | undefined,
  itemGroup: ChemItemGroup,
  issued?: boolean
): Promise<Blob> => {
  const params: { item_group: string; item_code?: string; issued?: boolean } = { item_group: itemGroup }
  if (itemCode != null && itemCode.trim() !== "") params.item_code = itemCode.trim()
  if (issued !== undefined) params.issued = issued
  const response = await api.get("/chem-stock/export/summary", {
    params,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

export function getChemGroupLabel(group: ChemItemGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1)
}
