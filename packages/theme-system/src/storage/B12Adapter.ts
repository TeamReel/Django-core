import type { ThemeStorage, ThemePreference } from './types';

/**
 * Configuration options for B12 API adapter.
 */
export interface B12AdapterOptions {
  /** API client with get/post methods (e.g., @django-core/api-client) */
  apiClient: {
    get: <T>(url: string) => Promise<T>;
    post: <T>(url: string, body: unknown) => Promise<T>;
  };
  /** API endpoint for theme preferences (default: '/api/preferences/theme') */
  endpoint?: string;
}

/**
 * B12 backend API adapter for theme storage.
 *
 * Integrates with Django backend (B12) User Preferences API to persist
 * theme settings server-side. Implements offline-first pattern by returning
 * null on API errors (allowing fallback to local storage via ComposedStorage).
 *
 * Requires `@django-core/api-client` as peer dependency.
 *
 * @example With api-client
 * ```tsx
 * import { createApiClient } from '@django-core/api-client';
 *
 * const apiClient = createApiClient({ baseURL: '/api' });
 * const storage = new B12Adapter({ apiClient });
 *
 * await storage.setTheme({ mode: 'dark', brand: 'acme' });
 * ```
 *
 * @example Custom endpoint
 * ```tsx
 * const storage = new B12Adapter({
 *   apiClient,
 *   endpoint: '/api/v2/user/theme'
 * });
 * ```
 */
export class B12Adapter implements ThemeStorage {
  private apiClient: B12AdapterOptions['apiClient'];
  private endpoint: string;

  constructor(options: B12AdapterOptions) {
    this.apiClient = options.apiClient;
    this.endpoint = options.endpoint ?? '/api/preferences/theme';
  }

  /**
   * Fetch theme preference from B12 API.
   * Returns null on error (offline-first pattern).
   *
   * @returns Theme preference or null
   */
  async getTheme(): Promise<ThemePreference | null> {
    try {
      const response = await this.apiClient.get<{ mode: string; brand: string }>(
        this.endpoint
      );
      return {
        mode: response.mode as ThemePreference['mode'],
        brand: response.brand as ThemePreference['brand'],
      };
    } catch (error) {
      console.warn('Failed to fetch theme preference from B12:', error);
      return null; // Offline-first: fallback to local storage
    }
  }

  /**
   * Save theme preference to B12 API.
   * Fails silently on error (local storage will persist).
   *
   * @param preference - Theme preference to persist
   */
  async setTheme(preference: ThemePreference): Promise<void> {
    try {
      await this.apiClient.post(this.endpoint, preference);
    } catch (error) {
      console.warn('Failed to save theme preference to B12:', error);
      // Fail silently, local storage will persist
    }
  }

  /**
   * Clear theme preference in B12 API.
   * Resets to system defaults (mode='system', brand='default').
   */
  async clearTheme(): Promise<void> {
    try {
      await this.apiClient.post(this.endpoint, { mode: 'system', brand: 'default' });
    } catch (error) {
      console.warn('Failed to clear theme preference in B12:', error);
    }
  }
}
