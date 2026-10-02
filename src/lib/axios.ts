import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import conf from '../conf/conf';

export type AgaarwalAxiosRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

type AgaarwalInternalAxiosRequestConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  refresh_token?: string;
};

export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
export const IMPERSONATION_TARGET_ID_KEY = 'impersonation_target_id';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

const REFRESH_SKEW_MS = 2 * 60 * 1000;

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return fromLocal;
  const fromSession = sessionStorage.getItem(key);
  if (!fromSession) return null;
  localStorage.setItem(key, fromSession);
  sessionStorage.removeItem(key);
  return fromSession;
}

function writeStored(key: string, value: string): void {
  localStorage.setItem(key, value);
  sessionStorage.removeItem(key);
}

function removeStored(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiryMs(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

export function isAccessTokenExpired(token: string | null, skewMs = 0): boolean {
  if (!token) return true;
  const exp = getAccessTokenExpiryMs(token);
  if (exp === null) return false;
  return exp - skewMs <= Date.now();
}

export function getAccessToken(): string | null {
  return readStored(ACCESS_TOKEN_STORAGE_KEY);
}

let refreshTimer: number | null = null;
let blockRefresh = false;

export function allowSessionRefresh(): void {
  blockRefresh = false;
}

export function endSessionLocally(): void {
  blockRefresh = true;
  clearAuthStorage();
}

function clearRefreshTimer(): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleProactiveRefresh(token: string): void {
  if (typeof window === 'undefined') return;
  clearRefreshTimer();
  const exp = getAccessTokenExpiryMs(token);
  if (exp === null) return;
  const delay = Math.max(exp - Date.now() - REFRESH_SKEW_MS, 0);
  refreshTimer = window.setTimeout(() => {
    void refreshAccessToken();
  }, delay);
}

export function setAccessToken(token: string): void {
  if (blockRefresh) return;
  writeStored(ACCESS_TOKEN_STORAGE_KEY, token);
  scheduleProactiveRefresh(token);
}

export function getRefreshToken(): string | null {
  return readStored(REFRESH_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(token: string): void {
  if (blockRefresh) return;
  writeStored(REFRESH_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  removeStored(ACCESS_TOKEN_STORAGE_KEY);
  clearRefreshTimer();
}

export function clearRefreshToken(): void {
  removeStored(REFRESH_TOKEN_STORAGE_KEY);
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearRefreshToken();
  clearImpersonationTargetId();
}

export function setImpersonationTargetId(userId: number): void {
  writeStored(IMPERSONATION_TARGET_ID_KEY, userId.toString());
}

export function getImpersonationTargetId(): number | null {
  const value = readStored(IMPERSONATION_TARGET_ID_KEY);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function clearImpersonationTargetId(): void {
  removeStored(IMPERSONATION_TARGET_ID_KEY);
}

function notifySessionExpired(): void {
  endSessionLocally();
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

function isAuthExemptUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/login/') ||
    url.includes('/logout/') ||
    url.includes('/impersonate')
  );
}

const api = axios.create({
  baseURL: conf.baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

async function reapplyImpersonation(adminToken: string): Promise<string> {
  const targetId = getImpersonationTargetId();
  if (!targetId) {
    return adminToken;
  }

  try {
    const response = await api.post<TokenResponse>(
      `/user/${targetId}/impersonate`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        skipAuthRefresh: true,
      } as AgaarwalAxiosRequestConfig
    );
    const impersonationToken = response.data.access_token;
    setAccessToken(impersonationToken);
    return impersonationToken;
  } catch {
    clearImpersonationTargetId();
    setAccessToken(adminToken);
    return adminToken;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (blockRefresh) return Promise.resolve(null);
  if (!refreshPromise) {
    const storedRefreshToken = getRefreshToken();
    refreshPromise = api
      .post<TokenResponse>(
        '/login/refresh',
        storedRefreshToken ? { refresh_token: storedRefreshToken } : {},
        { skipAuth: true, skipAuthRefresh: true } as AgaarwalAxiosRequestConfig
      )
      .then(async (res: AxiosResponse<TokenResponse>) => {
        if (blockRefresh) return null;
        if (res.data.refresh_token) {
          setRefreshToken(res.data.refresh_token);
        }
        setAccessToken(res.data.access_token);
        return reapplyImpersonation(res.data.access_token);
      })
      .catch((error: unknown) => {
        const rejected =
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403);
        if (rejected) {
          const token = getAccessToken();
          if (isAccessTokenExpired(token)) {
            notifySessionExpired();
          } else if (token) {
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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const c = config as AgaarwalInternalAxiosRequestConfig;
  if (!c.skipAuth) {
    const token = getAccessToken();
    if (token) {
      c.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as AgaarwalInternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    if (
      original.skipAuthRefresh ||
      isAuthExemptUrl(original.url) ||
      original._retry
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken || blockRefresh) {
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  }
);

function ensureTokenFresh(): void {
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
