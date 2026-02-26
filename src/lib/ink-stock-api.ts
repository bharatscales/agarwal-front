import api from "./axios"

export type InkStockRow = {
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

type InkStockResponse = {
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

const mapInkStock = (row: InkStockResponse): InkStockRow => ({
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

export const getAllInkStock = async (
  skip = 0,
  limit = 5000,
  issued?: boolean
): Promise<InkStockRow[]> => {
  const params: { skip: number; limit: number; item_group: string; issued?: boolean } = {
    skip,
    limit,
    item_group: "ink",
  }
  if (issued !== undefined) params.issued = issued
  const response = await api.get<InkStockResponse[]>(`/chem-stock/`, { params })
  return response.data.map(mapInkStock)
}

export const bulkIssueInkStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/chem-stock/bulk-issue", { ids })
  return response.data
}

export const bulkRestoreInkStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/chem-stock/bulk-restore", { ids })
  return response.data
}

export const exportInkStockItemWiseXlsx = async (issued?: boolean): Promise<Blob> => {
  const params: { item_group: string; issued?: boolean } = { item_group: "ink" }
  if (issued !== undefined) params.issued = issued
  const response = await api.get("/chem-stock/export/item-wise", {
    params,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

export const exportInkStockSummaryXlsx = async (
  itemCode?: string | null,
  issued?: boolean
): Promise<Blob> => {
  const params: { item_group: string; item_code?: string; issued?: boolean } = { item_group: "ink" }
  if (itemCode != null && itemCode.trim() !== "") params.item_code = itemCode.trim()
  if (issued !== undefined) params.issued = issued
  const response = await api.get("/chem-stock/export/summary", {
    params,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}
