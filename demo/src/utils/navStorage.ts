export type NavEntityKind =
  | 'federation'
  | 'club'
  | 'team'
  | 'season'
  | 'competition'
  | 'match'
  | 'user'
  | 'page';

export interface NavStoredItem {
  kind: NavEntityKind;
  label: string;
  path: string;
  ts: number;
}

const RECENTS_KEY = 'teamreel_nav_recents_v1';
const FAVORITES_KEY = 'teamreel_nav_favorites_v1';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emit(eventName: string) {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch {
    // ignore
  }
}

export function getRecents(): NavStoredItem[] {
  const raw = window.localStorage.getItem(RECENTS_KEY);
  const items = safeParse<NavStoredItem[]>(raw, []);
  return Array.isArray(items) ? items : [];
}

export function addRecent(input: Omit<NavStoredItem, 'ts'>, maxItems = 12) {
  const now = Date.now();
  const normalizedPath = String(input.path || '').trim();
  if (!normalizedPath) return;

  const existing = getRecents();
  const next: NavStoredItem[] = [
    { ...input, path: normalizedPath, ts: now },
    ...existing.filter((x) => String(x?.path || '').trim() !== normalizedPath),
  ].slice(0, Math.max(1, maxItems));

  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  emit('nav:recents');
}

export function clearRecents() {
  window.localStorage.removeItem(RECENTS_KEY);
  emit('nav:recents');
}

export function removeRecent(path: string) {
  const p = String(path || '').trim();
  if (!p) return;
  const existing = getRecents();
  const next = existing.filter((x) => String(x?.path || '').trim() !== p);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  emit('nav:recents');
}

export function getFavorites(): NavStoredItem[] {
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  const items = safeParse<NavStoredItem[]>(raw, []);
  return Array.isArray(items) ? items : [];
}

export function isFavorite(path: string): boolean {
  const p = String(path || '').trim();
  if (!p) return false;
  return getFavorites().some((x) => String(x?.path || '').trim() === p);
}

export function addFavorite(input: Omit<NavStoredItem, 'ts'>) {
  const now = Date.now();
  const normalizedPath = String(input.path || '').trim();
  if (!normalizedPath) return;

  const existing = getFavorites();
  const next: NavStoredItem[] = [
    { ...input, path: normalizedPath, ts: now },
    ...existing.filter((x) => String(x?.path || '').trim() !== normalizedPath),
  ];

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  emit('nav:favorites');
}

export function removeFavorite(path: string) {
  const p = String(path || '').trim();
  if (!p) return;
  const existing = getFavorites();
  const next = existing.filter((x) => String(x?.path || '').trim() !== p);
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  emit('nav:favorites');
}

export function toggleFavorite(input: Omit<NavStoredItem, 'ts'>) {
  if (isFavorite(input.path)) removeFavorite(input.path);
  else addFavorite(input);
}

export function clearFavorites() {
  window.localStorage.removeItem(FAVORITES_KEY);
  emit('nav:favorites');
}
