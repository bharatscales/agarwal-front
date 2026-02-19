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

const mapJobCard = (jc: JobCardResponse) => ({
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

export const getAllJobCards = async (skip = 0, limit = 100, workOrderId?: number) => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  })
  if (workOrderId) {
    params.append("work_order_id", workOrderId.toString())
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

