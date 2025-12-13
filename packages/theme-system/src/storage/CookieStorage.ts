import type { ThemeStorage, ThemePreference } from './types';

/**
 * Configuration options for cookie-based theme storage.
 */
export interface CookieStorageOptions {
  /** Cookie name (default: 'django_theme_pref') */
  cookieName?: string;
  /** Cookie expiry in seconds (default: 31536000 = 1 year) */
  maxAge?: number;
  /** Cookie path (default: '/') */
  path?: string;
  /** SameSite attribute (default: 'lax') */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Secure flag (default: true) */
  secure?: boolean;
}

/**
 * Cookie-based theme storage adapter.
 *
 * Stores theme preferences in browser cookies, enabling SSR compatibility
 * when paired with server-side cookie reading (e.g., Next.js `cookies()` API).
 *
 * @example Basic usage
 * ```tsx
 * const storage = new CookieStorage();
 * await storage.setTheme({ mode: 'dark', brand: 'acme' });
 * ```
 *
 * @example Custom configuration
 * ```tsx
 * const storage = new CookieStorage({
 *   cookieName: 'my_theme',
 *   maxAge: 86400, // 1 day
 *   sameSite: 'strict'
 * });
 * ```
 */
export class CookieStorage implements ThemeStorage {
  private options: Required<CookieStorageOptions>;

  constructor(options: CookieStorageOptions = {}) {
    this.options = {
      cookieName: options.cookieName ?? 'django_theme_pref',
      maxAge: options.maxAge ?? 31536000, // 1 year
      path: options.path ?? '/',
      sameSite: options.sameSite ?? 'lax',
      secure: options.secure ?? true,
    };
  }

  /**
   * Retrieve theme preference from cookie.
   * Returns null if cookie doesn't exist or contains invalid JSON.
   *
   * @returns Theme preference or null
   */
  async getTheme(): Promise<ThemePreference | null> {
    if (typeof document === 'undefined') {
      return null; // SSR: cannot read cookies client-side
    }

    const match = document.cookie.match(
      new RegExp(`(^| )${this.options.cookieName}=([^;]+)`)
    );
    if (!match) return null;

    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch {
      return null;
    }
  }

  /**
   * Store theme preference in cookie.
   * Sets SameSite and Secure flags for security.
   *
   * @param preference - Theme preference to persist
   */
  async setTheme(preference: ThemePreference): Promise<void> {
    if (typeof document === 'undefined') {
      return; // SSR: no-op
    }

    const value = encodeURIComponent(JSON.stringify(preference));
    const expires = new Date(Date.now() + this.options.maxAge * 1000).toUTCString();

    document.cookie = [
      `${this.options.cookieName}=${value}`,
      `expires=${expires}`,
      `path=${this.options.path}`,
      `samesite=${this.options.sameSite}`,
      this.options.secure ? 'secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
  }

  /**
   * Clear theme preference cookie.
   * Sets cookie expiry to past date.
   */
  async clearTheme(): Promise<void> {
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie = `${this.options.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.options.path};`;
  }
}
