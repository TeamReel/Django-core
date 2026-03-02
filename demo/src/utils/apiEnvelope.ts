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
export function unwrapEnvelope<T = any>(raw: any): T {
  // Handle double-nested: { data: { data: {...} } }
  const candidate = raw?.data?.data;
  if (candidate && typeof candidate === 'object' && candidate.id) return candidate as T;
  return (raw?.data ?? raw) as T;
}

/**
 * Normalise any list-like API response into a flat array.
 *
 * Handles: `T[]`, `{ results: T[] }`, `{ data: T[] }`,
 *          `{ data: { results: T[] } }`, `{ data: { data: T[] } }`.
 */
export function extractList(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  if (Array.isArray(raw?.data?.results)) return raw.data.results;
  return [];
}

/**
 * Extract item count from a paginated envelope.
 * Falls back to the list length when no `count` field is present.
 */
export function extractCount(raw: any): number {
  const envelope = raw?.data ?? raw;
  const countRaw = envelope?.count ?? raw?.count;
  if (typeof countRaw === 'number') return countRaw;
  const list = extractList(envelope);
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Full list-envelope parser — returns both array and count.
 * Handles deeply nested DRF response formats.
 */
export function parseListEnvelope(raw: any): { results: any[]; count: number } {
  const envelope = raw?.data ?? raw;
  const results =
    envelope?.results ??
    envelope?.data ??
    raw?.results ??
    raw?.data ??
    raw ??
    [];

  const list = Array.isArray(results) ? results : [];
  const count =
    typeof envelope?.count === 'number'
      ? envelope.count
      : typeof raw?.count === 'number'
        ? raw.count
        : list.length;
  return { results: list, count };
}
