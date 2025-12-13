import type { ThemeStorage, ThemePreference } from './types';

/**
 * Composed storage adapter for multi-strategy persistence.
 *
 * Combines multiple storage adapters (e.g., localStorage + B12 API) to provide
 * resilient, layered persistence. Reads from the first adapter with data,
 * writes to all adapters in parallel.
 *
 * Common patterns:
 * - **Offline-first**: LocalStorage + B12 (local cache with backend sync)
 * - **SSR + Client**: Cookie + LocalStorage (server-readable + client-optimized)
 * - **Full stack**: Cookie + LocalStorage + B12 (maximum resilience)
 *
 * @example Offline-first pattern
 * ```tsx
 * const storage = new ComposedStorage([
 *   new LocalStorageAdapter(),
 *   new B12Adapter({ apiClient })
 * ]);
 *
 * // Reads from localStorage first (fast), falls back to B12 if empty
 * const theme = await storage.getTheme();
 *
 * // Writes to both localStorage and B12 in parallel
 * await storage.setTheme({ mode: 'dark', brand: 'acme' });
 * ```
 *
 * @example SSR-compatible pattern
 * ```tsx
 * const storage = new ComposedStorage([
 *   new CookieStorage(),
 *   new LocalStorageAdapter()
 * ]);
 * ```
 */
export class ComposedStorage implements ThemeStorage {
  private adapters: ThemeStorage[];

  /**
   * Create composed storage with multiple adapters.
   *
   * @param adapters - Array of storage adapters (order matters for reads)
   * @throws Error if no adapters provided
   */
  constructor(adapters: ThemeStorage[]) {
    if (adapters.length === 0) {
      throw new Error('ComposedStorage requires at least one adapter');
    }
    this.adapters = adapters;
  }

  /**
   * Read theme from first adapter with data.
   * Tries adapters in order until one returns a value.
   *
   * @returns Theme preference or null if all adapters are empty
   */
  async getTheme(): Promise<ThemePreference | null> {
    // Read from first adapter that returns a value
    for (const adapter of this.adapters) {
      try {
        const theme = await adapter.getTheme();
        if (theme) return theme;
      } catch (error) {
        // Skip failing adapters and continue to next
        console.warn('ComposedStorage: Adapter failed during getTheme:', error);
      }
    }
    return null;
  }

  /**
   * Write theme to all adapters in parallel.
   * Uses Promise.allSettled to continue even if some adapters fail.
   *
   * @param preference - Theme preference to persist
   */
  async setTheme(preference: ThemePreference): Promise<void> {
    // Write to all adapters in parallel
    await Promise.allSettled(this.adapters.map((adapter) => adapter.setTheme(preference)));
  }

  /**
   * Clear theme from all adapters in parallel.
   */
  async clearTheme(): Promise<void> {
    await Promise.allSettled(this.adapters.map((adapter) => adapter.clearTheme()));
  }
}
