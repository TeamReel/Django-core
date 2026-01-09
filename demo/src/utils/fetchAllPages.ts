type Envelope<T> = {
  data?: {
    results?: T[];
    next?: string | null;
  };
  results?: T[];
  next?: string | null;
};

export async function fetchAllPages<T>(
  initialUrl: string,
  init: RequestInit = { credentials: 'include' },
): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const res = await fetch(url, init);
    if (!res.ok) break;

    const json: Envelope<T> | any = await res.json();

    const results = (
      json?.data?.results ||
      json?.results ||
      (Array.isArray(json?.data) ? json.data : null) ||
      (Array.isArray(json) ? json : null) ||
      []
    ) as T[];
    const next = (json?.data?.next || json?.next || null) as string | null;

    if (Array.isArray(results)) {
      all.push(...results);
    }

    url = next;
  }

  return all;
}
