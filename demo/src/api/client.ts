/**
 * Core typed API client for TeamReel.
 *
 * Builds on the existing `apiFetch` layer and adds:
 *   - Structured `ApiError` with status, body, field errors
 *   - Automatic DRF envelope unwrapping (no more `raw.data.results`)
 *   - Typed generics — `api.get<Project>(url)` returns `Project`
 *   - `list<T>()` → `{ results: T[]; count: number }`
 *   - `listAll<T>()` → auto-paginate and return full `T[]`
 *   - File upload helper
 *
 * Existing `apiFetch`, `apiGet`, etc. remain unchanged for backward
 * compatibility — new code should use this client instead.
 *
 * ```ts
 * import { api } from '@/api/client';
 * import type { Project } from '@/types/api';
 *
 * const project = await api.get<Project>(`/api/v1/projects/${id}/`);
 * const { results, count } = await api.list<Activity>('/api/v1/activities/');
 * ```
 */

import { apiFetch, getApiV1BaseUrl } from '../utils/apiFetch';
import { ApiError } from './errors';
import type { ListResult, ListOptions, ListAllOptions, GetOptions, MutateOptions } from './clientTypes';
import { unwrapSingle, unwrapList } from './clientUnwrap';

// Re-export types for backward compatibility
export type { ListResult, ListOptions, ListAllOptions, GetOptions, MutateOptions } from './clientTypes';

/* ------------------------------------------------------------------ */
/*  Query-string helpers                                               */
/* ------------------------------------------------------------------ */

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  // Resolve relative paths against v1 base
  const base = path.startsWith('http') ? '' : getApiV1BaseUrl();
  const url = new URL(`${base}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/* ------------------------------------------------------------------ */
/*  Core request handler                                               */
/* ------------------------------------------------------------------ */

async function request(
  method: string,
  url: string,
  body?: unknown,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): Promise<unknown> {
  const init: RequestInit = { method, signal };

  if (body !== undefined) {
    if (body instanceof FormData) {
      // Let the browser set the Content-Type with boundary
      init.body = body;
      init.headers = { 'Content-Type': '', ...headers };
    } else {
      init.body = JSON.stringify(body);
      if (headers) init.headers = headers;
    }
  } else if (headers) {
    init.headers = headers;
  }

  const res = await apiFetch(url, init);

  // 204 No Content — successful but no body
  if (res.status === 204) return undefined;

  // Try to parse JSON; fall back to text
  let data: unknown;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = text || undefined;
  }

  if (!res.ok) {
    throw new ApiError(res.status, method, url, data);
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Public API client                                                  */
/* ------------------------------------------------------------------ */

export const api = {
  /* ───── Single-object methods ────────────────────────────── */

  /**
   * GET a single resource.
   * ```ts
   * const project = await api.get<Project>('/projects/42/');
   * ```
   */
  async get<T>(path: string, optsOrSignal?: AbortSignal | GetOptions): Promise<T> {
    let signal: AbortSignal | undefined;
    let params: Record<string, string | number | boolean | undefined> | undefined;
    if (optsOrSignal instanceof AbortSignal) {
      signal = optsOrSignal;
    } else if (optsOrSignal) {
      signal = optsOrSignal.signal;
      params = optsOrSignal.params;
    }
    const url = buildUrl(path, params);
    const raw = await request('GET', url, undefined, signal);
    return unwrapSingle<T>(raw);
  },

  /**
   * POST — create a resource.
   * ```ts
   * const newProject = await api.post<Project>('/projects/', { name: 'FC Test' });
   * ```
   */
  async post<T>(path: string, body?: unknown, opts?: MutateOptions): Promise<T> {
    const url = buildUrl(path);
    const raw = await request('POST', url, body, opts?.signal, opts?.headers);
    return unwrapSingle<T>(raw);
  },

  /**
   * PATCH — partial update.
   * ```ts
   * const updated = await api.patch<Project>('/projects/42/', { name: 'New Name' });
   * ```
   */
  async patch<T>(path: string, body?: unknown, opts?: MutateOptions): Promise<T> {
    const url = buildUrl(path);
    const raw = await request('PATCH', url, body, opts?.signal, opts?.headers);
    return unwrapSingle<T>(raw);
  },

  /**
   * PUT — full replace.
   */
  async put<T>(path: string, body?: unknown, opts?: MutateOptions): Promise<T> {
    const url = buildUrl(path);
    const raw = await request('PUT', url, body, opts?.signal, opts?.headers);
    return unwrapSingle<T>(raw);
  },

  /**
   * DELETE — remove a resource.
   * Returns the response body if any, otherwise `undefined`.
   */
  async delete(path: string, opts?: MutateOptions): Promise<void> {
    const url = buildUrl(path);
    await request('DELETE', url, undefined, opts?.signal);
  },

  /* ───── List / paginated methods ─────────────────────────── */

  /**
   * Fetch a single paginated page.
   * ```ts
   * const { results, count } = await api.list<Activity>('/activities/', {
   *   params: { period: periodId },
   *   pageSize: 25,
   * });
   * ```
   */
  async list<T>(path: string, opts?: ListOptions): Promise<ListResult<T>> {
    const params: Record<string, string | number | boolean | undefined> = {
      ...opts?.params,
    };
    if (opts?.pageSize) params.page_size = opts.pageSize;
    if (opts?.page) params.page = opts.page;

    const url = buildUrl(path, params);
    const raw = await request('GET', url, undefined, opts?.signal);
    return unwrapList<T>(raw);
  },

  /**
   * Auto-paginate and return every item across all pages.
   *
   * ```ts
   * const allMembers = await api.listAll<ProjectMembership>('/projects/5/members/');
   * ```
   *
   * **Safety:** stops at `maxItems` (default 5 000) to prevent runaway loops.
   */
  async listAll<T>(path: string, opts?: ListAllOptions): Promise<T[]> {
    const pageSize = opts?.pageSize ?? 100;
    const maxItems = opts?.maxItems ?? 5000;
    const allItems: T[] = [];
    let page = 1;

    while (allItems.length < maxItems) {
      const result = await api.list<T>(path, {
        params: opts?.params,
        pageSize,
        page,
        signal: opts?.signal,
      });

      allItems.push(...result.results);

      if (!result.next || result.results.length === 0) break;
      page++;
    }

    return allItems.slice(0, maxItems);
  },

  /* ───── File upload ──────────────────────────────────────── */

  /**
   * Upload a file via multipart/form-data.
   *
   * ```ts
   * const asset = await api.upload<FileAsset>('/files/', file, {
   *   organization: orgId,
   * });
   * ```
   */
  async upload<T>(
    path: string,
    file: File,
    fields?: Record<string, string>,
    opts?: MutateOptions,
  ): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        form.append(k, v);
      }
    }
    const url = buildUrl(path);
    // For FormData we need to remove the Content-Type so the browser sets it
    const res = await apiFetch(url, {
      method: 'POST',
      body: form,
      // Override the default Content-Type to let the browser set multipart boundary
      headers: {},
      signal: opts?.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      throw new ApiError(res.status, 'POST', url, body);
    }
    const raw = await res.json();
    return unwrapSingle<T>(raw);
  },
};

export type ApiClient = typeof api;
