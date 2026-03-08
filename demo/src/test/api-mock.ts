/**
 * API mock helpers for unit tests.
 *
 * Provides lightweight `fetch` mocking without requiring MSW.
 * Use these for hook / component tests that call the API.
 *
 * ```ts
 * import { mockApiResponse, mockApiList, mockApiError } from '@/test/api-mock';
 *
 * beforeEach(() => { installFetchMock(); });
 * afterEach(() => { restoreFetch(); });
 *
 * it('loads project', async () => {
 *   mockApiResponse('/api/v1/projects/1/', buildProject({ id: 1 }));
 *   // ... render hook / component
 * });
 * ```
 */

import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Route registry                                                     */
/* ------------------------------------------------------------------ */

interface MockRoute {
  /** URL substring or regex to match against. */
  match: string | RegExp;
  /** HTTP status code. */
  status: number;
  /** JSON body to return. */
  body: unknown;
  /** Optional: match specific HTTP method. */
  method?: string;
}

const routes: MockRoute[] = [];
let originalFetch: typeof globalThis.fetch | null = null;

/* ------------------------------------------------------------------ */
/*  Install / Restore                                                  */
/* ------------------------------------------------------------------ */

/**
 * Replace `globalThis.fetch` with a mock that matches registered routes.
 * Call this in `beforeEach`.
 */
export function installFetchMock(): void {
  routes.length = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const method = (init?.method ?? 'GET').toUpperCase();

    const route = routes.find(r => {
      const urlMatch = typeof r.match === 'string' ? url.includes(r.match) : r.match.test(url);
      const methodMatch = !r.method || r.method === method;
      return urlMatch && methodMatch;
    });

    if (!route) {
      return new Response(JSON.stringify({ detail: 'Not mocked' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
}

/**
 * Restore the original global `fetch`. Call this in `afterEach`.
 */
export function restoreFetch(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
  routes.length = 0;
}

/* ------------------------------------------------------------------ */
/*  Mock registrations                                                 */
/* ------------------------------------------------------------------ */

/**
 * Mock a single-object API response (200).
 *
 * Wraps body in `{ data: body }` to match the DRF envelope the frontend expects.
 */
export function mockApiResponse<T>(urlMatch: string | RegExp, body: T, method?: string): void {
  routes.push({ match: urlMatch, status: 200, body, method });
}

/**
 * Mock a paginated list response (200).
 */
export function mockApiList<T>(urlMatch: string | RegExp, items: T[], count?: number): void {
  routes.push({
    match: urlMatch,
    status: 200,
    body: { results: items, count: count ?? items.length, next: null, previous: null },
    method: 'GET',
  });
}

/**
 * Mock an API error response.
 */
export function mockApiError(
  urlMatch: string | RegExp,
  status: number,
  body?: unknown,
  method?: string,
): void {
  routes.push({
    match: urlMatch,
    status,
    body: body ?? { detail: `Mock error ${status}` },
    method,
  });
}
