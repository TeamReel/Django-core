/**
 * Periods domain API — seasons, competitions, nested children.
 *
 * ```ts
 * import { periodsApi } from '@/api';
 * const { results } = await periodsApi.list({ projectId: 5, type: 'season' });
 * const season = await periodsApi.get(seasonId);
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type { Period } from '../types/api';

/* ------------------------------------------------------------------ */
/*  Query param helpers                                                */
/* ------------------------------------------------------------------ */

export interface PeriodListParams {
  projectId?: number | string;
  parentId?: string;
  periodType?: 'season' | 'competition' | string;
  slug?: string;
}

function toPeriodQuery(p?: PeriodListParams): Record<string, string | number | boolean | undefined> {
  if (!p) return {};
  return {
    project_id: p.projectId != null ? String(p.projectId) : undefined,
    project: p.projectId != null ? String(p.projectId) : undefined,
    parent: p.parentId,
    parent_id: p.parentId,
    period_type: p.periodType,
    type: p.periodType,
    slug: p.slug,
  };
}

/* ------------------------------------------------------------------ */
/*  Periods                                                            */
/* ------------------------------------------------------------------ */

export const periodsApi = {
  /** List periods (paginated). */
  list(params?: PeriodListParams, opts?: ListOptions) {
    return api.list<Period>('/periods/', { ...opts, params: { ...toPeriodQuery(params), ...opts?.params } });
  },

  /** List ALL periods across pages. */
  listAll(params?: PeriodListParams, opts?: ListAllOptions) {
    return api.listAll<Period>('/periods/', { ...opts, params: { ...toPeriodQuery(params), ...opts?.params } });
  },

  /** Get a single period by ID. */
  get(id: string, signal?: AbortSignal) {
    return api.get<Period>(`/periods/${id}/`, signal);
  },

  /** Create a period (season or competition). */
  create(data: Partial<Period>, opts?: MutateOptions) {
    return api.post<Period>('/periods/', data, opts);
  },

  /** Update a period. */
  update(id: string, data: Partial<Period>, opts?: MutateOptions) {
    return api.patch<Period>(`/periods/${id}/`, data, opts);
  },

  /** List child periods (competitions under a season). */
  listChildren(id: string, opts?: ListOptions) {
    return api.list<Period>(`/periods/${id}/children/`, opts);
  },

  /** List ALL child periods across pages. */
  listAllChildren(id: string, opts?: ListAllOptions) {
    return api.listAll<Period>(`/periods/${id}/children/`, opts);
  },
};
