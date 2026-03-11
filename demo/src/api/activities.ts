/**
 * Activities domain API — matches, trainings, events, participations.
 *
 * ```ts
 * import { activitiesApi } from '@/api';
 * const { results } = await activitiesApi.list({ projectId: '5' });
 * const match = await activitiesApi.get(matchId);
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions } from './client';
import type {
  Activity,
  ActivityDetail,
  Participation,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Query param helpers                                                */
/* ------------------------------------------------------------------ */

export interface ActivityListParams {
  projectId?: string;
  periodId?: string;
  activityType?: 'match' | 'training' | 'event' | string;
  startTimeGte?: string;
  startTimeLte?: string;
  ordering?: string;
  includeDescendants?: boolean;
}

function toActivityQuery(p?: ActivityListParams): Record<string, string | number | boolean | undefined> {
  if (!p) return {};
  return {
    project: p.projectId,
    project_id: p.projectId,
    period: p.periodId,
    period_id: p.periodId,
    activity_type: p.activityType,
    start_time__gte: p.startTimeGte,
    start_time__lte: p.startTimeLte,
    ordering: p.ordering,
    include_descendants: p.includeDescendants,
  };
}

/* ------------------------------------------------------------------ */
/*  Write-side payload                                                 */
/* ------------------------------------------------------------------ */

/** Write-side payload for creating/updating activities (flat ID fields). */
export interface ActivityWritePayload {
  title?: string;
  activity_type?: 'match' | 'training' | 'event' | string;
  project_id?: string | number;
  opponent_project_id?: string | number;
  period_id?: string;
  start_time?: string;
  end_time?: string | null;
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  venue?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Activities                                                         */
/* ------------------------------------------------------------------ */

export const activitiesApi = {
  /** List activities (paginated). */
  list(params?: ActivityListParams, opts?: ListOptions) {
    return api.list<Activity>('/activities/', { ...opts, params: { ...toActivityQuery(params), ...opts?.params } });
  },

  /** List ALL activities across pages. */
  listAll(params?: ActivityListParams, opts?: ListAllOptions) {
    return api.listAll<Activity>('/activities/', { ...opts, params: { ...toActivityQuery(params), ...opts?.params } });
  },

  /** Get a single activity by ID. */
  get(id: string, signal?: AbortSignal) {
    return api.get<ActivityDetail>(`/activities/${id}/`, signal);
  },

  /** Create an activity (match, training, event). */
  create(data: Partial<Activity> | ActivityWritePayload) {
    return api.post<Activity>('/activities/', data);
  },

  /** Update an activity. */
  update(id: string, data: Partial<Activity> | ActivityWritePayload) {
    return api.patch<Activity>(`/activities/${id}/`, data);
  },

  /** Delete an activity. */
  delete(id: string) {
    return api.delete(`/activities/${id}/`);
  },
};

/* ------------------------------------------------------------------ */
/*  Participations                                                     */
/* ------------------------------------------------------------------ */

export interface ParticipationListParams {
  periodId?: string;
  activityId?: string;
}

export const participationsApi = {
  /** List participations (paginated). */
  list(params?: ParticipationListParams, opts?: ListOptions) {
    return api.list<Participation>('/participations/', {
      ...opts,
      params: {
        period_id: params?.periodId,
        activity: params?.activityId,
        ...opts?.params,
      },
    });
  },

  /** List ALL participations across pages. */
  listAll(params?: ParticipationListParams, opts?: ListAllOptions) {
    return api.listAll<Participation>('/participations/', {
      ...opts,
      params: {
        period_id: params?.periodId,
        activity: params?.activityId,
        ...opts?.params,
      },
    });
  },

  /** Create a participation. */
  create(data: Partial<Participation>) {
    return api.post<Participation>('/participations/', data);
  },

  /** Update a participation. */
  update(id: string, data: Partial<Participation>) {
    return api.patch<Participation>(`/participations/${id}/`, data);
  },

  /** Delete a participation. */
  delete(id: string) {
    return api.delete(`/participations/${id}/`);
  },

  /** Bulk-create participations. */
  bulkCreate(data: Partial<Participation>[]) {
    return api.post<Participation[]>('/participations/bulk/', data);
  },

  /** Bulk-delete participations. */
  bulkDelete(ids: string[]) {
    return api.post<void>('/participations/bulk-delete/', { ids });
  },
};
