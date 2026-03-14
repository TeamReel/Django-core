/**
 * DRF / Django REST API envelope utilities.
 *
 * Our API returns responses in various envelope shapes:
 *   { data: T }            — single object
 *   { results: T[], count } — paginated list
 *   { data: { results: T[], count } } — double-wrapped list
 *   T                      — raw (no envelope)
 *
 * These helpers normalise all shapes into predictable output.
 * Replaces 7+ copies of unwrapEnvelope, 4+ extractList, etc.
 */

/** Unwrap a single-object API envelope: `{ data: T }` → `T`. */
export function unwrapEnvelope<T = unknown>(raw: unknown): T {
  const r = raw as Record<string, unknown>;
  // Handle double-nested: { data: { data: {...} } }
  const candidate = (r?.data as Record<string, unknown>)?.data;
  if (candidate && typeof candidate === 'object' && (candidate as Record<string, unknown>).id) return candidate as T;
  return (r?.data ?? raw) as T;
}

/**
 * Normalise any list-like API response into a flat array.
 *
 * Handles: `T[]`, `{ results: T[] }`, `{ data: T[] }`,
 *          `{ data: { results: T[] } }`, `{ data: { data: T[] } }`.
 */
export function extractList<T = unknown>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r?.results)) return r.results as T[];
  if (Array.isArray(r?.data)) return r.data as T[];
  const nested = r?.data as Record<string, unknown> | undefined;
  if (Array.isArray(nested?.data)) return nested.data as T[];
  if (Array.isArray(nested?.results)) return nested.results as T[];
  return [];
}

/**
 * Extract item count from a paginated envelope.
 * Falls back to the list length when no `count` field is present.
 */
export function extractCount(raw: unknown): number {
  const r = raw as Record<string, unknown>;
  const envelope = (r?.data ?? r) as Record<string, unknown>;
  const countRaw = (envelope?.count ?? r?.count) as unknown;
  if (typeof countRaw === 'number') return countRaw;
  const list = extractList(envelope);
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Full list-envelope parser — returns both array and count.
 * Handles deeply nested DRF response formats.
 */
export function parseListEnvelope<T = unknown>(raw: unknown): { results: T[]; count: number } {
  const r = raw as Record<string, unknown>;
  const envelope = (r?.data ?? r) as Record<string, unknown>;
  const results =
    envelope?.results ??
    envelope?.data ??
    r?.results ??
    r?.data ??
    r ??
    [];

  const list = Array.isArray(results) ? (results as T[]) : [];
  const count =
    typeof (envelope as Record<string, unknown>)?.count === 'number'
      ? (envelope as Record<string, unknown>).count as number
      : typeof r?.count === 'number'
        ? r.count as number
        : list.length;
  return { results: list, count };
}
