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
};

type CacheEntry<T> = {
  expiresAt: number;
  value?: T[];
  inFlight?: Promise<T[]>;
};

const cache = new Map<string, CacheEntry<any>>();

export function invalidateFetchAllPagesCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
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

  const ttlMs = cacheOptions?.ttlMs ?? 60_000;
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

  while (url) {
    const res = await fetch(url, init);
    if (!res.ok) break;

    const json: Envelope<T> | any = await res.json();

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
      cache.delete(cacheKey);
      throw err;
    }
  }

  return await run;
}
