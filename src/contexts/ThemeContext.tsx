import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, updateUserTheme } from '@/lib/user-api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
  syncWithDocument: () => void; // Add this function
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Function to sync theme state with document
  const syncWithDocument = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const documentTheme: Theme = isDark ? 'dark' : 'light';
    
    // Always update state to match document, even if they're the same
    setThemeState(documentTheme);
  };

  // Initialize theme from user preferences or system preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Try to get user's theme preference from backend
        const user = await getCurrentUser();
        if (user.theme) {
          setThemeState(user.theme);
          document.documentElement.classList.toggle('dark', user.theme === 'dark');
        } else {
          // Fallback to system preference
          const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const systemTheme: Theme = isSystemDark ? 'dark' : 'light';
          setThemeState(systemTheme);
          document.documentElement.classList.toggle('dark', systemTheme === 'dark');
        }
      } catch (error) {
        console.error('Error fetching user theme:', error);
        // Fallback to system preference
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const systemTheme: Theme = isSystemDark ? 'dark' : 'light';
        setThemeState(systemTheme);
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();

    // Listen for theme sync events from AuthContext
    const handleThemeSync = () => {
      syncWithDocument();
    };

    window.addEventListener('themeSync', handleThemeSync);

    return () => {
      window.removeEventListener('themeSync', handleThemeSync);
    };
  }, []);

  const setTheme = async (newTheme: Theme) => {
    try {
      // Update backend
      await updateUserTheme(newTheme);
      
      // Update local state
      setThemeState(newTheme);
      
      // Apply theme to document
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    } catch (error) {
      console.error('Error updating theme:', error);
      // Still apply theme locally even if backend update fails
      setThemeState(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isLoading,
    syncWithDocument, // Add this to the context value
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
