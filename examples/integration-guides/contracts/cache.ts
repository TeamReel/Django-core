/**
 * Cache Policy Interface
 *
 * Implement this interface to define caching behavior for API responses.
 * Integrates with HTTP Cache-Control headers and client-side cache libraries.
 *
 * @see {@link https://docs.django-core.example.com/integration-guides/caching | Caching Guide}
 * @packageDocumentation
 */

import type { CachedResponse, CacheInvalidationOptions } from './types';

/**
 * Cache policy interface for API response caching
 *
 * This interface defines the contract for client-side caching decisions.
 * Implementations MUST:
 * - Respect HTTP Cache-Control headers from backend
 * - Provide configurable cache durations per endpoint pattern
 * - Support cache invalidation by pattern
 * - Handle stale-while-revalidate pattern
 *
 * @example SWR-based Implementation
 * ```typescript
 * class SwrCachePolicy implements CachePolicy {
 *   private config: Map<string, number> = new Map([
 *     ['/api/projects', 5 * 60 * 1000], // 5 minutes
 *     ['/api/organisations', 10 * 60 * 1000], // 10 minutes
 *     ['/api/users/me', 2 * 60 * 1000], // 2 minutes
 *   ]);
 *
 *   shouldCache(path: string, method: string): boolean {
 *     // Only cache GET requests
 *     if (method !== 'GET') return false;
 *
 *     // Don't cache dynamic paths with query params
 *     if (path.includes('?')) return false;
 *
 *     return this.config.has(this.getPattern(path));
 *   }
 *
 *   getCacheDuration(path: string, cacheControl?: string): number {
 *     // Respect Cache-Control header if present
 *     if (cacheControl) {
 *       const maxAge = /max-age=(\d+)/.exec(cacheControl)?.[1];
 *       if (maxAge) return parseInt(maxAge, 10) * 1000;
 *     }
 *
 *     // Fallback to configured duration
 *     const pattern = this.getPattern(path);
 *     return this.config.get(pattern) || 60 * 1000; // Default 1 minute
 *   }
 * }
 * ```
 */
export interface CachePolicy {
  /**
   * Determine if response should be cached
   *
   * Implementation guidelines:
   * - Cache GET requests only (POST/PUT/DELETE/PATCH are not cacheable)
   * - Don't cache authenticated user-specific endpoints (e.g., /api/users/me)
   * - Don't cache search results with query parameters
   * - Cache list endpoints (e.g., /api/projects, /api/organisations)
   * - Cache detail endpoints (e.g., /api/projects/{id})
   *
   * @param path - API path
   * @param method - HTTP method
   * @param cacheControl - Cache-Control header from response (if available)
   * @returns true if response should be cached, false otherwise
   *
   * @example
   * ```typescript
   * const shouldCache = cachePolicy.shouldCache('/api/projects', 'GET');
   * // true - list endpoints are cacheable
   *
   * const shouldCache2 = cachePolicy.shouldCache('/api/projects', 'POST');
   * // false - POST requests are not cacheable
   * ```
   */
  shouldCache(path: string, method: string, cacheControl?: string): boolean;

  /**
   * Get cache duration for response
   *
   * Implementation MUST:
   * - Respect Cache-Control max-age directive from backend
   * - Provide fallback duration if no Cache-Control header
   * - Return 0 for no caching
   *
   * Cache duration recommendations:
   * - Static data (rarely changes): 10-30 minutes
   * - List endpoints: 5-10 minutes
   * - Detail endpoints: 2-5 minutes
   * - User profile: 1-2 minutes
   *
   * @param path - API path
   * @param cacheControl - Cache-Control header from response (if available)
   * @returns Cache duration in milliseconds, or 0 for no caching
   *
   * @example
   * ```typescript
   * const duration = cachePolicy.getCacheDuration('/api/projects', 'max-age=300');
   * // 300000 (5 minutes in ms, from Cache-Control header)
   *
   * const duration2 = cachePolicy.getCacheDuration('/api/projects');
   * // 300000 (5 minutes, fallback from config)
   * ```
   */
  getCacheDuration(path: string, cacheControl?: string): number;

