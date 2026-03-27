/**
 * Authenticated fetch wrapper for the TeamReel API.
 *
 * Automatically adds:
 *   - `credentials: 'include'` (session cookies)
 *   - `X-CSRFToken` header (from Django cookie)
 *   - `Content-Type: application/json` (overridable)
 *   - `X-Requested-With: XMLHttpRequest`
 *
 * Replaces 50+ raw fetch() calls with manual header boilerplate.
 */

import { getCsrfToken } from './csrf';
import { getApiBaseUrl } from './apiBase';
import { logger } from './logger';

/* ------------------------------------------------------------------ */
/*  Base URL helpers                                                    */
/* ------------------------------------------------------------------ */

/** `getApiBaseUrl() + '/api/v1'` — used by most API calls. */
export function getApiV1BaseUrl(): string {
  const raw = getApiBaseUrl();
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

/* ------------------------------------------------------------------ */
/*  Authenticated fetch                                                */
/* ------------------------------------------------------------------ */

/**
 * Drop-in replacement for `fetch()` that includes auth headers.
 *
 * ```ts
 * const res = await apiFetch('/api/v1/organisations/');
 * const data = await res.json();
 * ```
 */
export async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRFToken': getCsrfToken(),
  };

  // Merge caller-provided headers (allow overriding defaults)
  if (init?.headers) {
    const incoming =
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init.headers)
          ? Object.fromEntries(init.headers)
          : (init.headers as Record<string, string>);
    Object.assign(headers, incoming);
  }

  return fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });
}

/* ------------------------------------------------------------------ */
/*  Typed convenience methods                                          */
/* ------------------------------------------------------------------ */

/** GET + parse JSON. */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** POST + parse JSON. */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** PATCH + parse JSON. */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PATCH ${url} failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** PUT + parse JSON. */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PUT ${url} failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** DELETE (no body parsing by default). */
export async function apiDelete(url: string): Promise<Response> {
  const res = await apiFetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed (${res.status})`);
  return res;
}

/* ------------------------------------------------------------------ */
/*  Retry wrapper                                                      */
/* ------------------------------------------------------------------ */

export interface RetryOptions {
  /** Number of retries (excluding the initial attempt). Default: 2. */
  retries?: number;
  /** Initial delay in ms — doubled on each attempt. Default: 500. */
  delay?: number;
  /** HTTP methods to retry on network error. Default: GET only. */
  retryMethods?: string[];
  /** HTTP status codes that trigger a retry. Default: 502,503,504. */
  retryStatuses?: number[];
}

/**
 * `apiFetch` with automatic retry on transient network / server errors.
 *
 * Only **idempotent** methods (GET by default) are retried automatically.
 * Non-idempotent methods are only retried when the error is a network failure
 * (no response received at all), since the request never reached the server.
 */
export async function apiFetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: RetryOptions,
): Promise<Response> {
  const {
    retries = 2,
    delay = 500,
    retryMethods = ['GET', 'HEAD', 'OPTIONS'],
    retryStatuses = [502, 503, 504],
  } = opts ?? {};

  const method = (init?.method ?? 'GET').toUpperCase();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch(url, init);

      // Only retry retriable status codes for idempotent methods
      if (retryStatuses.includes(res.status) && retryMethods.includes(method) && attempt < retries) {
        await sleep(delay * 2 ** attempt);
        continue;
      }

      return res;
    } catch (err) {
      logger.error('API fetch failed', err);
      lastError = err;

      // Network failure (no response) — safe to retry any method
      if (attempt < retries) {
        await sleep(delay * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
