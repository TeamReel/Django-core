/**
 * Structured API error with status code, message, and optional server body.
 *
 * Thrown by every `ApiClient` method when the server returns a non-2xx status.
 * Replaces 50+ `if (!res.ok) throw new Error(...)` patterns.
 *
 * ```ts
 * try {
 *   const project = await api.get<Project>('/api/v1/projects/42/');
 * } catch (err) {
 *   if (err instanceof ApiError && err.status === 404) {
 *     // handle not found
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code (e.g. 400, 403, 404, 500). */
  readonly status: number;

  /**
   * Parsed JSON body from the error response, if any.
   * DRF typically returns `{ detail: "..." }` or field-level errors.
   */
  readonly body: unknown;

  /** The HTTP method that triggered the error. */
  readonly method: string;

  /** The URL that was requested. */
  readonly url: string;

  constructor(status: number, method: string, url: string, body?: unknown) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as Record<string, unknown>).detail)
        : `${method} ${url} failed`;
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.method = method;
    this.url = url;
    this.body = body;
  }

  /** True when the server returned a 4xx status. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True when the server returned a 5xx status. */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** Convenience: returns the `detail` string from a DRF error body. */
  get detail(): string | undefined {
    if (typeof this.body === 'object' && this.body !== null && 'detail' in this.body) {
      return String((this.body as Record<string, unknown>).detail);
    }
    return undefined;
  }

  /**
   * Convenience: returns per-field validation errors from a DRF error body.
   * Example: `{ name: ["This field is required."] }`
   */
  get fieldErrors(): Record<string, string[]> | undefined {
    if (typeof this.body !== 'object' || this.body === null) return undefined;
    const result: Record<string, string[]> = {};
    let hasFields = false;
    for (const [key, val] of Object.entries(this.body as Record<string, unknown>)) {
      if (key === 'detail') continue;
      if (Array.isArray(val)) {
        result[key] = val.map(String);
        hasFields = true;
      } else if (typeof val === 'string') {
        result[key] = [val];
        hasFields = true;
      }
    }
    return hasFields ? result : undefined;
  }
}
