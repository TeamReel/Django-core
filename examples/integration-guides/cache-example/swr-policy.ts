import type { CachePolicy, CacheInvalidationOptions } from '../contracts/index.js';

/**
 * SWR (Stale-While-Revalidate) based cache policy implementation
 *
 * Respects HTTP Cache-Control headers and implements stale-while-revalidate pattern:
 * - Returns cached data immediately if available
 * - Revalidates in background if data is stale
 * - Returns fresh data after revalidation completes
 *
 * Cache durations (default):
 * - Static data: 10-30 minutes
 * - List endpoints: 5-10 minutes
 * - Detail endpoints: 2-5 minutes
 * - User profile: 1-2 minutes
 *
 * @example
 * ```typescript
 * const cachePolicy = createCachePolicy({
 *   config: new Map([
 *     ['/api/projects', 5 * 60 * 1000],           // 5 minutes
 *     ['/api/organisations', 10 * 60 * 1000],     // 10 minutes
 *     ['/api/users/me', 2 * 60 * 1000],           // 2 minutes
 *   ]),
 * });
 *
 * const apiClient = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   authProvider: auth,
 *   contextProvider: context,
 *   cachePolicy,
 * });
 *
 * // First call: fetches from backend
 * const projects1 = await apiClient.get<Project[]>('/api/projects');
 *
 * // Second call (within 5 min): returns cached data
 * const projects2 = await apiClient.get<Project[]>('/api/projects');
 *
 * // Invalidate cache after mutation
 * await apiClient.post('/api/projects', { name: 'New Project' });
 * cachePolicy.invalidate({ pattern: '/api/projects*' });
 * ```
 */

interface CachedEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  revalidateAt: number;
}

interface SwrCachePolicyOptions {
  config?: Map<string, number> | Record<string, number>;
  maxEntries?: number;
}

export class SwrCachePolicy implements CachePolicy {
  private cache = new Map<string, CachedEntry<unknown>>();
  private config: Map<string, number>;
  private readonly maxEntries: number;

  constructor(options?: SwrCachePolicyOptions) {
    this.maxEntries = options?.maxEntries ?? 100;

    // Convert config to Map
    if (!options?.config) {
      this.config = this.getDefaultConfig();
    } else if (options.config instanceof Map) {
      this.config = options.config;
    } else {
      this.config = new Map(Object.entries(options.config));
    }
  }

  /**
   * Default cache duration configuration
   */
  private getDefaultConfig(): Map<string, number> {
    return new Map([
      // Static/rarely changing data - 30 minutes
      ['/api/permissions', 30 * 60 * 1000],
      ['/api/roles', 30 * 60 * 1000],

      // Organizations and projects - 10 minutes
      ['/api/organisations', 10 * 60 * 1000],
      ['/api/projects', 10 * 60 * 1000],

      // List endpoints - 5 minutes
      ['/api/tasks', 5 * 60 * 1000],
      ['/api/users', 5 * 60 * 1000],

      // Detail endpoints - 3 minutes
      ['/api/projects/*', 3 * 60 * 1000],
      ['/api/tasks/*', 3 * 60 * 1000],

      // User profile - 2 minutes
      ['/api/users/me', 2 * 60 * 1000],
    ]);
  }

  /**
   * Find matching cache duration for a path
   */
  private getCacheDurationFromConfig(path: string): number | null {
    // Exact match
    if (this.config.has(path)) {
      return this.config.get(path) ?? null;
    }

    // Pattern match (wildcard at end)
    for (const [pattern, duration] of this.config) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);

