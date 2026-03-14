import { logger } from './logger';

type Envelope<T> = {
  data?: {
    results?: T[];
    next?: string | null;
  };
  results?: T[];
  next?: string | null;
};

type FetchAllPagesCacheOptions = {
  ttlMs?: number;
  bypass?: boolean;
  cacheKey?: string;
  /**
   * Maximum number of pages to fetch before stopping.
   * Useful for very large datasets where we only want the first page.
   */
  maxPages?: number;
  /**
   * Maximum number of items to return before stopping.
   * Note: if the last fetched page would exceed this, results are truncated.
   */
  maxItems?: number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value?: T[];
  inFlight?: Promise<T[]>;
};

type JsonCacheEntry = {
  expiresAt: number;
  value?: unknown;
  inFlight?: Promise<unknown>;
};

const cache = new Map<string, CacheEntry<unknown>>();
const pageCache = new Map<string, JsonCacheEntry>();

export function invalidateFetchAllPagesCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    pageCache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }

  for (const key of pageCache.keys()) {
    if (key.startsWith(prefix)) {
      pageCache.delete(key);
    }
  }
}

async function fetchJsonWithCache(url: string, init: RequestInit, ttlMs: number, bypass: boolean): Promise<unknown> {
  const method = (init.method || 'GET').toUpperCase();
  const canCache = method === 'GET' && !init.body && !bypass;
  const key = `PAGE:GET:${url}`;

  if (canCache) {
    const existing = pageCache.get(key);
    const now = Date.now();
    if (existing?.value !== undefined && existing.expiresAt > now) return existing.value;
    if (existing?.inFlight) return await existing.inFlight;
  }

  const run = (async () => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  })();

  if (canCache) {
    const entry: JsonCacheEntry = { expiresAt: Date.now() + ttlMs, inFlight: run };
    pageCache.set(key, entry);
    try {
      const value = await run;
      entry.value = value;
      entry.inFlight = undefined;
      entry.expiresAt = Date.now() + ttlMs;
      return value;
    } catch (err) {
      logger.error('JSON cache fetch failed', err);
      pageCache.delete(key);
      throw err;
    }
  }

  return await run;
}

export async function fetchAllPages<T>(
  initialUrl: string,
  init: RequestInit = { credentials: 'include' },
  cacheOptions?: FetchAllPagesCacheOptions,
): Promise<T[]> {
  const method = (init.method || 'GET').toUpperCase();
  const canCache =
    method === 'GET' &&
    !init.body &&
    (cacheOptions?.bypass !== true);

  const ttlMs = cacheOptions?.ttlMs ?? 5 * 60_000;
  const cacheKey = cacheOptions?.cacheKey ?? `GET:${initialUrl}`;

  if (canCache) {
    const existing = cache.get(cacheKey);
    const now = Date.now();
    if (existing?.value && existing.expiresAt > now) {
      return existing.value as T[];
    }
    if (existing?.inFlight) {
      return (await existing.inFlight) as T[];
    }
  }

  const run = (async () => {
  const all: T[] = [];
  let url: string | null = initialUrl;
  let pagesFetched = 0;
  const bypass = cacheOptions?.bypass === true;

  while (url) {
    let json: Envelope<T> | any;
    try {
      json = await fetchJsonWithCache(url, init, ttlMs, bypass);
    } catch {
      break;
    }

    const results = (
      json?.data?.results ||
      json?.data?.data ||
      json?.results ||
      (Array.isArray(json?.data) ? json.data : null) ||
      (Array.isArray(json) ? json : null) ||
      []
    ) as T[];
    const next = (
      json?.meta?.pagination?.next ||
      json?.data?.next ||
      json?.next ||
      null
    ) as string | null;

    if (Array.isArray(results)) {
      all.push(...results);
    }

    pagesFetched += 1;
    if (cacheOptions?.maxPages && pagesFetched >= cacheOptions.maxPages) {
      break;
    }

    if (cacheOptions?.maxItems && all.length >= cacheOptions.maxItems) {
      all.length = cacheOptions.maxItems;
      break;
    }

    url = next;
  }

  return all;
  })();

  if (canCache) {
    const entry: CacheEntry<T> = {
      expiresAt: Date.now() + ttlMs,
      inFlight: run,
    };
    cache.set(cacheKey, entry);

    try {
      const value = await run;
      entry.value = value;
      entry.inFlight = undefined;
      entry.expiresAt = Date.now() + ttlMs;
      return value;
    } catch (err) {
      logger.error('Fetch all pages failed', err);
      cache.delete(cacheKey);
      throw err;
    }
  }

  return await run;
}
