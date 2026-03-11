/**
 * Generic array / ID helpers.
 */

/** Split an array into chunks of a given size. */
export const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/** UUID v1-5 check. */
export const isUuid = (value: unknown): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );

/** Strictly numeric PK check. */
export const isNumericId = (value: unknown): boolean =>
  /^\d+$/.test(String(value ?? '').trim());

/** Stable lower-case sort key (missing values sort last). */
export const sortKey = (value: unknown): string => {
  const s = String(value ?? '').trim();
  return s ? s.toLocaleLowerCase() : '\uffff';
};
