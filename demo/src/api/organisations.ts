/**
 * Organisations domain API — orgs, memberships.
 *
 * ```ts
 * import { organisationsApi } from '@/api';
 * const { results } = await organisationsApi.list();
 * const org = await organisationsApi.get('my-club');
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  Organisation,
  OrganisationDetail,
  OrgMembership,
  OrgMembershipListItem,
  Project,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Organisations                                                      */
/* ------------------------------------------------------------------ */

export const organisationsApi = {
  /** List organisations (paginated). */
  list(opts?: ListOptions) {
    return api.list<Organisation>('/organisations/', opts);
  },

  /** List ALL organisations across pages. */
  listAll(opts?: ListAllOptions) {
    return api.listAll<Organisation>('/organisations/', opts);
  },

  /** Get an organisation by slug or ID. */
  get(slugOrId: string, signal?: AbortSignal) {
    return api.get<OrganisationDetail>(`/organisations/${slugOrId}/`, signal);
  },

  /** Create an organisation. */
  create(data: Partial<Organisation>, opts?: MutateOptions) {
    return api.post<Organisation>('/organisations/', data, opts);
  },

  /** Update an organisation. */
  update(slugOrId: string, data: Partial<Organisation>, opts?: MutateOptions) {
    return api.patch<Organisation>(`/organisations/${slugOrId}/`, data, opts);
  },

  /* ───── Nested: organisation projects ─────────────────────── */

  /** List projects within an organisation. */
  listProjects(orgSlug: string, params?: { parentProjectIsNull?: boolean; includeArchived?: boolean; isClub?: boolean }, opts?: ListOptions) {
    return api.list<Project>(`/organisations/${orgSlug}/projects/`, {
      ...opts,
      params: {
        parent_project__isnull: params?.parentProjectIsNull,
        include_archived: params?.includeArchived,
        is_club: params?.isClub,
        ...opts?.params,
      },
    });
  },

  /** List ALL projects within an organisation across pages. */
  listAllProjects(orgSlug: string, params?: Record<string, string | number | boolean | undefined>, opts?: ListAllOptions) {
    return api.listAll<Project>(`/organisations/${orgSlug}/projects/`, { ...opts, params: { ...params, ...opts?.params } });
  },

  /** Get a project within an organisation by slug. */
  getProject(orgSlug: string, projectSlug: string, signal?: AbortSignal) {
    return api.get<Project>(`/organisations/${orgSlug}/projects/${projectSlug}/`, signal);
  },

  /** Create a project within an organisation. */
  createProject(orgSlug: string, data: Partial<Project>, opts?: MutateOptions) {
    return api.post<Project>(`/organisations/${orgSlug}/projects/`, data, opts);
  },

  /* ───── Nested: organisation members ──────────────────────── */

  /** List organisation memberships. */
  listMembers(orgSlug: string, opts?: ListOptions) {
    return api.list<OrgMembershipListItem>(`/organisations/${orgSlug}/members/`, opts);
  },

  /** List ALL organisation memberships across pages. */
  listAllMembers(orgSlug: string, opts?: ListAllOptions) {
    return api.listAll<OrgMembershipListItem>(`/organisations/${orgSlug}/members/`, opts);
  },

  /** Add a member to an organisation. */
  addMember(orgSlug: string, data: { user_id?: number; email?: string; role?: string }, opts?: MutateOptions) {
    return api.post<OrgMembership>(`/organisations/${orgSlug}/members/`, data, opts);
  },
};
