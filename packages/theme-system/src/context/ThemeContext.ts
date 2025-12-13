import { createContext } from 'react';
import type { ThemeMode } from '../types/theme';
import type { BrandVariant } from '../types/brand';

/**
 * Theme context value providing theme state and control functions.
 *
 * @property mode - Current theme mode ('light', 'dark', or 'system')
 * @property resolvedMode - Actual applied mode ('light' or 'dark'), with 'system' resolved to OS preference
 * @property brand - Current brand variant identifier
 * @property setTheme - Update theme configuration (mode and/or brand)
 * @property toggleMode - Toggle between light and dark modes
 */
export interface ThemeContextValue {
  /** Current theme mode setting */
  mode: ThemeMode;
  /** Resolved theme mode (system → light/dark) */
  resolvedMode: 'light' | 'dark';
  /** Current brand variant */
  brand: BrandVariant;
  /** Update theme configuration */
  setTheme: (config: { mode?: ThemeMode; brand?: BrandVariant }) => void;
  /** Toggle between light and dark modes */
  toggleMode: () => void;
}

/**
 * React context for theme state management.
 * Provides theme mode, brand variant, and control functions to consumer components.
 *
 * @example
 * ```tsx
 * const context = useContext(ThemeContext);
 * if (context) {
 *   console.log(context.resolvedMode); // 'light' | 'dark'
 * }
 * ```
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
ThemeContext.displayName = 'ThemeContext';
