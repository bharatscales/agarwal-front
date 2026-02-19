import api from "./axios"

export type MachinePayload = {
  machineCode: string
  machineName: string
  operation: string
  status?: string
}

type MachineResponse = {
  id: number
  machine_code: string
  machine_name: string
  operation: string
  status: string
  created_by?: number
  created_at?: string
}

const mapMachine = (machine: MachineResponse) => ({
  id: machine.id,
  machineCode: machine.machine_code,
  machineName: machine.machine_name,
  operation: machine.operation,
  status: machine.status,
})

export const getAllMachines = async (skip = 0, limit = 100) => {
  const response = await api.get<MachineResponse[]>(`/machine/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapMachine)
}

export const createMachine = async (payload: MachinePayload) => {
  const response = await api.post<MachineResponse>("/machine/", {
    machine_code: payload.machineCode,
    machine_name: payload.machineName,
    operation: payload.operation,
    status: payload.status || "active",
  })
  return mapMachine(response.data)
}

export const updateMachine = async (machineId: number, payload: Partial<MachinePayload>) => {
  const response = await api.patch<MachineResponse>(`/machine/${machineId}`, {
    machine_code: payload.machineCode,
    machine_name: payload.machineName,
    operation: payload.operation,
    status: payload.status,
  })
  return mapMachine(response.data)
}

export const deleteMachine = async (machineId: number) => {
  await api.delete(`/machine/${machineId}`)
}