        if (path.startsWith(prefix)) {
          return duration;
        }
      }
    }

    return null;
  }

  /**
   * Check if request should be cached
   * Only cache GET requests
   */
  shouldCache(path: string, method: string, _cacheControl?: string): boolean {
    // Only cache GET requests
    if (method !== 'GET') {
      return false;
    }

    // Check if path matches config
    return this.getCacheDurationFromConfig(path) !== null;
  }

  /**
   * Get cache duration from Cache-Control header or config
   */
  getCacheDuration(path: string, cacheControl?: string): number {
    // Parse Cache-Control max-age header
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);

      if (maxAgeMatch?.[1]) {
        return parseInt(maxAgeMatch[1], 10) * 1000; // Convert to milliseconds
      }
    }

    // Fall back to config
    return this.getCacheDurationFromConfig(path) ?? 5 * 60 * 1000; // Default 5 minutes
  }

  /**
   * Check if cached data should be revalidated
   * Implements stale-while-revalidate: returns cached data but sets up background revalidation
   */
  shouldRevalidate(_path: string, cachedAt: Date, expiresIn: number): boolean {
    const now = Date.now();
    const cacheAge = now - cachedAt.getTime();

    // If cache age < expiration time, use cache
    if (cacheAge < expiresIn) {
      return false;
    }

    // If cache is stale, return true to trigger revalidation
    return true;
  }

  /**
   * Get cached response if available
   */
  get<T>(path: string): { data: T; cachedAt: Date; expiresIn: number } | undefined {
    const entry = this.cache.get(path) as CachedEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    const now = Date.now();

    // Check if cache is expired
    if (now > entry.expiresAt) {
      // Cache is stale, remove it
      this.cache.delete(path);
      return undefined;
    }

    return {
      data: entry.data,
      cachedAt: new Date(entry.cachedAt),
      expiresIn: entry.expiresAt - entry.cachedAt,
    };
  }

  /**
   * Store response in cache
   */
  set<T>(path: string, data: T, expiresIn: number): void {
    // stale-while-revalidate: revalidate at 80% of cache duration
    const revalidateDelay = expiresIn * 0.8;

    const entry: CachedEntry<T> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + expiresIn,
      revalidateAt: Date.now() + revalidateDelay,
    };

    // Enforce max entries limit (simple FIFO eviction)
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;

      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(path, entry);
  }

  /**
   * Invalidate cache entries matching pattern
   * Patterns support wildcards: '/api/projects*', '/api/projects/123', etc.
   */
  invalidate(options: CacheInvalidationOptions): void {
    const { pattern, exact = false } = options;

    if (exact) {
      // Exact match
      this.cache.delete(pattern);
    } else if (pattern.endsWith('*')) {
      // Wildcard match: /api/projects* matches /api/projects, /api/projects/123, etc.
      const prefix = pattern.slice(0, -1);

      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Prefix match: /api/projects matches /api/projects and /api/projects/123
      for (const key of this.cache.keys()) {
        if (key === pattern || key.startsWith(pattern + '/')) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cached entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (useful for debugging)
   */
  getStats(): {
    size: number;
    entries: Array<{
      path: string;
      cachedAt: number;
      expiresAt: number;
      isStale: boolean;
      needsRevalidation: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([path, entry]) => ({
      path,
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
      isStale: now > entry.expiresAt,
      needsRevalidation: now > entry.revalidateAt,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Get cache entry age in milliseconds
   */
  getEntryAge(path: string): number | null {
    const entry = this.cache.get(path);

    if (!entry) {
      return null;
    }

    return Date.now() - entry.cachedAt;
  }

  /**
   * Monitor cache invalidations (useful for debugging)
   */
  monitorInvalidations(onInvalidate?: (pattern: string) => void): () => void {
    const originalInvalidate = this.invalidate.bind(this);

    this.invalidate = (options: CacheInvalidationOptions): void => {
      console.log(`🗑️ Cache invalidation: ${options.exact ? 'EXACT' : 'PATTERN'} "${options.pattern}"`);
      onInvalidate?.(options.pattern);
      return originalInvalidate(options);
    };

    return (): void => {
      this.invalidate = originalInvalidate;
    };
  }
}

/**
 * Factory function to create cache policy instance
 */
export function createCachePolicy(options?: SwrCachePolicyOptions): CachePolicy {
  return new SwrCachePolicy(options);
}

// ============================================================================
// Debugging Utilities
// ============================================================================

/**
 * Log cache statistics for debugging
 */
export function logCacheStats(cachePolicy: SwrCachePolicy): void {
  const stats = cachePolicy.getStats();

  console.group(`Cache Statistics (${stats.size} entries)`);

  for (const entry of stats.entries) {
    const age = Date.now() - entry.cachedAt;
    const status = entry.isStale ? '❌ STALE' : entry.needsRevalidation ? '⚠️ REVALIDATE' : '✅ FRESH';

    console.log(`${status} ${entry.path} (age: ${age}ms)`);
  }

  console.groupEnd();
}
