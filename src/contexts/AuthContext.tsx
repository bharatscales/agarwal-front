import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import api, {
  clearAccessToken,
  clearImpersonationTargetId,
  getAccessToken,
  setAccessToken,
  setImpersonationTargetId,
  type AgaarwalAxiosRequestConfig,
} from '@/lib/axios';
import { startImpersonation, stopImpersonation } from '@/lib/user-api';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: "user" | "admin" | "superuser";
  department?: string;
}

interface AuthContextType {
  user: User | null;
  impersonatedBy: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  impersonate: (userId: number) => Promise<User | null>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function mapUserFromApi(userData: Record<string, unknown>): User {
  return {
    id: String(userData.id ?? '1'),
    username: String(userData.username ?? ''),
    email: userData.email as string | undefined,
    role: userData.role as User['role'],
    department: userData.department as string | undefined,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const dispatchThemeSync = () => {
    window.dispatchEvent(new CustomEvent('themeSync'));
  };

  const applyTheme = (theme?: string) => {
    if (theme) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      dispatchThemeSync();
    }
  };

  const syncUserFromMeResponse = (userData: Record<string, unknown>) => {
    const mappedUser = mapUserFromApi(userData);
    setUser(mappedUser);
    const impersonator =
      typeof userData.impersonated_by === 'string' ? userData.impersonated_by : null;
    setImpersonatedBy(impersonator);
    if (impersonator && userData.id != null) {
      setImpersonationTargetId(Number(userData.id));
    } else {
      clearImpersonationTargetId();
    }
    applyTheme(userData.theme as string | undefined);
    return mappedUser;
  };

  const checkAuth = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        try {
          const refreshResponse = await api.post('/login/refresh', {}, {
            skipAuth: true,
            skipAuthRefresh: true,
          } as AgaarwalAxiosRequestConfig);
          setAccessToken(refreshResponse.data.access_token);
        } catch {
          setUser(null);
          setImpersonatedBy(null);
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await api.get('/user/me');

        if (response.data && response.data.user) {
          syncUserFromMeResponse(response.data.user);
        } else if (response.data && response.data.username) {
          syncUserFromMeResponse(response.data);
        } else {
          setUser(null);
          setImpersonatedBy(null);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setUser(null);
          setImpersonatedBy(null);
          clearAccessToken();
        } else {
          console.error('Auth check failed after attempts:', error);
          setUser(null);
          setImpersonatedBy(null);
          clearAccessToken();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setImpersonatedBy(null);
      clearAccessToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
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
      } as AgaarwalAxiosRequestConfig);

      if (response.data.access_token) {
        setAccessToken(response.data.access_token);
      } else {
        return false;
      }

      clearImpersonationTargetId();
      setImpersonatedBy(null);

      try {
        const userResponse = await api.get('/user/me');
        syncUserFromMeResponse(userResponse.data);
        return true;
      } catch (userError) {
        console.error('Failed to fetch user data:', userError);
        setUser({
          id: '1',
          username,
          role: 'user',
        });
        return true;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      clearAccessToken();
      clearImpersonationTargetId();
      await api.post('/logout/', {}, {
        skipAuth: true,
        skipAuthRefresh: true,
      } as AgaarwalAxiosRequestConfig);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAccessToken();
      clearImpersonationTargetId();
      setUser(null);
      setImpersonatedBy(null);
    }
  };

  const impersonate = async (userId: number): Promise<User | null> => {
    try {
      const tokenResponse = await startImpersonation(userId);
      setAccessToken(tokenResponse.access_token);
      setImpersonationTargetId(userId);

      const userResponse = await api.get('/user/me');
      return syncUserFromMeResponse(userResponse.data);
    } catch (error) {
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
    } catch (error) {
      // Impersonation token may be expired; refresh cookie always belongs to the admin.
      try {
        const refreshResponse = await api.post('/login/refresh', {}, {
          skipAuth: true,
          skipAuthRefresh: true,
        } as AgaarwalAxiosRequestConfig);
        setAccessToken(refreshResponse.data.access_token);
      } catch (refreshError) {
        console.error('Exit impersonation failed:', error, refreshError);
        throw error;
      }
    }

    try {
      const userResponse = await api.get('/user/me');
      syncUserFromMeResponse(userResponse.data);
      setImpersonatedBy(null);
      clearImpersonationTargetId();
    } catch (error) {
      console.error('Exit impersonation failed to restore user:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
