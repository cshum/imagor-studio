import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ConfigStorage } from '@/lib/config-storage/config-storage.ts';

export type Theme = 'system' | 'light' | 'dark';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme; // system by default
  attribute?: string; // For handling class attribute changes
  storage: ConfigStorage; // Inject storage here
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
                                children,
                                defaultTheme = 'system',
                                attribute = 'class',
                                storage,
                              }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isSystem, setIsSystem] = useState(defaultTheme === 'system');
  const [loaded, setLoaded] = useState(false); // Ensure theme is only applied after it's loaded

  // Fetch theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = await storage.get();
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme as Theme);
        setIsSystem(false); // User-selected, so not system
      } else if (storedTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(systemTheme as Theme); // Apply system preference
        setIsSystem(true);
      } else {
        setTheme(defaultTheme);
        setIsSystem(defaultTheme === 'system');
      }
      setLoaded(true); // Theme is now loaded
    };

    loadTheme();
  }, [defaultTheme, storage]);

  // Apply the correct theme, but only after the theme has been loaded
  useEffect(() => {
    if (!loaded) return;

    const applyTheme = () => {
      let appliedTheme = theme;

      if (isSystem) {
        appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      if (attribute === 'class') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(appliedTheme);
      }
    };

    applyTheme();
  }, [theme, isSystem, attribute, loaded]);

  // Save theme to storage and handle system/user interaction
  useEffect(() => {
    if (!loaded) return;

    const saveTheme = async () => {
      await storage.set(isSystem ? 'system' : theme); // Save "system" if in system mode, otherwise save the theme
    };

    saveTheme();
  }, [theme, isSystem, storage, loaded]);

  const handleThemeChange = (newTheme: Theme) => {
    setIsSystem(newTheme === 'system'); // Disable system if user selects a theme manually
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
