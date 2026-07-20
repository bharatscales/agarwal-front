import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import conf from '../conf/conf';

export type AgaarwalAxiosRequestConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
export const IMPERSONATION_TARGET_ID_KEY = 'impersonation_target_id';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setImpersonationTargetId(userId: number): void {
  sessionStorage.setItem(IMPERSONATION_TARGET_ID_KEY, userId.toString());
}

export function getImpersonationTargetId(): number | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(IMPERSONATION_TARGET_ID_KEY);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function clearImpersonationTargetId(): void {
  sessionStorage.removeItem(IMPERSONATION_TARGET_ID_KEY);
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
    const response = await api.post<{ access_token: string }>(
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

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ access_token: string }>(
        '/login/refresh',
        {},
        { skipAuth: true, skipAuthRefresh: true } as AgaarwalAxiosRequestConfig
      )
      .then(async (res: AxiosResponse<{ access_token: string }>) => {
        const adminToken = res.data.access_token;
        return reapplyImpersonation(adminToken);
      })
      .catch(() => {
        clearAccessToken();
        clearImpersonationTargetId();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise as Promise<string | null>;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const c = config as AgaarwalAxiosRequestConfig;
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
    const original = error.config as AgaarwalAxiosRequestConfig | undefined;
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
    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  }
);

export default api;
