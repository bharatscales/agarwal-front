import api from './axios';
/**
 * Create a new transport assignment
 */
export const createActualVeh = async (data) => {
    try {
        const response = await api.post('/actualveh/', data);
        return response.data;
    }
    catch (error) {
        console.error('Error creating transport assignment:', error);
        throw error;
    }
};
/**
 * Update an existing transport assignment
 */
export const updateActualVeh = async (id, data) => {
    try {
        const response = await api.put(`/actualveh/${id}`, data);
        return response.data;
    }
    catch (error) {
        console.error('Error updating transport assignment:', error);
        throw error;
    }
};
/**
 * Get transport assignments for a specific requisition
 */
export const getActualVehByFactReq = async (factReqId) => {
    try {
        const response = await api.get(`/actualveh/factreq/${factReqId}`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching transport assignments:', error);
        throw error;
    }
};
/**
 * Delete a transport assignment
 */
export const deleteActualVeh = async (id) => {
    try {
        await api.delete(`/actualveh/${id}`);
    }
    catch (error) {
        console.error('Error deleting transport assignment:', error);
        throw error;
    }
};
