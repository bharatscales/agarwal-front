import api from './axios';
import {} from '@/components/columns/user-columns';
// Get all users (admin/superuser only)
export const getAllUsers = async (skip = 0, limit = 20) => {
    try {
        const response = await api.get(`/user/?skip=${skip}&limit=${limit}`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};
// Get current user info
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/user/me');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
    }
};
// Create new user (admin/superuser only)
export const createUser = async (userData) => {
    try {
        const response = await api.post('/user/', userData);
        return response.data;
    }
    catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};
// Update user details (admin/superuser only)
export const updateUser = async (userId, userData) => {
    try {
        const response = await api.patch(`/user/${userId}`, userData);
        return response.data;
    }
    catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
};
// Update user theme preference
export const updateUserTheme = async (theme) => {
    try {
        const response = await api.patch('/user/me/theme', { theme });
        return response.data;
    }
    catch (error) {
        console.error('Error updating user theme:', error);
        throw error;
    }
};
// Update user status (activate/deactivate)
export const updateUserStatus = async (userId, isEnable) => {
    try {
        return await updateUser(userId, { isEnable });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        throw error;
    }
};
// Delete user (admin/superuser only)
export const deleteUser = async (userId) => {
    try {
        // Note: This endpoint doesn't exist yet in your backend
        // You'll need to create it in the backend
        await api.delete(`/user/${userId}`);
    }
    catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};
export const createUserApiKey = async (userId) => {
    try {
        const response = await api.post(`/user/${userId}/api-key`);
        return response.data;
    }
    catch (error) {
        console.error('Error creating API key:', error);
        throw error;
    }
};
export const startImpersonation = async (userId) => {
    const response = await api.post(`/user/${userId}/impersonate`);
    return response.data;
};
export const stopImpersonation = async () => {
    const response = await api.post('/user/impersonate/stop');
    return response.data;
};
