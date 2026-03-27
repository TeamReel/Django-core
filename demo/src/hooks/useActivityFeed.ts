/**
 * useActivityFeed Hook (F17)
 *
 * Fetches activity feed events from the B62 API.
 * Supports cursor-based pagination, filtering, and grouped mode.
 *
 * API: /api/v1/activity-feed/
 *
 * @example
 * ```tsx
 * const { items, loading, hasMore, loadMore, refresh } = useActivityFeed({
 *   organisationId: org.id,
 *   filters: { verb: 'content.created' },
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type {
  ActivityLogItem,
  ActivityLogGroup,
  ActivityFeedResponse,
  ActivityFeedGroupedResponse,
  ActivityFeedFilters,
  ActivityUnreadCount,
  ActivityMarkReadResult,
} from '@/types/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseActivityFeedOptions {
  /** Organisation UUID — required for scoping */
  organisationId?: string;
  /** Filter parameters */
  filters?: ActivityFeedFilters;
  /** Auto-poll interval in ms (0 = disabled, default 0) */
  pollInterval?: number;
  /** Number of items per page (default 20) */
  pageSize?: number;
  /** Enable grouped mode (5-min window aggregation) */
  grouped?: boolean;
  /** Skip fetching (e.g. when user has no permission) */
  enabled?: boolean;
}

export interface UseActivityFeedReturn {
  /** Individual activity log items (ungrouped mode) */
  items: ActivityLogItem[];
  /** Grouped activity events (grouped mode) */
  groups: ActivityLogGroup[];
  /** Loading state for initial fetch */
  loading: boolean;
  /** Loading state for pagination (load more) */
  loadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether more pages are available */
  hasMore: boolean;
  /** Load next page (append to existing items) */
  loadMore: () => Promise<void>;
  /** Refresh from the beginning */
  refresh: () => Promise<void>;
  /** Unread count for the current org */
  unreadCount: number;
  /** Mark feed as read up to now */
  markRead: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildFilterParams(
  organisationId: string | undefined,
  filters: ActivityFeedFilters | undefined,
  pageSize: number,
  grouped: boolean,
): Record<string, string | number | boolean | undefined> {
  return {
    organisation_id: organisationId,
    project: filters?.project,
    verb: filters?.verb,
    actor: filters?.actor,
    grouped: grouped ? 'true' : undefined,
    page_size: pageSize,
  };
}

/**
 * Extract the cursor value from a DRF cursor pagination URL.
 * The `next` URL contains `?cursor=<value>` — we need just the cursor.
 */
function extractCursor(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('cursor');
  } catch {
    // URL might be relative
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.searchParams.get('cursor');
    } catch {
      return null;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const {
    organisationId,
    filters,
    pollInterval = 0,
    pageSize = 20,
    grouped = false,
    enabled = true,
  } = options;

  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [groups, setGroups] = useState<ActivityLogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track cursor for pagination
  const nextCursorRef = useRef<string | null>(null);

  // Serialize filters for dependency tracking
  const filtersKey = JSON.stringify(filters ?? {});

  // ── Fetch page ──────────────────────────────────────────────

  const fetchPage = useCallback(async (cursor?: string | null, append = false) => {
    if (!organisationId || !enabled) return;

    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const params = buildFilterParams(organisationId, filters, pageSize, grouped);
      if (cursor) {
        (params as Record<string, string | number | boolean | undefined>).cursor = cursor;
      }

      if (grouped) {
        const data = await api.get<ActivityFeedGroupedResponse>('/activity-feed/', { params });
        nextCursorRef.current = extractCursor(data.next);

        if (append) {
          setGroups(prev => [...prev, ...data.results]);
        } else {
          setGroups(data.results);
        }
      } else {
        const data = await api.get<ActivityFeedResponse>('/activity-feed/', { params });
        nextCursorRef.current = extractCursor(data.next);

        if (append) {
          setItems(prev => [...prev, ...data.results]);
        } else {
          setItems(data.results);
        }
      }

      setError(null);
    } catch (err: unknown) {
      logger.error('useActivityFeed fetch error', err);
      setError(err instanceof Error ? err.message : 'Kan activiteiten niet laden');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [organisationId, filtersKey, pageSize, grouped, enabled]); // eslint-disable-line react-hooks/exhaustive-deps -- filters tracked via serialized filtersKey

  // ── Fetch unread count ──────────────────────────────────────

  const fetchUnreadCount = useCallback(async () => {
    if (!organisationId || !enabled) return;

    try {
      const data = await api.get<ActivityUnreadCount>('/activity-feed/unread-count/', {
        params: { organisation_id: organisationId },
      });
      setUnreadCount(data.unread_count);
    } catch (err: unknown) {
      logger.error('useActivityFeed unread count error', err);
    }
  }, [organisationId, enabled]);

  // ── Initial fetch ───────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !organisationId) {
      setLoading(false);
      return;
    }
    nextCursorRef.current = null;
    fetchPage();
    fetchUnreadCount();
  }, [fetchPage, fetchUnreadCount, enabled, organisationId]);

  // ── Auto-poll ───────────────────────────────────────────────

  useEffect(() => {
    if (!pollInterval || !enabled || !organisationId) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchPage();
        fetchUnreadCount();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, fetchPage, fetchUnreadCount, enabled, organisationId]);

  // ── Load more (next cursor page) ───────────────────────────

  const loadMore = useCallback(async () => {
    if (!nextCursorRef.current || loadingMore) return;
    await fetchPage(nextCursorRef.current, true);
  }, [fetchPage, loadingMore]);

  // ── Refresh (reset to first page) ──────────────────────────

  const refresh = useCallback(async () => {
    nextCursorRef.current = null;
    setItems([]);
    setGroups([]);
    await fetchPage();
    await fetchUnreadCount();
  }, [fetchPage, fetchUnreadCount]);

  // ── Mark read ───────────────────────────────────────────────

  const markRead = useCallback(async () => {
    if (!organisationId) return;

    try {
      await api.post<ActivityMarkReadResult>(
        `/activity-feed/mark-read/?organisation_id=${organisationId}`,
        undefined,
      );
      setUnreadCount(0);
    } catch (err: unknown) {
      logger.error('useActivityFeed mark read error', err);
    }
  }, [organisationId]);

  // ── Return ──────────────────────────────────────────────────

  return {
    items,
    groups,
    loading,
    loadingMore,
    error,
    hasMore: nextCursorRef.current !== null,
    loadMore,
    refresh,
    unreadCount,
    markRead,
  };
}

export default useActivityFeed;
