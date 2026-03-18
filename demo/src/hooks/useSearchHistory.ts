/**
 * useSearchHistory — Persist recent search queries in localStorage.
 *
 * Features:
 * - Stores up to `maxItems` recent queries (default 10)
 * - De-duplicates (moving repeated queries to top)
 * - Exposes add / remove / clear helpers
 * - Listens to storage events for cross-tab sync
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'teamreel_search_history_v1';
const DEFAULT_MAX = 10;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

function persist(items: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSearchHistory(maxItems = DEFAULT_MAX) {
  const [history, setHistory] = useState<string[]>(load);

  // Sync with storage changes (other tabs)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addQuery = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      setHistory((prev) => {
        const next = [q, ...prev.filter((p) => p.toLowerCase() !== q.toLowerCase())].slice(
          0,
          maxItems,
        );
        persist(next);
        return next;
      });
    },
    [maxItems],
  );

  const removeQuery = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((p) => p.toLowerCase() !== query.toLowerCase());
      persist(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addQuery, removeQuery, clearHistory } as const;
}
