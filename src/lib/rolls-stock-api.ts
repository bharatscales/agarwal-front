import api from "./axios"

export type RollsStockPayload = {
  itemId: number
  rollno?: string
  size?: number
  micron?: number
  netweight?: number
  grossweight?: number
  wastage?: number
  gradeId?: number
  /** Optional: for RM stock entries; WIP rolls from production usually should not link to a stock voucher. */
  stockVoucherId?: number
  stage?: string
  /** Single parent (backward compatible). */
  parentRollId?: number
  /** Multiple parents: use when creating a roll from multiple parent rolls. */
  parentRollIds?: number[]
}

type RollsStockResponse = {
  id: number
  item_id: number | null
  item_code?: string | null
  item_name?: string | null
  vendor_code?: string | null
  grade_id?: number | null
  grade?: string | null
  barcode?: string | null
  rollno?: string | null
  size?: number | null
  micron?: number | null
  netweight?: number | null
  grossweight?: number | null
  wastage?: number | null
  stock_voucher_id?: number | null
  invoice_no?: string | null
  invoice_date?: string | null
  issued?: boolean
  issued_at?: string | null
  stage?: string | null
  parent_roll_id?: number | null
  parent_roll_ids?: number[] | null
  consumed?: boolean
  consumed_at?: string | null
  job_card_number?: string | null
}

