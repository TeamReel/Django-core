/**
 * Workflows domain API — templates, instances, transitions, history.
 *
 * ```ts
 * import { workflowsApi } from '@/api';
 * const { results } = await workflowsApi.listTemplates({ isActive: true });
 * await workflowsApi.executeTransition(instanceId, { action: 'approve' });
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  WorkflowTemplate,
  WorkflowInstance,
  TransitionHistory,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Workflow Templates                                                 */
/* ------------------------------------------------------------------ */

export const workflowsApi = {
  /** List workflow templates (paginated). */
  listTemplates(params?: { isActive?: boolean }, opts?: ListOptions) {
    return api.list<WorkflowTemplate>('/workflows/templates/', {
      ...opts,
      params: { is_active: params?.isActive, ...opts?.params },
    });
  },

  /** Get available content types for workflow association. */
  getContentTypes(params?: { models?: string }, signal?: AbortSignal) {
    const qs = params?.models ? `?models=${encodeURIComponent(params.models)}` : '';
    return api.get<Record<string, unknown>[]>(`/workflows/content-types/${qs}`, signal);
  },

  /* ───── Workflow Instances ───────────────────────────────── */

  /** List workflow instances (paginated). */
  listInstances(params?: Record<string, string | number | boolean | undefined>, opts?: ListOptions) {
    return api.list<WorkflowInstance>('/workflows/instances/', { ...opts, params: { ...params, ...opts?.params } });
  },

  /** List ALL workflow instances across pages. */
  listAllInstances(params?: Record<string, string | number | boolean | undefined>, opts?: ListAllOptions) {
    return api.listAll<WorkflowInstance>('/workflows/instances/', { ...opts, params: { ...params, ...opts?.params } });
  },

  /** Get a single workflow instance. */
  getInstance(id: string, signal?: AbortSignal) {
    return api.get<WorkflowInstance>(`/workflows/instances/${id}/`, signal);
  },

  /** Create a workflow instance. */
  createInstance(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<WorkflowInstance>('/workflows/instances/', data, opts);
  },

  /** Execute a state transition on a workflow instance. */
  executeTransition(instanceId: string, data: { action: string; comment?: string }, opts?: MutateOptions) {
    return api.post<WorkflowInstance>(`/workflows/instances/${instanceId}/execute/`, data, opts);
  },

  /* ───── Transition History ───────────────────────────────── */

  /** List transition history (paginated). */
  listHistory(params?: { instanceId?: string; ordering?: string }, opts?: ListOptions) {
    return api.list<TransitionHistory>('/workflows/history/', {
      ...opts,
      params: {
        instance: params?.instanceId,
        ordering: params?.ordering,
        ...opts?.params,
      },
    });
  },
};
