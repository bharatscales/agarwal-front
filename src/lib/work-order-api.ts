import api from "./axios"

export type WorkOrderPayload = {
  woNumber?: string | null
  partyId: number
  itemId: number
  plannedQty?: number  // Optional
  priority?: string
  status?: string
  machineId: number  // Required
  operatorName: string  // Required
  shift: string  // Required
}

type WorkOrderResponse = {
  id: number
  wo_number?: string | null
  party_id?: number | null
  party_code?: string | null
  party_name?: string | null
  item_id?: number | null
  item_code?: string | null
  item_name?: string | null
  planned_qty: number
  produced_qty: number
  status: string
  priority?: string | null
  created_by?: number
  created_at?: string
  started_at?: string | null
  completed_at?: string | null
}

const mapWorkOrder = (wo: WorkOrderResponse) => ({
  id: wo.id,
  woNumber: wo.wo_number,
  partyId: wo.party_id,
  partyCode: wo.party_code,
  partyName: wo.party_name,
  itemId: wo.item_id,
  itemCode: wo.item_code,
  itemName: wo.item_name,
  plannedQty: wo.planned_qty,
  producedQty: wo.produced_qty,
  status: wo.status,
  priority: wo.priority,
  createdBy: wo.created_by,
  createdAt: wo.created_at,
  startedAt: wo.started_at,
  completedAt: wo.completed_at,
})

export const getAllWorkOrders = async (skip = 0, limit = 100, status?: string) => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  })
  if (status) {
    params.append("status", status)
  }
  const response = await api.get<WorkOrderResponse[]>(`/work-order/?${params.toString()}`)
  return response.data.map(mapWorkOrder)
}

export const createWorkOrder = async (payload: WorkOrderPayload) => {
  const requestPayload: any = {
    wo_number: payload.woNumber || null,
    party_id: payload.partyId,
    item_id: payload.itemId,
    priority: payload.priority || "normal",
    status: payload.status || "planned",
    machine_id: payload.machineId,
    operator_name: payload.operatorName,
    shift: payload.shift,
  }
  
  // Only include planned_qty if provided
  if (payload.plannedQty !== undefined) {
    requestPayload.planned_qty = payload.plannedQty
  }
  
  const response = await api.post<WorkOrderResponse>("/work-order/", requestPayload)
  return mapWorkOrder(response.data)
}

export const updateWorkOrder = async (workOrderId: number, payload: Partial<WorkOrderPayload>) => {
  const updatePayload: any = {}
  if (payload.woNumber !== undefined) updatePayload.wo_number = payload.woNumber || null
  if (payload.partyId !== undefined) updatePayload.party_id = payload.partyId
  if (payload.itemId !== undefined) updatePayload.item_id = payload.itemId
  if (payload.plannedQty !== undefined) updatePayload.planned_qty = payload.plannedQty
  if (payload.priority !== undefined) updatePayload.priority = payload.priority
  if (payload.status !== undefined) updatePayload.status = payload.status

  const response = await api.patch<WorkOrderResponse>(`/work-order/${workOrderId}`, updatePayload)
  return mapWorkOrder(response.data)
}

export const deleteWorkOrder = async (workOrderId: number) => {
  await api.delete(`/work-order/${workOrderId}`)
}

