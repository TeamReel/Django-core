/**
 * Trash management domain API — list, restore, permanent delete.
 *
 * ```ts
 * import { trashApi } from '@/api';
 * const { results } = await trashApi.list();
 * await trashApi.restore(trashItemId);
 * ```
 */

import { api } from './client';
import type { ListOptions, MutateOptions } from './client';
import type { TrashItem, TrashStats } from '../types/api';

/* ------------------------------------------------------------------ */
/*  Trash API                                                          */
/* ------------------------------------------------------------------ */

export const trashApi = {
  /**
   * List trashed items (paginated, org-scoped).
   * @param params.contentType - Optional content type ID to filter by
   * @param params.objectId - Optional original object UUID to filter by (for undo operations)
   */
  list(params?: { contentType?: number; objectId?: string }, opts?: ListOptions) {
    return api.list<TrashItem>('/trash/', {
      ...opts,
      params: {
        content_type: params?.contentType,
        object_id: params?.objectId,
        ...opts?.params,
      },
    });
  },

  /**
   * Find a trash item by the original object's UUID.
   * Useful for implementing undo after soft-delete.
   */
  async findByObjectId(objectId: string, signal?: AbortSignal): Promise<TrashItem | null> {
    const { results } = await this.list({ objectId }, { signal });
    return results[0] ?? null;
  },

  /**
   * Get trash statistics per content type.
   */
  getStats(signal?: AbortSignal) {
    return api.get<TrashStats[]>('/trash/stats/', signal);
  },

  /**
   * Restore a soft-deleted item from trash.
   * Returns the restore confirmation message.
   */
  restore(id: string, opts?: MutateOptions) {
    return api.post<{ detail: string }>(`/trash/${id}/restore/`, undefined, opts);
  },

  /**
   * Permanently delete a trashed item (admin only).
   */
  permanentDelete(id: string, opts?: MutateOptions) {
    return api.delete(`/trash/${id}/`, opts);
  },

  /**
   * Empty all trash items for the organisation (admin only).
   * Returns confirmation message with count of deleted items.
   */
  emptyTrash(opts?: MutateOptions) {
    return api.post<{ detail: string }>('/trash/empty/', undefined, opts);
  },
};
