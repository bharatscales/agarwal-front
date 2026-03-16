import api from "./axios"

export type OperatorPayload = {
  operatorName: string
  machineId?: number | null
}

type OperatorResponse = {
  id: number
  operator_name: string
  machine_id?: number | null
  machine_code?: string | null
  machine_name?: string | null
  operation?: string | null
  created_by?: number
  created_at?: string
}

const mapOperator = (operator: OperatorResponse) => ({
  id: operator?.id ?? 0,
  operatorName: operator?.operator_name ?? "",
  machineId: operator?.machine_id ?? null,
  machineCode: operator?.machine_code ?? null,
  machineName: operator?.machine_name ?? null,
  operation: operator?.operation ?? null,
})

export const getAllOperators = async (skip = 0, limit = 100) => {
  const response = await api.get<OperatorResponse[]>(`/operator/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapOperator)
}

export const createOperator = async (payload: OperatorPayload) => {
  const response = await api.post<OperatorResponse>("/operator/", {
    operator_name: payload.operatorName,
    machine_id: payload.machineId || null,
  })
  const data = response?.data
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response when creating operator")
  }
  return mapOperator(data)
}

export const updateOperator = async (operatorId: number, payload: Partial<OperatorPayload>) => {
  const response = await api.patch<OperatorResponse>(`/operator/${operatorId}`, {
    operator_name: payload.operatorName,
    machine_id: payload.machineId !== undefined ? payload.machineId : null,
  })
  return mapOperator(response.data)
}

export const deleteOperator = async (operatorId: number) => {
  await api.delete(`/operator/${operatorId}`)
}

