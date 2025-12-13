import type { themeVars } from '../themes/contract.css';

/**
 * Theme mode options.
 * - 'light': Light color scheme
 * - 'dark': Dark color scheme
 * - 'system': Follow OS preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme token map type generated from vanilla-extract contract.
 * Provides full type safety for all semantic tokens.
 */
export type ThemeTokenMap = typeof themeVars;

/**
 * Complete theme configuration.
 */
export interface ThemeConfiguration {
  /** Current theme mode */
  mode: ThemeMode;
  /** Current brand variant */
  brand: string;
  /** Optional custom token overrides */
  customTokens?: Partial<ThemeTokenMap>;
}

/**
 * User's theme preference for persistence.
 */
export interface ThemePreference {
  /** Preferred theme mode */
  mode: ThemeMode;
  /** Preferred brand variant */
  brand: string;
  /** When preference was last updated */
  lastUpdated: Date;
}
