import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { lightTheme } from './themes/light.css';
import { darkTheme } from './themes/dark.css';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  reducedMotion: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'design-system-theme',
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(storageKey) as ThemeMode) || defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect system preferences
  useEffect(() => {
    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setSystemTheme(colorQuery.matches ? 'dark' : 'light');
    setReducedMotion(motionQuery.matches);

    const handleColorChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    colorQuery.addEventListener('change', handleColorChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      colorQuery.removeEventListener('change', handleColorChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const theme = themeMode === 'system' ? systemTheme : themeMode;
  const themeClass = theme === 'dark' ? darkTheme : lightTheme;

  // Apply theme class to root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(lightTheme, darkTheme);
    root.classList.add(themeClass);

    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [themeClass, reducedMotion]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      localStorage.setItem(storageKey, mode);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === 'light' ? 'dark' : 'light');
  }, [theme, setThemeMode]);

  const value = useMemo(
    () => ({ theme, themeMode, setThemeMode, toggleTheme, reducedMotion }),
    [theme, themeMode, setThemeMode, toggleTheme, reducedMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
