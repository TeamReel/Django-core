/**
 * useContentTypes Hook
 *
 * Resolves Django ContentType model names (e.g. 'activity', 'projectmembership')
 * to their integer PK IDs. Caches results for the session.
 *
 * Uses: GET /api/v1/workflows/content-types/?models=activity,projectmembership,...
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';

// Module-level cache shared across all hook instances
const contentTypeCache: Record<string, number> = {};
let cacheFetchPromise: Promise<void> | null = null;

/** All model names we might need to resolve */
const KNOWN_MODELS = [
  'activity',
  'period',
  'projectmembership',
  'brandasset',
  'fileasset',
  'videojob',
  'competition',
] as const;

export type ContentTypeName = typeof KNOWN_MODELS[number];

async function fetchContentTypes(): Promise<void> {
  if (Object.keys(contentTypeCache).length > 0) return;

  // Deduplicate concurrent fetches
  if (cacheFetchPromise) {
    await cacheFetchPromise;
    return;
  }

  cacheFetchPromise = (async () => {
    try {
      const models = KNOWN_MODELS.join(',');
      const data = await api.get<Record<string, number>>(`/workflows/content-types/?models=${models}`);

      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([model, id]) => {
          if (typeof id === 'number') {
            contentTypeCache[model] = id;
          }
        });
      }
    } catch (err) {
      logger.error('[useContentTypes] Error fetching content types', err);
    } finally {
      cacheFetchPromise = null;
    }
  })();

  await cacheFetchPromise;
}

/**
 * Hook that provides content type ID resolution.
 *
 * Usage:
 *   const { resolveContentType, ready } = useContentTypes();
 *   const activityCt = resolveContentType('activity'); // number | null
 */
export interface UseContentTypesReturn {
  resolveContentType: (modelName: ContentTypeName) => number | null;
  ready: boolean;
  cache: Record<string, number>;
}

export function useContentTypes(): UseContentTypesReturn {
  const [ready, setReady] = useState(Object.keys(contentTypeCache).length > 0);

  useEffect(() => {
    let cancelled = false;
    fetchContentTypes().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const resolveContentType = useCallback(
    (modelName: ContentTypeName): number | null => {
      return contentTypeCache[modelName] ?? null;
    },
    []
  );

  return { resolveContentType, ready, cache: contentTypeCache };
}

/**
 * Imperative resolver (for use outside React components).
 * Fetches if not cached, then returns the content type ID.
 */
export async function resolveContentTypeId(
  modelName: ContentTypeName
): Promise<number | null> {
  if (contentTypeCache[modelName]) return contentTypeCache[modelName];

  await fetchContentTypes();
  return contentTypeCache[modelName] ?? null;
}
