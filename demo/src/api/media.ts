/**
 * Media library domain API — media items, tags, collections.
 *
 * ```ts
 * import { mediaApi } from '@/api';
 * const { results } = await mediaApi.listItems({ activityId: '...' });
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type { MediaItem, MediaTag } from '../types/api';

/* ------------------------------------------------------------------ */
/*  Media Items                                                        */
/* ------------------------------------------------------------------ */

export interface MediaItemListParams {
  activityId?: string;
  ordering?: string;
  createdAtGte?: string;
  [key: string]: string | number | boolean | undefined;
}

export const mediaApi = {
  /** List media items (paginated). */
  listItems(params?: MediaItemListParams, opts?: ListOptions) {
    const { activityId, ordering, createdAtGte, ...rest } = params ?? {};
    return api.list<MediaItem>('/media/items/', {
      ...opts,
      params: {
        activity: activityId,
        ordering,
        created_at__gte: createdAtGte,
        ...rest,
        ...opts?.params,
      },
    });
  },

  /** List ALL media items across pages. */
  listAllItems(params?: MediaItemListParams, opts?: ListAllOptions) {
    const { activityId, ordering, createdAtGte, ...rest } = params ?? {};
    return api.listAll<MediaItem>('/media/items/', {
      ...opts,
      params: {
        activity: activityId,
        ordering,
        created_at__gte: createdAtGte,
        ...rest,
        ...opts?.params,
      },
    });
  },

  /** Update a media item. */
  updateItem(id: string, data: Partial<MediaItem>, opts?: MutateOptions) {
    return api.patch<MediaItem>(`/media/items/${id}/`, data, opts);
  },

  /** Delete a media item. */
  deleteItem(id: string, opts?: MutateOptions) {
    return api.delete(`/media/items/${id}/`, opts);
  },

  /* ───── Tags ─────────────────────────────────────────────── */

  /** List media tags (paginated). */
  listTags(params?: { isSystem?: boolean }, opts?: ListOptions) {
    return api.list<MediaTag>('/media/tags/', {
      ...opts,
      params: { is_system: params?.isSystem, ...opts?.params },
    });
  },

  /** List ALL media tags across pages. */
  listAllTags(params?: { isSystem?: boolean }, opts?: ListAllOptions) {
    return api.listAll<MediaTag>('/media/tags/', {
      ...opts,
      params: { is_system: params?.isSystem, ...opts?.params },
    });
  },
};
