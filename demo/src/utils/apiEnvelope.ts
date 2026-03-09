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
  const r = raw as Record<string, any>;
  // Handle double-nested: { data: { data: {...} } }
  const candidate = r?.data?.data;
  if (candidate && typeof candidate === 'object' && candidate.id) return candidate as T;
  return (r?.data ?? raw) as T;
}

/**
 * Normalise any list-like API response into a flat array.
 *
 * Handles: `T[]`, `{ results: T[] }`, `{ data: T[] }`,
 *          `{ data: { results: T[] } }`, `{ data: { data: T[] } }`.
 */
export function extractList(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const r = raw as Record<string, any>;
  if (Array.isArray(r?.results)) return r.results;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  if (Array.isArray(r?.data?.results)) return r.data.results;
  return [];
}

/**
 * Extract item count from a paginated envelope.
 * Falls back to the list length when no `count` field is present.
 */
export function extractCount(raw: unknown): number {
  const r = raw as Record<string, any>;
  const envelope = r?.data ?? r;
  const countRaw = envelope?.count ?? r?.count;
  if (typeof countRaw === 'number') return countRaw;
  const list = extractList(envelope);
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Full list-envelope parser — returns both array and count.
 * Handles deeply nested DRF response formats.
 */
export function parseListEnvelope(raw: unknown): { results: any[]; count: number } {
  const r = raw as Record<string, any>;
  const envelope = r?.data ?? r;
  const results =
    envelope?.results ??
    envelope?.data ??
    r?.results ??
    r?.data ??
    r ??
    [];

  const list = Array.isArray(results) ? results : [];
  const count =
    typeof envelope?.count === 'number'
      ? envelope.count
      : typeof r?.count === 'number'
        ? r.count
        : list.length;
  return { results: list, count };
}
