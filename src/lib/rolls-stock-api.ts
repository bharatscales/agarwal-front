import api from "./axios"

export type RollsStockPayload = {
  itemId: number
  rollno?: string
  size?: number
  micron?: number
  netweight?: number
  meter?: number
  grossweight?: number
  wastage?: number
  wastageReason?: string | null
  noOfTag?: number | null
  noOfCuts?: number | null
  operatorName?: string | null
  shift?: string | null
  remark?: string | null
  plainWastage?: number
  printedWastage?: number
  inkGsm?: number
  inkGsmByInkWt?: number
  balanceWeight?: number | null
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
  meter?: number | null
  grossweight?: number | null
  wastage?: number | null
  wastage_reason?: string | null
  no_of_tag?: number | null
  no_of_cuts?: number | null
  operator_name?: string | null
  shift?: string | null
  remark?: string | null
  plain_wastage?: number | null
  printed_wastage?: number | null
  ink_gsm?: number | null
  ink_gsm_by_ink_wt?: number | null
  balance_weight?: number | null
  parent_netweight?: number | null
  parent_meter?: number | null
  parent_balance_weight?: number | null
  item_density?: number | null
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
  meter: rollsStock.meter != null ? Math.round(rollsStock.meter) : 0,
  grossweight: rollsStock.grossweight ?? 0,
  wastage: rollsStock.wastage ?? 0,
  wastageReason: rollsStock.wastage_reason ?? null,
  noOfTag: rollsStock.no_of_tag ?? null,
  noOfCuts: rollsStock.no_of_cuts ?? null,
  operatorName: rollsStock.operator_name ?? null,
  shift: rollsStock.shift ?? null,
  remark: rollsStock.remark ?? null,
  plainWastage: rollsStock.plain_wastage ?? null,
  printedWastage: rollsStock.printed_wastage ?? null,
  inkGsm: rollsStock.ink_gsm ?? null,
  inkGsmByInkWt: rollsStock.ink_gsm_by_ink_wt ?? null,
  balanceWeight: rollsStock.balance_weight ?? null,
  parentNetweight: rollsStock.parent_netweight ?? null,
  parentMeter: rollsStock.parent_meter != null ? Math.round(rollsStock.parent_meter) : null,
  parentBalanceWeight: rollsStock.parent_balance_weight ?? null,
  itemDensity: rollsStock.item_density ?? null,
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
    meter: payload.meter,
    grossweight: payload.grossweight,
    wastage: payload.wastage,
    wastage_reason: payload.wastageReason,
    no_of_tag: payload.noOfTag,
    no_of_cuts: payload.noOfCuts,
    operator_name: payload.operatorName,
    shift: payload.shift,
    remark: payload.remark,
    plain_wastage: payload.plainWastage,
    printed_wastage: payload.printedWastage,
    ink_gsm: payload.inkGsm,
    ink_gsm_by_ink_wt: payload.inkGsmByInkWt,
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
    meter: payload.meter,
    grossweight: payload.grossweight,
    wastage: payload.wastage,
    grade_id: payload.gradeId,
    stage: payload.stage,
    parent_roll_id: payload.parentRollId,
  }
  if (payload.consumed !== undefined) body.consumed = payload.consumed
  if ("balanceWeight" in payload) body.balance_weight = payload.balanceWeight
  if ("plainWastage" in payload) body.plain_wastage = payload.plainWastage
  if ("printedWastage" in payload) body.printed_wastage = payload.printedWastage
  if ("inkGsm" in payload) body.ink_gsm = payload.inkGsm
  if ("inkGsmByInkWt" in payload) body.ink_gsm_by_ink_wt = payload.inkGsmByInkWt
  if ("wastageReason" in payload) body.wastage_reason = payload.wastageReason
  if ("noOfTag" in payload) body.no_of_tag = payload.noOfTag
  if ("noOfCuts" in payload) body.no_of_cuts = payload.noOfCuts
  if ("operatorName" in payload) body.operator_name = payload.operatorName
  if ("shift" in payload) body.shift = payload.shift
  if ("remark" in payload) body.remark = payload.remark
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

