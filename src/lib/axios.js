import axios, {} from 'axios';
import conf from '../conf/conf';
export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
export const IMPERSONATION_TARGET_ID_KEY = 'impersonation_target_id';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
const REFRESH_SKEW_MS = 2 * 60 * 1000;
function readStored(key) {
    if (typeof window === 'undefined')
        return null;
    const fromLocal = localStorage.getItem(key);
    if (fromLocal)
        return fromLocal;
    const fromSession = sessionStorage.getItem(key);
    if (!fromSession)
        return null;
    localStorage.setItem(key, fromSession);
    sessionStorage.removeItem(key);
    return fromSession;
}
function writeStored(key, value) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
}
function removeStored(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
}
export function decodeJwtPayload(token) {
    try {
        const segment = token.split('.')[1];
        if (!segment)
            return null;
        const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
        return JSON.parse(atob(padded));
    }
    catch {
        return null;
    }
}
export function getAccessTokenExpiryMs(token) {
    const exp = decodeJwtPayload(token)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
}
export function isAccessTokenExpired(token, skewMs = 0) {
    if (!token)
        return true;
    const exp = getAccessTokenExpiryMs(token);
    if (exp === null)
        return false;
    return exp - skewMs <= Date.now();
}
export function getAccessToken() {
    return readStored(ACCESS_TOKEN_STORAGE_KEY);
}
let refreshTimer = null;
let blockRefresh = false;
export function allowSessionRefresh() {
    blockRefresh = false;
}
export function endSessionLocally() {
    blockRefresh = true;
    clearAuthStorage();
}
function clearRefreshTimer() {
    if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
    }
}
function scheduleProactiveRefresh(token) {
    if (typeof window === 'undefined')
        return;
    clearRefreshTimer();
    const exp = getAccessTokenExpiryMs(token);
    if (exp === null)
        return;
    const delay = Math.max(exp - Date.now() - REFRESH_SKEW_MS, 0);
    refreshTimer = window.setTimeout(() => {
        void refreshAccessToken();
    }, delay);
}
export function setAccessToken(token) {
    if (blockRefresh)
        return;
    writeStored(ACCESS_TOKEN_STORAGE_KEY, token);
    scheduleProactiveRefresh(token);
}
export function getRefreshToken() {
    return readStored(REFRESH_TOKEN_STORAGE_KEY);
}
export function setRefreshToken(token) {
    if (blockRefresh)
        return;
    writeStored(REFRESH_TOKEN_STORAGE_KEY, token);
}
export function clearAccessToken() {
    removeStored(ACCESS_TOKEN_STORAGE_KEY);
    clearRefreshTimer();
}
export function clearRefreshToken() {
    removeStored(REFRESH_TOKEN_STORAGE_KEY);
}
export function clearAuthStorage() {
    clearAccessToken();
    clearRefreshToken();
    clearImpersonationTargetId();
}
export function setImpersonationTargetId(userId) {
    writeStored(IMPERSONATION_TARGET_ID_KEY, userId.toString());
}
export function getImpersonationTargetId() {
    const value = readStored(IMPERSONATION_TARGET_ID_KEY);
    if (!value)
        return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}
export function clearImpersonationTargetId() {
    removeStored(IMPERSONATION_TARGET_ID_KEY);
}
function notifySessionExpired() {
    endSessionLocally();
    if (typeof window === 'undefined')
        return;
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
function isAuthExemptUrl(url) {
    if (!url)
        return false;
    return url.includes('/login/') || url.includes('/logout/');
}
const api = axios.create({
    baseURL: conf.baseURL,
    withCredentials: true,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});
let refreshPromise = null;
async function reapplyImpersonation(adminToken) {
    const targetId = getImpersonationTargetId();
    if (!targetId) {
        return adminToken;
    }
    try {
        const response = await api.post(`/user/${targetId}/impersonate`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` },
            skipAuth: true,
            skipAuthRefresh: true,
        });
        const impersonationToken = response.data.access_token;
        setAccessToken(impersonationToken);
        return impersonationToken;
    }
    catch {
        clearImpersonationTargetId();
        setAccessToken(adminToken);
        return adminToken;
    }
}
export function refreshAccessToken() {
    if (blockRefresh)
        return Promise.resolve(null);
    if (!refreshPromise) {
        const storedRefreshToken = getRefreshToken();
        const currentAccess = getAccessToken();
        const preserveImpersonation = Boolean(getImpersonationTargetId() && currentAccess);
        refreshPromise = api
            .post('/login/refresh', {
            ...(storedRefreshToken ? { refresh_token: storedRefreshToken } : {}),
            ...(preserveImpersonation ? { access_token: currentAccess } : {}),
        }, { skipAuth: true, skipAuthRefresh: true })
            .then(async (res) => {
            if (blockRefresh)
                return null;
            if (res.data.refresh_token) {
                setRefreshToken(res.data.refresh_token);
            }
            const issued = res.data.access_token;
            const claims = decodeJwtPayload(issued);
            if (typeof claims?.imp_by === 'string') {
                setAccessToken(issued);
                return issued;
            }
            if (getImpersonationTargetId()) {
                return reapplyImpersonation(issued);
            }
            setAccessToken(issued);
            return issued;
        })
            .catch((error) => {
            const rejected = axios.isAxiosError(error) &&
                (error.response?.status === 401 || error.response?.status === 403);
            if (rejected) {
                const token = getAccessToken();
                if (isAccessTokenExpired(token)) {
                    notifySessionExpired();
                }
                else if (token) {
                    const exp = getAccessTokenExpiryMs(token);
                    if (exp !== null) {
                        window.setTimeout(() => {
                            if (isAccessTokenExpired(getAccessToken())) {
                                notifySessionExpired();
                            }
                        }, Math.max(exp - Date.now(), 0));
                    }
                }
            }
            return null;
        })
            .finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}
api.interceptors.request.use((config) => {
    const c = config;
    if (!c.skipAuth) {
        const token = getAccessToken();
        if (token) {
            c.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});
api.interceptors.response.use((response) => response, async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || !original) {
        return Promise.reject(error);
    }
    if (original.skipAuthRefresh ||
        isAuthExemptUrl(original.url) ||
        original._retry) {
        return Promise.reject(error);
    }
    original._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken || blockRefresh) {
        return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
});
function ensureTokenFresh() {
    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token, REFRESH_SKEW_MS)) {
        if (token || getRefreshToken()) {
            void refreshAccessToken();
        }
        return;
    }
    scheduleProactiveRefresh(token);
}
if (typeof window !== 'undefined') {
    const existing = getAccessToken();
    if (existing) {
        scheduleProactiveRefresh(existing);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            ensureTokenFresh();
        }
    });
}
export default api;