const mapRollsStock = (rollsStock: RollsStockResponse) => ({
  id: rollsStock.id,
  itemId: rollsStock.item_id ?? 0,
  itemCode: rollsStock.item_code ?? "",
  itemName: rollsStock.item_name ?? "",
  vendorCode: rollsStock.vendor_code ?? "",
  gradeId: rollsStock.grade_id ?? undefined,
  grade: rollsStock.grade ?? "",
  barcode: rollsStock.barcode ?? "",
  rollno: rollsStock.rollno ?? "",
  size: rollsStock.size ?? 0,
  micron: rollsStock.micron ?? 0,
  netweight: rollsStock.netweight ?? 0,
  grossweight: rollsStock.grossweight ?? 0,
  wastage: rollsStock.wastage ?? 0,
  stockVoucherId: rollsStock.stock_voucher_id ?? 0,
  invoiceNo: rollsStock.invoice_no ?? "",
  invoiceDate: rollsStock.invoice_date ?? "",
  issued: rollsStock.issued ?? false,
  issuedAt: rollsStock.issued_at ?? null,
  stage: rollsStock.stage ?? null,
  parentRollId: rollsStock.parent_roll_id ?? null,
  parentRollIds: rollsStock.parent_roll_ids ?? null,
  consumed: rollsStock.consumed ?? false,
  consumedAt: rollsStock.consumed_at ?? null,
  jobCardNumber: rollsStock.job_card_number ?? null,
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
  issued?: boolean,
  stage?: string
) => {
  const params: { skip: number; limit: number; issued?: boolean; stage?: string } = {
    skip,
    limit,
  }
  if (issued !== undefined) params.issued = issued
  if (stage != null && stage !== "") params.stage = stage
  const response = await api.get<RollsStockResponse[]>(`/rolls-stock/`, {
    params,
  })
  return response.data.map(mapRollsStock)
}

export const createRollsStock = async (payload: RollsStockPayload) => {
  const body: Record<string, unknown> = {
    item_id: payload.itemId,
    rollno: payload.rollno,
    size: payload.size,
    micron: payload.micron,
    netweight: payload.netweight,
    grossweight: payload.grossweight,
    wastage: payload.wastage,
    grade_id: payload.gradeId,
    stock_voucher_id: payload.stockVoucherId,
    stage: payload.stage,
  }
  if (payload.parentRollIds != null && payload.parentRollIds.length > 0) {
    body.parent_roll_ids = payload.parentRollIds
  } else if (payload.parentRollId != null) {
    body.parent_roll_id = payload.parentRollId
  }
  const response = await api.post<RollsStockResponse>("/rolls-stock/", body)
  return mapRollsStock(response.data)
}

export const updateRollsStock = async (
  rollsStockId: number,
  payload: Partial<RollsStockPayload> & { consumed?: boolean }
) => {
  const body: Record<string, unknown> = {
    item_id: payload.itemId,
    rollno: payload.rollno,
    size: payload.size,
    micron: payload.micron,
    netweight: payload.netweight,
    grossweight: payload.grossweight,
    wastage: payload.wastage,
    grade_id: payload.gradeId,
    stage: payload.stage,
    parent_roll_id: payload.parentRollId,
  }
  if (payload.consumed !== undefined) body.consumed = payload.consumed
  const response = await api.patch<RollsStockResponse>(`/rolls-stock/${rollsStockId}`, body)
  return mapRollsStock(response.data)
}

export const getRollsStockById = async (id: number) => {
  const response = await api.get<RollsStockResponse>(`/rolls-stock/${id}`)
  return mapRollsStock(response.data)
}

/** Look up a roll by barcode (for inspection scan → add job card). Allowed for Inspection and Stock/Floor. */
export const getRollByBarcode = async (barcode: string) => {
  const trimmed = (barcode || "").trim()
  if (!trimmed) return null
  try {
    const response = await api.get<RollsStockResponse>(
      `/rolls-stock/by-barcode/${encodeURIComponent(trimmed)}`
    )
    return mapRollsStock(response.data)
  } catch {
    return null
  }
}

/** Get work order linked to a roll by barcode (child wip_printed → parent → job card → work order). For inspection add job card. */
export const getWorkOrderByRollBarcode = async (
  barcode: string
): Promise<{ workOrderId: number; woNumber: string | null } | null> => {
  const trimmed = (barcode || "").trim()
  if (!trimmed) return null
  try {
    const response = await api.get<{ work_order_id: number; wo_number: string | null }>(
      `/rolls-stock/by-barcode/${encodeURIComponent(trimmed)}/work-order`
    )
    return {
      workOrderId: response.data.work_order_id,
      woNumber: response.data.wo_number ?? null,
    }
  } catch {
    return null
  }
}

/** Fetch rolls whose parent_roll_id is in the given list (e.g. children of consumed/loaded rolls). */
export const getRollsStockByParentIds = async (
  parentRollIds: number[],
  stage?: string
) => {
  if (parentRollIds.length === 0) return []
  const params = new URLSearchParams({ parent_roll_ids: parentRollIds.join(",") })
  if (stage != null && stage !== "") params.set("stage", stage)
  const response = await api.get<RollsStockResponse[]>(`/rolls-stock/by-parent`, {
    params,
  })
  return response.data.map(mapRollsStock)
}

/** Fetch rolls linked to a work order via parent roll in-movements (e.g. all produced rolls for WO). */
export const getRollsStockByWorkOrder = async (
  workOrderId: number,
  stage?: string
) => {
  const params: Record<string, string> = {}
  if (stage != null && stage !== "") params.stage = stage
  const response = await api.get<RollsStockResponse[]>(
    `/rolls-stock/by-work-order/${workOrderId}`,
    { params: Object.keys(params).length ? params : undefined }
  )
  return response.data.map(mapRollsStock)
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
 * When stage is provided (e.g. "virgin_rm"), exports only rolls with that stage.
 * Returns blob for download; server generates the .xlsx.
 */
export const exportRollsStockItemWiseXlsx = async (
  issued?: boolean,
  stage?: string
): Promise<Blob> => {
  const params: { issued?: boolean; stage?: string } = {}
  if (issued !== undefined) params.issued = issued
  if (stage != null && stage !== "") params.stage = stage
  const response = await api.get("/rolls-stock/export/item-wise", {
    params: Object.keys(params).length ? params : undefined,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

/**
 * Request summary export from server: single sheet grouped by (item code, micron, size).
 * When itemCode is provided, export contains only that item's summary; otherwise all items.
 * When issued is false, exports only non-issued rolls; when true, only issued.
 * When stage is provided (e.g. "virgin_rm"), exports only rolls with that stage.
 * Returns blob for download.
 */
export const exportRollsStockSummaryXlsx = async (
  itemCode?: string | null,
  issued?: boolean,
  stage?: string
): Promise<Blob> => {
  const params: { item_code?: string; issued?: boolean; stage?: string } = {}
  if (itemCode != null && itemCode.trim() !== "") params.item_code = itemCode.trim()
  if (issued !== undefined) params.issued = issued
  if (stage != null && stage !== "") params.stage = stage
  const response = await api.get("/rolls-stock/export/summary", {
    params: Object.keys(params).length ? params : undefined,
    responseType: "blob",
    timeout: 120000,
  })
  return response.data as Blob
}

