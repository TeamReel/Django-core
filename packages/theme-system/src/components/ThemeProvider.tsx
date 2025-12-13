import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext, type ThemeContextValue } from '../context/ThemeContext';
import { resolveThemeMode, getThemeClassName } from '../utils/resolveTheme';
import { subscribeToSystemTheme } from '../utils/systemPreference';
import type { ThemeMode } from '../types/theme';
import type { BrandVariant } from '../types/brand';
import type { ThemeStorage } from '../storage/types';

/**
 * ThemeProvider component props.
 */
export interface ThemeProviderProps {
  /** Child components to wrap with theme context */
  children: React.ReactNode;
  /** Optional storage adapter for theme persistence */
  storage?: ThemeStorage;
  /** Default theme mode if no stored preference */
  defaultMode?: ThemeMode;
  /** Default brand variant if no stored preference */
  defaultBrand?: BrandVariant;
}

/**
 * ThemeProvider - React context provider for theme management.
 *
 * Manages theme state and applies data attributes to the document root.
 * Theme changes are applied via CSS custom properties and data attributes,
 * avoiding React re-renders for theme switches.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@django-core/theme-system';
 *
 * function App() {
 *   return (
 *     <ThemeProvider defaultMode="system" defaultBrand="default">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @example With storage
 * ```tsx
 * import { ThemeProvider, createLocalStorageAdapter } from '@django-core/theme-system';
 *
 * const storage = createLocalStorageAdapter();
 *
 * function App() {
 *   return (
 *     <ThemeProvider storage={storage} defaultMode="light">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  storage,
  defaultMode = 'system',
  defaultBrand = 'default',
}: ThemeProviderProps) {
  // Initialize from existing data attributes (set by SSR inline script)
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check if SSR script already set theme
    const ssrTheme = document.documentElement.getAttribute('data-theme');
    if (ssrTheme === 'light' || ssrTheme === 'dark') {
      // If SSR set explicit theme, use it; assume non-system mode
      return ssrTheme;
    }
    return defaultMode;
  });

  const [brand, setBrand] = useState<BrandVariant>(() => {
    // Check if SSR script already set brand
    const ssrBrand = document.documentElement.getAttribute('data-brand');
    return (ssrBrand as BrandVariant) || defaultBrand;
  });

  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => {
    // Check SSR-set theme first
    const ssrTheme = document.documentElement.getAttribute('data-theme');
    if (ssrTheme === 'light' || ssrTheme === 'dark') {
      return ssrTheme;
    }
    return resolveThemeMode(defaultMode);
  });

  // Load persisted preference on mount
  useEffect(() => {
    if (!storage) return;

    storage.getTheme().then((saved) => {
      if (saved) {
        setMode(saved.mode);
        setBrand(saved.brand);
      }
    });
  }, [storage]);

  // Apply data attributes and theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    const themeClass = getThemeClassName(resolvedMode);

    root.setAttribute('data-theme', resolvedMode);
    root.setAttribute('data-brand', brand);
    root.className = themeClass;

    return () => {
      // Cleanup on unmount
      root.removeAttribute('data-theme');
      root.removeAttribute('data-brand');
      root.className = '';
    };
  }, [resolvedMode, brand]);

  // Subscribe to system preference changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return;

    const unsubscribe = subscribeToSystemTheme((systemTheme) => {
      setResolvedMode(systemTheme);
    });

    return unsubscribe;
  }, [mode]);

  // Resolve mode whenever it changes
  useEffect(() => {
    setResolvedMode(resolveThemeMode(mode));
  }, [mode]);

  /**
   * Update theme configuration.
   * Persists changes via storage adapter if provided.
   */
  const setTheme = useCallback<ThemeContextValue['setTheme']>(
    ({ mode: newMode, brand: newBrand }) => {
      if (newMode !== undefined) {
        setMode(newMode);
      }
      if (newBrand !== undefined) {
        setBrand(newBrand);
      }

      // Persist to storage
      if (storage) {
        storage.setTheme({
          mode: newMode ?? mode,
          brand: newBrand ?? brand,
        });
      }
    },
    [mode, brand, storage]
  );

  /**
   * Toggle between light and dark modes.
   * If current mode is 'system', switches to explicit light/dark based on resolved value.
   */
  const toggleMode = useCallback(() => {
    const newMode = resolvedMode === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
  }, [resolvedMode, setTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      brand,
      setTheme,
      toggleMode,
    }),
    [mode, resolvedMode, brand, setTheme, toggleMode]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
