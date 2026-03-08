/**
 * Video pipeline domain API — jobs, presets, processing actions.
 *
 * ```ts
 * import { videoApi } from '@/api';
 * const { results } = await videoApi.listJobs();
 * const job = await videoApi.getJob(jobId);
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type { VideoJob, VideoJobDetail, VideoPreset } from '../types/api';

/* ------------------------------------------------------------------ */
/*  Video Jobs                                                         */
/* ------------------------------------------------------------------ */

export const videoApi = {
  /** List video jobs (paginated). */
  listJobs(params?: { ordering?: string }, opts?: ListOptions) {
    return api.list<VideoJob>('/video/jobs/', {
      ...opts,
      params: { ordering: params?.ordering, ...opts?.params },
    });
  },

  /** List ALL video jobs across pages. */
  listAllJobs(params?: { ordering?: string }, opts?: ListAllOptions) {
    return api.listAll<VideoJob>('/video/jobs/', {
      ...opts,
      params: { ordering: params?.ordering, ...opts?.params },
    });
  },

  /** Get a single video job by ID. */
  getJob(id: string, signal?: AbortSignal) {
    return api.get<VideoJobDetail>(`/video/jobs/${id}/`, signal);
  },

  /** Create a video job. */
  createJob(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/', data, opts);
  },

  /** Cancel (delete) a video job. */
  deleteJob(id: string, opts?: MutateOptions) {
    return api.delete(`/video/jobs/${id}/`, opts);
  },

  /** Retry a failed video job. */
  retryJob(id: string, opts?: MutateOptions) {
    return api.post<VideoJob>(`/video/jobs/${id}/retry/`, undefined, opts);
  },

  /** Approve a video job. */
  approveJob(id: string, opts?: MutateOptions) {
    return api.post<VideoJob>(`/video/jobs/${id}/approve/`, undefined, opts);
  },

  /** Reject a video job. */
  rejectJob(id: string, data?: { comment?: string }, opts?: MutateOptions) {
    return api.post<VideoJob>(`/video/jobs/${id}/reject/`, data, opts);
  },

  /** Get queue counts. */
  getJobCounts(signal?: AbortSignal) {
    return api.get<Record<string, number>>('/video/jobs/counts/', signal);
  },

  /* ───── Processing actions ───────────────────────────────── */

  /** Process an individual member asset (action photo). */
  processAsset(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/process-asset/', data, opts);
  },

  /** Cancel asset processing. */
  cancelAssetProcessing(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>('/video/jobs/cancel-asset-processing/', data, opts);
  },

  /** Process all variants for a member. */
  processAllVariants(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob[]>('/video/jobs/process-all-variants/', data, opts);
  },

  /** Get active processing jobs for a project. */
  getActiveProcessingJobs(params?: { project?: number | string }, signal?: AbortSignal) {
    return api.get<VideoJob[]>(`/video/jobs/active-processing-jobs/${params?.project ? `?project=${params.project}` : ''}`, signal);
  },

  /* ───── Content creation actions ─────────────────────────── */

  /** Generate a lineup flyer. */
  createLineupFlyer(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/lineup-flyer/', data, opts);
  },

  /** Generate a team poster. */
  createTeamPoster(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/team-poster/', data, opts);
  },

  /** Generate a match flyer. */
  createMatchFlyer(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/match-flyer/', data, opts);
  },

  /** Create video from lineup template. */
  createLineupFromTemplate(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/lineup-from-template/', data, opts);
  },

  /** Create goal celebration video. */
  createGoalCelebration(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/goal-celebration-from-template/', data, opts);
  },

  /** Create match intro video. */
  createMatchIntro(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/match-intro-from-template/', data, opts);
  },

  /** Create then-vs-now compilation. */
  createThenVsNow(data: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<VideoJob>('/video/jobs/then-vs-now-compilation/', data, opts);
  },

  /* ───── Presets ──────────────────────────────────────────── */

  /** List video presets. */
  listPresets(opts?: ListOptions) {
    return api.list<VideoPreset>('/video/presets/', opts);
  },
};
