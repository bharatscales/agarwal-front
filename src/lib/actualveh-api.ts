import api from './axios'

export interface ActualVeh {
  id: number
  fact_req_id: number | null
  transport_id: number
  vehicle: string
  truck_type: string
  capacity: number
  created_by: number | null
  created_at: string
}

export interface CreateActualVehData {
  fact_req_id: number
  transport_id: number
  vehicle: string
  truck_type: string
  capacity: number
}

export interface UpdateActualVehData {
  transport_id: number
  vehicle: string
  truck_type: string
  capacity: number
}

/**
 * Create a new transport assignment
 */
export const createActualVeh = async (data: CreateActualVehData): Promise<ActualVeh> => {
  try {
    const response = await api.post('/actualveh/', data)
    return response.data
  } catch (error) {
    console.error('Error creating transport assignment:', error)
    throw error
  }
}

/**
 * Update an existing transport assignment
 */
export const updateActualVeh = async (id: number, data: UpdateActualVehData): Promise<ActualVeh> => {
  try {
    const response = await api.put(`/actualveh/${id}`, data)
    return response.data
  } catch (error) {
    console.error('Error updating transport assignment:', error)
    throw error
  }
}

/**
 * Get transport assignments for a specific requisition
 */
export const getActualVehByFactReq = async (factReqId: number): Promise<ActualVeh[]> => {
  try {
    const response = await api.get(`/actualveh/factreq/${factReqId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching transport assignments:', error)
    throw error
  }
}

/**
 * Delete a transport assignment
 */
export const deleteActualVeh = async (id: number): Promise<void> => {
  try {
    await api.delete(`/actualveh/${id}`)
  } catch (error) {
    console.error('Error deleting transport assignment:', error)
    throw error
  }
}
