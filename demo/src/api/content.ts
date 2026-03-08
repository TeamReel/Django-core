/**
 * Content generation domain API — templates, items, approvals.
 *
 * ```ts
 * import { contentApi } from '@/api';
 * const { results } = await contentApi.listTemplates();
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  ContentTemplate,
  ContentItem,
  ContentApproval,
  GenerationTemplate,
  GenerationRequest,
  GenerationOutput,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Content Templates                                                  */
/* ------------------------------------------------------------------ */

export const contentApi = {
  /** List content templates (paginated). */
  listTemplates(params?: { isActive?: boolean; isLatest?: boolean; organisation?: string }, opts?: ListOptions) {
    return api.list<ContentTemplate>('/content-generation/templates/', {
      ...opts,
      params: {
        is_active: params?.isActive,
        is_latest: params?.isLatest,
        organisation: params?.organisation,
        ...opts?.params,
      },
    });
  },

  /** List ALL content templates across pages. */
  listAllTemplates(params?: { isActive?: boolean; isLatest?: boolean; organisation?: string }, opts?: ListAllOptions) {
    return api.listAll<ContentTemplate>('/content-generation/templates/', {
      ...opts,
      params: {
        is_active: params?.isActive,
        is_latest: params?.isLatest,
        organisation: params?.organisation,
        ...opts?.params,
      },
    });
  },

  /** Get a single content template. */
  getTemplate(id: number, signal?: AbortSignal) {
    return api.get<ContentTemplate>(`/content-generation/templates/${id}/`, signal);
  },

  /** Create a content template. */
  createTemplate(data: Partial<ContentTemplate>, opts?: MutateOptions) {
    return api.post<ContentTemplate>('/content-generation/templates/', data, opts);
  },

  /** Update a content template. */
  updateTemplate(id: number, data: Partial<ContentTemplate>, opts?: MutateOptions) {
    return api.patch<ContentTemplate>(`/content-generation/templates/${id}/`, data, opts);
  },

  /** Replace a content template. */
  replaceTemplate(id: number, data: ContentTemplate, opts?: MutateOptions) {
    return api.put<ContentTemplate>(`/content-generation/templates/${id}/`, data, opts);
  },

  /** Delete a content template. */
  deleteTemplate(id: number, opts?: MutateOptions) {
    return api.delete(`/content-generation/templates/${id}/`, opts);
  },

  /* ───── Content Items ────────────────────────────────────── */

  /** List content items (paginated). */
  listItems(params?: { activityId?: string }, opts?: ListOptions) {
    return api.list<ContentItem>('/content-generation/items/', {
      ...opts,
      params: { activity: params?.activityId, ...opts?.params },
    });
  },
};

/* ------------------------------------------------------------------ */
/*  Generative / AI                                                    */
/* ------------------------------------------------------------------ */

export interface GenerateAssetParams {
  [key: string]: unknown;
}

export const generativeApi = {
  /** Start AI asset generation. */
  generate(data: GenerateAssetParams, opts?: MutateOptions) {
    return api.post<{ task_id: string }>('/generative/assets/generate/', data, opts);
  },

  /** Poll generation status. */
  getStatus(taskId: string, signal?: AbortSignal) {
    return api.get<{ status: string; result?: unknown }>(`/generative/assets/generate/${taskId}/status/`, signal);
  },

  /** Save a generated asset. */
  saveAsset(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>('/generative/assets/save/', data, opts);
  },

  /** Restore an asset from history. */
  restoreAsset(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>('/generative/assets/restore/', data, opts);
  },

  /** Crop close-up. */
  cropCloseup(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>('/generative/assets/crop-closeup/', data, opts);
  },

  /** Crop half-body. */
  cropHalfbody(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>('/generative/assets/crop-halfbody/', data, opts);
  },

  /** Get asset templates. */
  getAssetTemplates(signal?: AbortSignal) {
    return api.get<unknown[]>('/generative/assets/templates/', signal);
  },

  /** Get generation history. */
  getHistory(signal?: AbortSignal) {
    return api.get<unknown[]>('/generative/assets/history/', signal);
  },

  /* ───── Generation Jobs / Queue ──────────────────────────── */

  /** List generation jobs. */
  listJobs(params?: { limit?: number }, opts?: ListOptions) {
    return api.list<GenerationRequest>('/generative/jobs/', {
      ...opts,
      params: { limit: params?.limit, ...opts?.params },
    });
  },

  /** Get queue counts. */
  getJobCounts(signal?: AbortSignal) {
    return api.get<Record<string, number>>('/generative/jobs/counts/', signal);
  },

  /** Review (approve/reject) a job. */
  reviewJob(taskId: string, data: { action: 'approve' | 'reject'; comment?: string }, opts?: MutateOptions) {
    return api.post<void>(`/generative/jobs/${taskId}/review/`, data, opts);
  },

  /* ───── Generation Requests ──────────────────────────────── */

  /** List generation requests (paginated). */
  listRequests(params?: { status?: string; project?: number }, opts?: ListOptions) {
    return api.list<GenerationRequest>('/generative/requests/', {
      ...opts,
      params: { status: params?.status, project: params?.project, ...opts?.params },
    });
  },

  /** List ALL generation requests across pages. */
  listAllRequests(params?: { status?: string; project?: number }, opts?: ListAllOptions) {
    return api.listAll<GenerationRequest>('/generative/requests/', {
      ...opts,
      params: { status: params?.status, project: params?.project, ...opts?.params },
    });
  },

  /** Get a single generation output. */
  getOutput(requestId: number, signal?: AbortSignal) {
    return api.get<GenerationOutput>(`/generative/requests/${requestId}/output/`, signal);
  },
};
