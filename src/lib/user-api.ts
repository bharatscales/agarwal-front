import api from './axios'
import { type User } from '@/components/columns/user-columns'

// Get all users (admin/superuser only)
export const getAllUsers = async (skip: number = 0, limit: number = 20): Promise<User[]> => {
  try {
    const response = await api.get(`/user/?skip=${skip}&limit=${limit}`)
    return response.data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// Get current user info
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get('/user/me')
    return response.data
  } catch (error) {
    console.error('Error fetching current user:', error)
    throw error
  }
}

// Create new user (admin/superuser only)
export const createUser = async (userData: {
  firstname: string
  lastname: string
  username: string
  password: string
  role: "superuser" | "admin" | "user"
  theme?: "light" | "dark"
}): Promise<User> => {
  try {
    const response = await api.post('/user/', userData)
    return response.data
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Update user details (admin/superuser only)
export const updateUser = async (
  userId: number,
  userData: Partial<{
    firstname: string
    lastname: string
    username: string
    password: string
    role: "superuser" | "admin" | "user"
    isEnable: boolean
  }>
): Promise<User> => {
  try {
    const response = await api.patch(`/user/${userId}`, userData)
    return response.data
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

// Update user theme preference
export const updateUserTheme = async (theme: "light" | "dark"): Promise<User> => {
  try {
    const response = await api.patch('/user/me/theme', { theme })
    return response.data
  } catch (error) {
    console.error('Error updating user theme:', error)
    throw error
  }
}

// Update user status (activate/deactivate)
export const updateUserStatus = async (userId: number, isEnable: boolean): Promise<User> => {
  try {
    return await updateUser(userId, { isEnable })
  } catch (error) {
    console.error('Error updating user status:', error)
    throw error
  }
}

// Delete user (admin/superuser only)
export const deleteUser = async (userId: number): Promise<void> => {
  try {
    // Note: This endpoint doesn't exist yet in your backend
    // You'll need to create it in the backend
    await api.delete(`/user/${userId}`)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}
