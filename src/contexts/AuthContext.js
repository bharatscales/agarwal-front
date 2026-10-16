import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api, { AUTH_SESSION_EXPIRED_EVENT, allowSessionRefresh, endSessionLocally, clearImpersonationTargetId, decodeJwtPayload, getAccessToken, isAccessTokenExpired, refreshAccessToken, setAccessToken, setImpersonationTargetId, setRefreshToken, } from '@/lib/axios';
import { startImpersonation, stopImpersonation } from '@/lib/user-api';
const AuthContext = createContext(undefined);
function mapUserFromApi(userData) {
    return {
        id: String(userData.id ?? '1'),
        username: String(userData.username ?? ''),
        email: userData.email,
        role: userData.role,
        department: userData.department,
    };
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [impersonatedBy, setImpersonatedBy] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isAuthenticated = !!user;
    const dispatchThemeSync = () => {
        window.dispatchEvent(new CustomEvent('themeSync'));
    };
    const applyTheme = (theme) => {
        if (theme) {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            dispatchThemeSync();
        }
    };
    const syncUserFromMeResponse = (userData) => {
        const mappedUser = mapUserFromApi(userData);
        setUser(mappedUser);
        const impersonator = typeof userData.impersonated_by === 'string' ? userData.impersonated_by : null;
        setImpersonatedBy(impersonator);
        if (impersonator && userData.id != null) {
            setImpersonationTargetId(Number(userData.id));
        }
        else {
            clearImpersonationTargetId();
        }
        applyTheme(userData.theme);
        return mappedUser;
    };
    const checkAuth = async () => {
        try {
            if (!getAccessToken()) {
                const refreshed = await refreshAccessToken();
                if (!refreshed) {
                    setUser(null);
                    setImpersonatedBy(null);
                    return;
                }
            }
            try {
                const response = await api.get('/user/me');
                if (response.data && response.data.user) {
                    syncUserFromMeResponse(response.data.user);
                }
                else if (response.data && response.data.username) {
                    syncUserFromMeResponse(response.data);
                }
                else {
                    setUser(null);
                    setImpersonatedBy(null);
                }
            }
            catch (error) {
                const token = getAccessToken();
                const username = token ? decodeJwtPayload(token)?.sub : null;
                const sessionEnded = axios.isAxiosError(error) && error.response?.status === 401 && !token;
                if (!sessionEnded && typeof username === 'string' && username) {
                    setUser({ id: '0', username });
                    return;
                }
                if (!axios.isAxiosError(error) || error.response?.status === 401) {
                    setUser(null);
                    setImpersonatedBy(null);
                    return;
                }
                console.error('Auth check failed after attempts:', error);
                setUser(null);
                setImpersonatedBy(null);
            }
        }
        catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
            setImpersonatedBy(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    const login = async (username, password) => {
        try {
            setIsLoading(true);
            if (!username || !password) {
                return false;
            }
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            const response = await api.post('/login/', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    accept: 'application/json',
                },
                withCredentials: true,
                skipAuth: true,
                skipAuthRefresh: true,
            });
            if (response.data.access_token) {
                allowSessionRefresh();
                setAccessToken(response.data.access_token);
                if (response.data.refresh_token) {
                    setRefreshToken(response.data.refresh_token);
                }
            }
            else {
                return false;
            }
            clearImpersonationTargetId();
            setImpersonatedBy(null);
            try {
                const userResponse = await api.get('/user/me');
                syncUserFromMeResponse(userResponse.data);
                return true;
            }
            catch (userError) {
                console.error('Failed to fetch user data:', userError);
                setUser({
                    id: '1',
                    username,
                    role: 'user',
                });
                return true;
            }
        }
        catch (error) {
            console.error('Login failed:', error);
            return false;
        }
        finally {
            setIsLoading(false);
        }
    };
    const logout = async () => {
        try {
            endSessionLocally();
            await api.post('/logout/', {}, {
                skipAuth: true,
                skipAuthRefresh: true,
            });
        }
        catch (error) {
            console.error('Logout failed:', error);
        }
        finally {
            endSessionLocally();
            setUser(null);
            setImpersonatedBy(null);
        }
    };
    const impersonate = async (userId) => {
        try {
            const token = getAccessToken();
            const claims = token ? decodeJwtPayload(token) : null;
            if (!token || isAccessTokenExpired(token) || typeof claims?.imp_by === 'string') {
                clearImpersonationTargetId();
                const adminToken = await refreshAccessToken();
                if (!adminToken) {
                    throw new Error('Session expired');
                }
            }
            const tokenResponse = await startImpersonation(userId);
            setAccessToken(tokenResponse.access_token);
            setImpersonationTargetId(userId);
            const userResponse = await api.get('/user/me');
            return syncUserFromMeResponse(userResponse.data);
        }
        catch (error) {
            console.error('Impersonation failed:', error);
            clearImpersonationTargetId();
            throw error;
        }
    };
    const exitImpersonation = async () => {
        // Clear first so any token refresh during exit cannot re-apply impersonation.
        clearImpersonationTargetId();
        try {
            const tokenResponse = await stopImpersonation();
            setAccessToken(tokenResponse.access_token);
        }
        catch (error) {
            // Impersonation token may be expired; refresh cookie always belongs to the admin.
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                console.error('Exit impersonation failed:', error);
                throw error;
            }
        }
        try {
            const userResponse = await api.get('/user/me');
            syncUserFromMeResponse(userResponse.data);
            setImpersonatedBy(null);
            clearImpersonationTargetId();
        }
        catch (error) {
            console.error('Exit impersonation failed to restore user:', error);
            throw error;
        }
    };
    useEffect(() => {
        const onSessionExpired = () => {
            setUser(null);
            setImpersonatedBy(null);
        };
        window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
        return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    }, []);
    useEffect(() => {
        checkAuth();
    }, []);
    const value = {
        user,
        impersonatedBy,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
        impersonate,
        exitImpersonation,
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
