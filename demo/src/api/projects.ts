/**
 * Projects domain API — projects, memberships, invites, functional roles.
 *
 * ```ts
 * import { projectsApi } from '@/api';
 * const project = await projectsApi.get(42);
 * const { results } = await projectsApi.listMembers(42);
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  Project,
  ProjectDetail,
  ProjectMembership,
  ProjectInvite,
  SquadReadinessResponse,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Projects                                                           */
/* ------------------------------------------------------------------ */

export interface ProjectListParams {
  parentProject?: number | null;
  parentProjectIsNull?: boolean;
  includeArchived?: boolean;
}

export const projectsApi = {
  /** List projects (paginated). */
  list(params?: ProjectListParams, opts?: ListOptions) {
    return api.list<Project>('/projects/', {
      ...opts,
      params: {
        parent_project: params?.parentProject ?? undefined,
        parent_project__isnull: params?.parentProjectIsNull,
        include_archived: params?.includeArchived,
        ...opts?.params,
      },
    });
  },

  /** List ALL projects across pages. */
  listAll(params?: ProjectListParams, opts?: ListAllOptions) {
    return api.listAll<Project>('/projects/', {
      ...opts,
      params: {
        parent_project: params?.parentProject ?? undefined,
        parent_project__isnull: params?.parentProjectIsNull,
        include_archived: params?.includeArchived,
        ...opts?.params,
      },
    });
  },

  /** Get a single project by ID or slug. */
  get(idOrSlug: number | string, signal?: AbortSignal) {
    return api.get<ProjectDetail>(`/projects/${idOrSlug}/`, signal);
  },

  /** Update a project. */
  update(idOrSlug: number | string, data: Partial<Project>, opts?: MutateOptions) {
    return api.patch<Project>(`/projects/${idOrSlug}/`, data, opts);
  },

  /* ───── Project members ──────────────────────────────────── */

  /** List project memberships (paginated). */
  listMembers(projectId: number | string, params?: { periodId?: string }, opts?: ListOptions) {
    return api.list<ProjectMembership>(`/projects/${projectId}/members/`, {
      ...opts,
      params: {
        period: params?.periodId,
        period_id: params?.periodId,
        ...opts?.params,
      },
    });
  },

  /** List ALL project members across pages. */
  listAllMembers(projectId: number | string, params?: { periodId?: string }, opts?: ListAllOptions) {
    return api.listAll<ProjectMembership>(`/projects/${projectId}/members/`, {
      ...opts,
      params: {
        period: params?.periodId,
        period_id: params?.periodId,
        ...opts?.params,
      },
    });
  },

  /** Get a single project membership. */
  getMember(projectId: number | string, membershipId: number | string, signal?: AbortSignal) {
    return api.get<ProjectMembership>(`/projects/${projectId}/members/${membershipId}/`, signal);
  },

  /** Add a member to a project. */
  addMember(projectId: number | string, data: { user: number; role?: string; period?: string }, opts?: MutateOptions) {
    return api.post<ProjectMembership>(`/projects/${projectId}/members/`, data, opts);
  },

  /** Update a project membership (role, metadata, etc.). */
  updateMember(projectId: number | string, membershipId: number | string, data: Partial<ProjectMembership>, opts?: MutateOptions) {
    return api.patch<ProjectMembership>(`/projects/${projectId}/members/${membershipId}/`, data, opts);
  },

  /** Remove a member from a project. */
  removeMember(projectId: number | string, membershipId: number | string, opts?: MutateOptions) {
    return api.delete(`/projects/${projectId}/members/${membershipId}/`, opts);
  },

  /** Get squad readiness (per-member asset completeness). */
  squadReadiness(projectId: number | string, kitType?: string, signal?: AbortSignal) {
    return api.get<SquadReadinessResponse>(
      `/projects/${projectId}/members/squad-readiness/`,
      { signal, params: kitType ? { kit_type: kitType } : undefined },
    );
  },

  /* ───── Functional roles ─────────────────────────────────── */

  /** Assign functional roles to a project membership. */
  assignFunctionalRoles(projectId: number | string, data: { user_id: number | string; roles: string[] }, opts?: MutateOptions) {
    return api.post<void>(`/projects/${projectId}/functional-roles/assign/`, data, opts);
  },

  /** Unassign functional roles from a project membership. */
  unassignFunctionalRoles(projectId: number | string, data: { user_id: number | string; roles: string[] }, opts?: MutateOptions) {
    return api.post<void>(`/projects/${projectId}/functional-roles/unassign/`, data, opts);
  },

  /* ───── Invites ──────────────────────────────────────────── */

  /** List project invites. */
  listInvites(projectId: number | string, opts?: ListOptions) {
    return api.list<ProjectInvite>(`/projects/${projectId}/invites/`, opts);
  },
};
