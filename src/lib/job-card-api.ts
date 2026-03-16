import api from "./axios"

export type JobCardPayload = {
  jobCardNumber: string
  workOrderId: number
  operation: string
  machineId: number
  operatorName: string
  shift: string
  inputQty?: number | null
  outputQty?: number | null
  wastageQty?: number | null
  inputRollCount?: number | null
  outputRollCount?: number | null
  startedAt?: string | null
  finishedAt?: string | null
}

type JobCardResponse = {
  id: number
  job_card_number: string
  work_order_id: number
  wo_number?: string | null
  party_name?: string | null
  item_name?: string | null
  operation: string
  machine_id: number
  machine_code?: string | null
  machine_name?: string | null
  operator_name: string
  shift: string
  input_qty?: number | null
  output_qty?: number | null
  wastage_qty?: number | null
  input_roll_count?: number | null
  output_roll_count?: number | null
  started_at?: string | null
  finished_at?: string | null
  created_by?: number
  created_at?: string
}

export const mapJobCard = (jc: JobCardResponse) => ({
  id: jc.id,
  jobCardNumber: jc.job_card_number,
  workOrderId: jc.work_order_id,
  woNumber: jc.wo_number,
  partyName: jc.party_name,
  itemName: jc.item_name,
  operation: jc.operation,
  machineId: jc.machine_id,
  machineCode: jc.machine_code,
  machineName: jc.machine_name,
  operatorName: jc.operator_name,
  shift: jc.shift,
  inputQty: jc.input_qty,
  outputQty: jc.output_qty,
  wastageQty: jc.wastage_qty,
  inputRollCount: jc.input_roll_count,
  outputRollCount: jc.output_roll_count,
  startedAt: jc.started_at,
  finishedAt: jc.finished_at,
  createdBy: jc.created_by,
  createdAt: jc.created_at,
})

export const getAllJobCards = async (
  skip = 0,
  limit = 100,
  workOrderId?: number,
  operation?: string
) => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  })
  if (workOrderId) {
    params.append("work_order_id", workOrderId.toString())
  }
  if (operation) {
    params.append("operation", operation)
  }
  const response = await api.get<JobCardResponse[]>(`/job-card/?${params.toString()}`)
  return response.data.map(mapJobCard)
}

export const getJobCard = async (jobCardId: number) => {
  const response = await api.get<JobCardResponse>(`/job-card/${jobCardId}`)
  return mapJobCard(response.data)
}

export const createJobCard = async (payload: JobCardPayload) => {
  const response = await api.post<JobCardResponse>("/job-card/", {
    job_card_number: payload.jobCardNumber,
    work_order_id: payload.workOrderId,
    operation: payload.operation,
    machine_id: payload.machineId,
    operator_name: payload.operatorName,
    shift: payload.shift,
    input_qty: payload.inputQty || null,
    output_qty: payload.outputQty || null,
    wastage_qty: payload.wastageQty || null,
    input_roll_count: payload.inputRollCount || null,
    output_roll_count: payload.outputRollCount || null,
    started_at: payload.startedAt || null,
    finished_at: payload.finishedAt || null,
  })
  return mapJobCard(response.data)
}

export const updateJobCard = async (jobCardId: number, payload: Partial<JobCardPayload>) => {
  const updatePayload: any = {}
  if (payload.jobCardNumber !== undefined) updatePayload.job_card_number = payload.jobCardNumber
  if (payload.workOrderId !== undefined) updatePayload.work_order_id = payload.workOrderId
  if (payload.operation !== undefined) updatePayload.operation = payload.operation
  if (payload.machineId !== undefined) updatePayload.machine_id = payload.machineId
  if (payload.operatorName !== undefined) updatePayload.operator_name = payload.operatorName
  if (payload.shift !== undefined) updatePayload.shift = payload.shift
  if (payload.inputQty !== undefined) updatePayload.input_qty = payload.inputQty || null
  if (payload.outputQty !== undefined) updatePayload.output_qty = payload.outputQty || null
  if (payload.wastageQty !== undefined) updatePayload.wastage_qty = payload.wastageQty || null
  if (payload.inputRollCount !== undefined) updatePayload.input_roll_count = payload.inputRollCount || null
  if (payload.outputRollCount !== undefined) updatePayload.output_roll_count = payload.outputRollCount || null
  if (payload.startedAt !== undefined) updatePayload.started_at = payload.startedAt || null
  if (payload.finishedAt !== undefined) updatePayload.finished_at = payload.finishedAt || null

  const response = await api.patch<JobCardResponse>(`/job-card/${jobCardId}`, updatePayload)
  return mapJobCard(response.data)
}

export const deleteJobCard = async (jobCardId: number) => {
  await api.delete(`/job-card/${jobCardId}`)
}

export type ScanRollResponse = {
  job_card: JobCardResponse
  work_order: { id: number; status: string; started_at: string | null }
  roll: {
    id: number
    barcode: string
    size?: number
    micron?: number
    netweight?: number
    issued: boolean
    issued_at: string | null
    // support both possible API keys for item name
    item_name?: string
    itemName?: string
  }
}

export const scanRoll = async (jobCardId: number, barcode: string): Promise<ScanRollResponse> => {
  const response = await api.post<ScanRollResponse>(`/job-card/${jobCardId}/scan-roll`, { barcode: barcode.trim() })
  return response.data
}

