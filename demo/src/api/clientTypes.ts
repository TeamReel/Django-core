/**
 * Type definitions for the API client.
 */

/** Shape returned by `api.list()`. */
export interface ListResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

/** Options for `api.list()`. */
export interface ListOptions {
  /** Extra query params to append. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Override page size (default: server default, usually 20). */
  pageSize?: number;
  /** Override page number. */
  page?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

/** Options for `api.listAll()`. */
export interface ListAllOptions {
  /** Extra query params. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Page size per request (default: 100). */
  pageSize?: number;
  /** Maximum total items to fetch (safety limit). Default: 5000. */
  maxItems?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

/** Options for `api.get()`. */
export interface GetOptions {
  /** Extra query params to append. */
  params?: Record<string, string | number | boolean | undefined>;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

/** Options for mutating requests. */
export interface MutateOptions {
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Extra headers to include in the request. */
  headers?: Record<string, string>;
}
