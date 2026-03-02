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
export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** POST + parse JSON. */
export async function apiPost<T = any>(
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
export async function apiPatch<T = any>(
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
export async function apiPut<T = any>(
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
