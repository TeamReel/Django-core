/**
 * Hook for managing trash / recycle bin data and actions.
 *
 * Provides:
 * - Paginated list of trashed items
 * - Stats per content type
 * - Restore, permanent delete, and empty trash mutations
 * - Refetch after mutations
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   stats,
 *   loading,
 *   error,
 *   restore,
 *   permanentDelete,
 *   emptyTrash,
 *   reload,
 * } = useTrash();
 * ```
 */

import { useState, useCallback } from 'react';
import { trashApi } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/ui/Toast';
import { logger } from '@/utils/logger';
import type { TrashItem, TrashStats } from '@/types/api';

export interface UseTrashOptions {
  /** Filter by content type ID */
  contentType?: number;
  /** Page size (default: 20) */
  pageSize?: number;
}

export interface UseTrashResult {
  /** Trashed items for current page */
  items: TrashItem[];
  /** Total count of items matching filters */
  count: number;
  /** Stats per content type */
  stats: TrashStats[];
  /** Loading state */
  loading: boolean;
  /** Stats loading state */
  statsLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current page (1-based) */
  page: number;
  /** Change page */
  setPage: (page: number) => void;
  /** Restore an item from trash */
  restore: (id: string, objectRepr?: string) => Promise<void>;
  /** Permanently delete an item */
  permanentDelete: (id: string, objectRepr?: string) => Promise<void>;
  /** Empty all trash */
  emptyTrash: () => Promise<void>;
  /** Reload items and stats */
  reload: () => void;
  /** Mutation in progress */
  mutating: boolean;
}

export function useTrash(options: UseTrashOptions = {}): UseTrashResult {
  const { contentType, pageSize = 20 } = options;
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [mutating, setMutating] = useState(false);

  // Fetch trash items
  const {
    data: itemsData,
    loading: itemsLoading,
    error: itemsError,
    reload: reloadItems,
  } = useAsync(
    async (signal) => {
      const result = await trashApi.list(
        { contentType },
        { pageSize, page, signal },
      );
      return result;
    },
    [contentType, pageSize, page],
  );

  // Fetch stats
  const {
    data: stats,
    loading: statsLoading,
    reload: reloadStats,
  } = useAsync(
    async (signal) => {
      const result = await trashApi.getStats(signal);
      return result;
    },
    [],
  );

  const reload = useCallback(() => {
    reloadItems();
    reloadStats();
  }, [reloadItems, reloadStats]);

  // Restore item
  const restore = useCallback(
    async (id: string, objectRepr?: string) => {
      setMutating(true);
      try {
        await trashApi.restore(id);
        pushToast({
          message: objectRepr
            ? `"${objectRepr}" hersteld`
            : 'Item hersteld',
          type: 'success',
        });
        reload();
      } catch (err) {
        logger.error('Failed to restore item', err);
        pushToast({
          message: 'Herstellen mislukt',
          type: 'error',
        });
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [pushToast, reload],
  );

  // Permanently delete item
  const permanentDelete = useCallback(
    async (id: string, objectRepr?: string) => {
      setMutating(true);
      try {
        await trashApi.permanentDelete(id);
        pushToast({
          message: objectRepr
            ? `"${objectRepr}" definitief verwijderd`
            : 'Item definitief verwijderd',
          type: 'success',
        });
        reload();
      } catch (err) {
        logger.error('Failed to permanently delete item', err);
        pushToast({
          message: 'Verwijderen mislukt',
          type: 'error',
        });
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [pushToast, reload],
  );

  // Empty all trash
  const emptyTrashAction = useCallback(async () => {
    setMutating(true);
    try {
      const response = await trashApi.emptyTrash();
      pushToast({
        message: response.detail || 'Prullenbak geleegd',
        type: 'success',
      });
      reload();
    } catch (err) {
      logger.error('Failed to empty trash', err);
      pushToast({
        message: 'Prullenbak legen mislukt',
        type: 'error',
      });
      throw err;
    } finally {
      setMutating(false);
    }
  }, [pushToast, reload]);

  return {
    items: itemsData?.results ?? [],
    count: itemsData?.count ?? 0,
    stats: stats ?? [],
    loading: itemsLoading,
    statsLoading,
    error: itemsError,
    page,
    setPage,
    restore,
    permanentDelete,
    emptyTrash: emptyTrashAction,
    reload,
    mutating,
  };
}
