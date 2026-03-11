/**
 * DRF response envelope unwrapping helpers.
 *
 * These pure functions normalise the various response shapes DRF may return
 * into consistent typed objects.
 */

import type { ListResult } from './clientTypes';

/**
 * Normalise DRF response body into a single object `T`.
 *
 * Handles: `T`, `{ data: T }`, `{ data: { data: T } }`.
 */
export function unwrapSingle<T>(raw: unknown): T {
  if (typeof raw !== 'object' || raw === null) return raw as T;
  const obj = raw as Record<string, unknown>;
  // { data: { data: T } } — double-wrapped
  if (
    obj.data &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    'data' in (obj.data as Record<string, unknown>) &&
    typeof (obj.data as Record<string, unknown>).data === 'object'
  ) {
    return (obj.data as Record<string, unknown>).data as T;
  }
  // { data: T }
  if ('data' in obj && !('results' in obj) && !Array.isArray(obj.data)) {
    return obj.data as T;
  }
  return raw as T;
}

/**
 * Normalise any list-like DRF response into `{ results, count, next, previous }`.
 *
 * Handles: `T[]`, `{ results, count }`, `{ data: T[] }`,
 *          `{ data: { results, count } }`, `{ data: { data: T[] } }`.
 */
export function unwrapList<T>(raw: unknown): ListResult<T> {
  const empty: ListResult<T> = { results: [], count: 0, next: null, previous: null };

  if (!raw || typeof raw !== 'object') return empty;

  // Direct array
  if (Array.isArray(raw)) {
    return { results: raw as T[], count: raw.length, next: null, previous: null };
  }

  const obj = raw as Record<string, unknown>;

  // Standard DRF paginated: { results, count, next, previous }
  if (Array.isArray(obj.results)) {
    return {
      results: obj.results as T[],
      count: typeof obj.count === 'number' ? obj.count : obj.results.length,
      next: (obj.next as string) ?? null,
      previous: (obj.previous as string) ?? null,
    };
  }

  // Wrapped: { data: { results, count } }
  if (obj.data && typeof obj.data === 'object') {
    const inner = obj.data as Record<string, unknown>;

    if (Array.isArray(inner.results)) {
      return {
        results: inner.results as T[],
        count: typeof inner.count === 'number' ? inner.count : inner.results.length,
        next: (inner.next as string) ?? null,
        previous: (inner.previous as string) ?? null,
      };
    }

    // { data: T[] }
    if (Array.isArray(inner)) {
      return { results: inner as T[], count: (inner as T[]).length, next: null, previous: null };
    }

    // { data: { data: T[] } }
    if (inner.data && Array.isArray(inner.data)) {
      return {
        results: inner.data as T[],
        count: typeof inner.count === 'number' ? inner.count : (inner.data as T[]).length,
        next: (inner.next as string) ?? null,
        previous: (inner.previous as string) ?? null,
      };
    }
  }

  // { data: T[] }
  if (Array.isArray(obj.data)) {
    return {
      results: obj.data as T[],
      count: typeof obj.count === 'number' ? obj.count : obj.data.length,
      next: (obj.next as string) ?? null,
      previous: (obj.previous as string) ?? null,
    };
  }

  return empty;
}
