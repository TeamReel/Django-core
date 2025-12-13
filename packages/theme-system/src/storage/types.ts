import type { ThemeMode } from '../types/theme';
import type { BrandVariant } from '../types/brand';

/**
 * Theme preference for storage persistence.
 */
export interface ThemePreference {
  /** Theme mode setting */
  mode: ThemeMode;
  /** Brand variant identifier */
  brand: BrandVariant;
}

/**
 * Theme storage adapter interface.
 *
 * Abstracts persistence mechanism (localStorage, cookies, API, etc.)
 * for theme preferences.
 *
 * @example localStorage adapter
 * ```tsx
 * const storage: ThemeStorage = {
 *   getTheme: async () => {
 *     const data = localStorage.getItem('theme');
 *     return data ? JSON.parse(data) : null;
 *   },
 *   setTheme: async (theme) => {
 *     localStorage.setItem('theme', JSON.stringify(theme));
 *   }
 * };
 * ```
 */
export interface ThemeStorage {
  /**
   * Retrieve stored theme preference.
   * @returns Theme preference or null if not found
   */
  getTheme(): Promise<ThemePreference | null>;

  /**
   * Store theme preference.
   * @param theme - Theme preference to persist
   */
  setTheme(theme: ThemePreference): Promise<void>;
}