  /**
   * Determine if cached data should be revalidated
   *
   * Use this to implement stale-while-revalidate pattern:
   * - Return cached data immediately
   * - Fetch fresh data in background
   * - Update cache when fresh data arrives
   *
   * Implementation guidelines:
   * - Revalidate if data is older than 50% of cache duration
   * - Always revalidate on focus/reconnect
   * - Don't revalidate if data is fresh (less than 10 seconds old)
   *
   * @param path - API path
   * @param cachedAt - When data was cached
   * @param expiresIn - Cache duration in milliseconds
   * @returns true if data should be revalidated, false otherwise
   *
   * @example
   * ```typescript
   * const cachedAt = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
   * const expiresIn = 5 * 60 * 1000; // 5 minutes
   *
   * const shouldRevalidate = cachePolicy.shouldRevalidate('/api/projects', cachedAt, expiresIn);
   * // true - data is 60% through cache duration
   * ```
   */
  shouldRevalidate(path: string, cachedAt: Date, expiresIn: number): boolean;

  /**
   * Invalidate cached responses by pattern
   *
   * Use this to:
   * - Clear cache after mutations (POST/PUT/DELETE)
   * - Invalidate related endpoints (e.g., invalidate project list after creating project)
   * - Clear cache on logout
   *
   * Implementation MUST:
   * - Support exact path matching (e.g., "/api/projects/123")
   * - Support wildcard matching (e.g., "/api/projects/*")
   * - Support prefix matching (e.g., "/api/projects")
   *
   * @param options - Invalidation options
   *
   * @example
   * ```typescript
   * // After creating a project
   * await apiClient.post('/api/projects', newProject);
   * cachePolicy.invalidate({ pattern: '/api/projects*' });
   *
   * // After deleting a project
   * await apiClient.delete(`/api/projects/${id}`);
   * cachePolicy.invalidate({ pattern: `/api/projects/${id}`, exact: true });
   * cachePolicy.invalidate({ pattern: '/api/projects*' }); // Also invalidate list
   * ```
   */
  invalidate(options: CacheInvalidationOptions): void;

  /**
   * Clear all cached data
   *
   * Use this when:
   * - User logs out (clear all authenticated data)
   * - Organization/project context changes (clear tenant-specific data)
   * - Manual cache clear (e.g., "Clear cache" button)
   */
  clearAll(): void;

  /**
   * Get cached response if available
   *
   * @param path - API path
   * @returns Cached response or undefined if not cached/expired
   *
   * @example
   * ```typescript
   * const cached = cachePolicy.get<Project[]>('/api/projects');
   * if (cached) {
   *   console.log('Using cached data:', cached.data);
   * }
   * ```
   */
  get<T>(path: string): CachedResponse<T> | undefined;

  /**
   * Store response in cache
   *
   * @param path - API path
   * @param data - Response data to cache
   * @param expiresIn - Cache duration in milliseconds
   *
   * @example
   * ```typescript
   * const { data } = await apiClient.get<Project[]>('/api/projects');
   * const duration = cachePolicy.getCacheDuration('/api/projects');
   * cachePolicy.set('/api/projects', data, duration);
   * ```
   */
  set<T>(path: string, data: T, expiresIn: number): void;
}

/**
 * Cache configuration for endpoint patterns
 */
export interface CacheConfig {
  /** Endpoint pattern (supports wildcards) */
  pattern: string;
  /** Cache duration in milliseconds */
  duration: number;
  /** Revalidation threshold (0-1, where 0.5 = revalidate at 50% of duration) */
  revalidateThreshold?: number;
}

/**
 * Factory function signature for creating CachePolicy instances
 *
 * @example
 * ```typescript
 * const createCachePolicy: CreateCachePolicy = (config) => {
 *   return new SwrCachePolicy(config);
 * };
 *
 * // Usage
 * const cachePolicy = createCachePolicy([
 *   { pattern: '/api/projects*', duration: 5 * 60 * 1000 },
 *   { pattern: '/api/organisations*', duration: 10 * 60 * 1000 },
 * ]);
 * ```
 */
export type CreateCachePolicy = (config: CacheConfig[]) => CachePolicy;
