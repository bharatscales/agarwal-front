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
  vendor_code?: string | null
  barcode?: string | null
  rollno?: string | null
  size?: number | null
  micron?: number | null
  netweight?: number | null
  grossweight?: number | null
  stock_voucher_id?: number | null
  issued?: boolean
  issued_at?: string | null
}

const mapRollsStock = (rollsStock: RollsStockResponse) => ({
  id: rollsStock.id,
  itemId: rollsStock.item_id ?? 0,
  itemCode: rollsStock.item_code ?? "",
  itemName: rollsStock.item_name ?? "",
  vendorCode: rollsStock.vendor_code ?? "",
  barcode: rollsStock.barcode ?? "",
  rollno: rollsStock.rollno ?? "",
  size: rollsStock.size ?? 0,
  micron: rollsStock.micron ?? 0,
  netweight: rollsStock.netweight ?? 0,
  grossweight: rollsStock.grossweight ?? 0,
  stockVoucherId: rollsStock.stock_voucher_id ?? 0,
  issued: rollsStock.issued ?? false,
  issuedAt: rollsStock.issued_at ?? null,
})

export const getRollsStockByVoucher = async (voucherId: number) => {
  const response = await api.get<RollsStockResponse[]>(
    `/rolls-stock/voucher/${voucherId}`
  )
  return response.data.map(mapRollsStock)
}

export const getAllRollsStock = async (
  skip = 0,
  limit = 1000,
  issued?: boolean
) => {
  const params: { skip: number; limit: number; issued?: boolean } = {
    skip,
    limit,
  }
  if (issued !== undefined) params.issued = issued
  const response = await api.get<RollsStockResponse[]>(`/rolls-stock/`, {
    params,
  })
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

/** Mark selected rolls as issued (bulk). Returns count updated. */
export const bulkIssueRollsStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/rolls-stock/bulk-issue", { ids })
  return response.data
}

/** Restore selected rolls (set issued=false, issued_at=null). Returns count updated. */
export const bulkRestoreRollsStock = async (ids: number[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>("/rolls-stock/bulk-restore", { ids })
  return response.data
}

/**
 * Request full item-wise export from server (full dataset, no pagination).
 * When issued is false, exports only non-issued rolls; when true, only issued.
 * Returns blob for download; server generates the .xlsx.
 */
export const exportRollsStockItemWiseXlsx = async (
  issued?: boolean
): Promise<Blob> => {
  const params = issued !== undefined ? { issued } : undefined
  const response = await api.get("/rolls-stock/export/item-wise", {
    params,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

/**
 * Request summary export from server: single sheet grouped by (item code, micron, size).
 * When itemCode is provided, export contains only that item's summary; otherwise all items.
 * When issued is false, exports only non-issued rolls; when true, only issued.
 * Returns blob for download.
 */
export const exportRollsStockSummaryXlsx = async (
  itemCode?: string | null,
  issued?: boolean
): Promise<Blob> => {
  const params: { item_code?: string; issued?: boolean } = {}
  if (itemCode != null && itemCode.trim() !== "") params.item_code = itemCode.trim()
  if (issued !== undefined) params.issued = issued
  const response = await api.get("/rolls-stock/export/summary", {
    params: Object.keys(params).length ? params : undefined,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

