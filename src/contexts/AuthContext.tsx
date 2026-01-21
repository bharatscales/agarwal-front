import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

import api from '@/lib/axios';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: "user" | "admin" | "superuser";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Function to dispatch theme sync event
  const dispatchThemeSync = () => {
    window.dispatchEvent(new CustomEvent('themeSync'));
  };

  // Debug function to check cookie details


  const checkAuth = async () => {
    try {
      // Check if we have an access token
      const token = sessionStorage.getItem('access_token');
      
      if (!token) {
        // No token, try to refresh
        try {
          const refreshResponse = await api.post('/login/refresh');
          const { access_token } = refreshResponse.data;
          sessionStorage.setItem('access_token', access_token);
          // Token set, proceed to fetch user
        } catch (error) {
          // Refresh failed, user is not logged in
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await api.get('/user/me');
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
          // Apply theme if available
          if (response.data.user.theme) {
            document.documentElement.classList.toggle('dark', response.data.user.theme === 'dark');
            dispatchThemeSync();
          }
        } else if (response.data && response.data.username) {
          // If the response structure is different, adapt accordingly
          setUser({
            id: response.data.id || '1',
            username: response.data.username,
            email: response.data.email,
            role: response.data.role
          });
          // Apply theme if available
          if (response.data.theme) {
            document.documentElement.classList.toggle('dark', response.data.theme === 'dark');
            dispatchThemeSync();
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        // If we get here, it means even after potential refresh (handled by interceptor), it failed
        console.error('Auth check failed after attempts:', error);
        setUser(null);
        sessionStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      sessionStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      if (username && password) {
        // Create form data for OAuth2 password grant
        const formData = new URLSearchParams();     
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/login/', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
          },
          withCredentials: true
        });
        console.log('Login response:', response.data);

        if (response.data.access_token) {
          // Store access token
          sessionStorage.setItem('access_token', response.data.access_token);

          // After successful login, fetch complete user data including theme
          try {
            const userResponse = await api.get('/user/me');
            const userData = userResponse.data;
            
            setUser({
              id: userData.id || '1',
              username: userData.username || username,
              email: userData.email,
              role: userData.role
            });
            
            // Apply theme to document if theme exists
            if (userData.theme) {
              document.documentElement.classList.toggle('dark', userData.theme === 'dark');
              // Sync the theme context state
              dispatchThemeSync();
            }
            
            return true;
          } catch (userError) {
            console.error('Failed to fetch user data:', userError);
            // Fallback to basic user data if available in login response (usually not for standard OAuth2)
             setUser({
              id: '1',
              username: username,
              role: 'user' // Default or from decoded token if we decoded it
            });
            return true;
          }
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear the HTTP-only cookie
      await api.post('/logout/', {});
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear user state and token regardless of API call success
      sessionStorage.removeItem('access_token');
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
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
