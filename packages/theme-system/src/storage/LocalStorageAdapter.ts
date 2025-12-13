import type { ThemeStorage, ThemePreference } from './types';

/**
 * LocalStorage-based theme storage adapter.
 *
 * Stores theme preferences in browser localStorage for client-side SPAs.
 * Not suitable for SSR (server-side rendering) scenarios - use CookieStorage instead.
 *
 * @example Basic usage
 * ```tsx
 * const storage = new LocalStorageAdapter();
 * await storage.setTheme({ mode: 'dark', brand: 'acme' });
 * const theme = await storage.getTheme();
 * ```
 *
 * @example Custom storage key
 * ```tsx
 * const storage = new LocalStorageAdapter('my_theme_key');
 * ```
 */
export class LocalStorageAdapter implements ThemeStorage {
  private storageKey: string;

  constructor(storageKey = 'django_theme_pref') {
    this.storageKey = storageKey;
  }

  /**
   * Retrieve theme preference from localStorage.
   * Returns null if not found or contains invalid JSON.
   *
   * @returns Theme preference or null
   */
  async getTheme(): Promise<ThemePreference | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null; // SSR or unavailable
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Store theme preference in localStorage.
   * Handles quota exceeded errors gracefully with console warning.
   *
   * @param preference - Theme preference to persist
   */
  async setTheme(preference: ThemePreference): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preference));
    } catch (error) {
      console.warn('Failed to persist theme preference to localStorage:', error);
    }
  }

  /**
   * Clear theme preference from localStorage.
   */
  async clearTheme(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    localStorage.removeItem(this.storageKey);
  }
}
