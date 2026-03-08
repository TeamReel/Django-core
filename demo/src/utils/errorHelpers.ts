/**
 * Safe error-message extractor for `catch (err: unknown)` blocks.
 *
 * TypeScript strict mode types `err` as `unknown`, so `err.message` is illegal.
 * This one-liner replaces the 50+ copies of `err instanceof Error ? err.message : ...`.
 *
 * ```ts
 * catch (err: unknown) {
 *   setError(getErrorMessage(err));
 * }
 * ```
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  ) {
    return (err as Record<string, unknown>).message as string;
  }
  return String(err);
}

/**
 * Check whether an unknown error is an `AbortError` (from `AbortController`).
 */
export function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === 'AbortError' ||
    (typeof err === 'object' && err !== null && 'name' in err && (err as Record<string, unknown>).name === 'AbortError')
  );
}

/**
 * Extract a numeric `status` from an unknown error (e.g. ApiError, fetch wrappers).
 */
export function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as Record<string, unknown>).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}