export type CurrentRoll = {
  id: number
  barcode: string
  size?: number
  micron?: number
  netweight?: number
  issued: boolean
  issued_at: string | null
  // support both possible API keys for item name
  item_name?: string
  itemName?: string
}

type CurrentRollResponse = {
  roll: CurrentRoll | null
}

export const getCurrentRoll = async (jobCardId: number): Promise<CurrentRoll | null> => {
  const response = await api.get<CurrentRollResponse>(`/job-card/${jobCardId}/current-roll`)
  return response.data.roll ?? null
}

/** Record roll job movement with direction 'out' (e.g. after creating WIP printed roll). */
export const addRollMovementOut = async (
  jobCardId: number,
  rollId: number,
  weightAtTime?: number
): Promise<void> => {
  await api.post(`/job-card/${jobCardId}/roll-movement-out`, {
    roll_id: rollId,
    weight_at_time: weightAtTime ?? undefined,
  })
}

/** Create a WIP printed roll and its out-movement in one request (roll always has a movement). */
export type AddPrintedRollPayload = {
  itemId: number
  rollno?: string
  size?: number
  micron?: number
  netweight?: number
  grossweight?: number
  gradeId?: number
  parentRollIds?: number[]
  weightAtTime?: number
}

export type AddPrintedRollResponse = {
  id: number
  barcode: string
  item_id: number
  item_name?: string | null
  size?: number | null
  micron?: number | null
  netweight?: number | null
  grossweight?: number | null
}

export const addPrintedRoll = async (
  jobCardId: number,
  payload: AddPrintedRollPayload
): Promise<AddPrintedRollResponse> => {
  const response = await api.post<AddPrintedRollResponse>(
    `/job-card/${jobCardId}/add-printed-roll`,
    {
      item_id: payload.itemId,
      rollno: payload.rollno ?? undefined,
      size: payload.size,
      micron: payload.micron,
      netweight: payload.netweight,
      grossweight: payload.grossweight,
      grade_id: payload.gradeId ?? undefined,
      parent_roll_ids: payload.parentRollIds?.length ? payload.parentRollIds : undefined,
      weight_at_time: payload.weightAtTime ?? undefined,
    }
  )
  return response.data
}

/** Create a WIP inspection roll and its out-movement in one request (roll always has a movement). */
export const addInspectionRoll = async (
  jobCardId: number,
  payload: AddPrintedRollPayload
): Promise<AddPrintedRollResponse> => {
  const response = await api.post<AddPrintedRollResponse>(
    `/job-card/${jobCardId}/add-inspection-roll`,
    {
      item_id: payload.itemId,
      rollno: payload.rollno ?? undefined,
      size: payload.size,
      micron: payload.micron,
      netweight: payload.netweight,
      grossweight: payload.grossweight,
      grade_id: payload.gradeId ?? undefined,
      parent_roll_ids: payload.parentRollIds?.length ? payload.parentRollIds : undefined,
      weight_at_time: payload.weightAtTime ?? undefined,
    }
  )
  return response.data
}

/** Create a WIP ECL roll and its out-movement in one request. */
export const addEclRoll = async (
  jobCardId: number,
  payload: AddPrintedRollPayload
): Promise<AddPrintedRollResponse> => {
  const response = await api.post<AddPrintedRollResponse>(
    `/job-card/${jobCardId}/add-ecl-roll`,
    {
      item_id: payload.itemId,
      rollno: payload.rollno ?? undefined,
      size: payload.size,
      micron: payload.micron,
      netweight: payload.netweight,
      grossweight: payload.grossweight,
      grade_id: payload.gradeId ?? undefined,
      parent_roll_ids: payload.parentRollIds?.length ? payload.parentRollIds : undefined,
      weight_at_time: payload.weightAtTime ?? undefined,
    }
  )
  return response.data
}

/** Create a WIP lamination roll and its out-movement in one request. */
export const addLaminationRoll = async (
  jobCardId: number,
  payload: AddPrintedRollPayload
): Promise<AddPrintedRollResponse> => {
  const response = await api.post<AddPrintedRollResponse>(
    `/job-card/${jobCardId}/add-lamination-roll`,
    {
      item_id: payload.itemId,
      rollno: payload.rollno ?? undefined,
      size: payload.size,
      micron: payload.micron,
      netweight: payload.netweight,
      grossweight: payload.grossweight,
      grade_id: payload.gradeId ?? undefined,
      parent_roll_ids: payload.parentRollIds?.length ? payload.parentRollIds : undefined,
      weight_at_time: payload.weightAtTime ?? undefined,
    }
  )
  return response.data
}

/** Create a slitting (finished) roll and its out-movement in one request. */
export const addSlittingRoll = async (
  jobCardId: number,
  payload: AddPrintedRollPayload
): Promise<AddPrintedRollResponse> => {
  const response = await api.post<AddPrintedRollResponse>(
    `/job-card/${jobCardId}/add-slitting-roll`,
    {
      item_id: payload.itemId,
      rollno: payload.rollno ?? undefined,
      size: payload.size,
      micron: payload.micron,
      netweight: payload.netweight,
      grossweight: payload.grossweight,
      grade_id: payload.gradeId ?? undefined,
      parent_roll_ids: payload.parentRollIds?.length ? payload.parentRollIds : undefined,
      weight_at_time: payload.weightAtTime ?? undefined,
    }
  )
  return response.data
}

