/**
 * useUsersListData — single hook that owns **all** state, data-fetching,
 * filtering, batch-selection, modals, and row-helper logic for UsersList.
 *
 * The parent component (`UsersList.tsx`) calls this hook once and distributes
 * the returned values to presentational sub-components.
 *
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { User, OrganisationOption, ProjectOption, UsersListProps } from './usersListTypes';
import { AVAILABLE_ROLES } from './usersListTypes';
import {
  getCsrfToken,
  isUuid,
  normalizeRoleName,
  getUserTeamreelRoleNames,
  getUserRoleDisplay,
  summarizeNames,
} from './usersListHelpers';

// Re-export so table component can import from one place
export { isUuid };

export function useUsersListData(props: UsersListProps) {
  const { preselectedOrgId, preselectedClubId, preselectedTeamId } = props;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Core state ─────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter options ─────────────────────────────────────────
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  // ── Filter state ───────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const [refreshKey, setRefreshKey] = useState(0);

  // ── Modal state ────────────────────────────────────────────
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // ── Batch selection ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // ── Derived ────────────────────────────────────────────────
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);
  const scopedLocked = orgLocked || clubLocked || teamLocked;

  // ── Helpers ────────────────────────────────────────────────
  const getSelectedOrgSlug = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
        )
      : null;
    return (
      selectedOrg?.slug ||
      (!selectedOrgId ? context.organisation?.slug : '') ||
      selectedOrgId
    );
  };

  // ── Event handlers ─────────────────────────────────────────
  const onOrgChange = useCallback(
    (orgId: string) => {
      setSelectedOrgId(orgId);
      if (!clubLocked) setSelectedClubId('');
      if (!teamLocked) setSelectedTeamId('');
      if (orgId) {
        setSearchParams({ org_id: orgId });
      } else {
        setSearchParams({});
      }
    },
    [clubLocked, teamLocked, setSearchParams],
  );

  const onClubChange = useCallback(
    (clubId: string) => {
      if (clubLocked) return;
      setSelectedClubId(clubId);
      if (!teamLocked) setSelectedTeamId('');
    },
    [clubLocked, teamLocked],
  );

  const onTeamChange = useCallback(
    (teamId: string) => {
      if (teamLocked) return;
      setSelectedTeamId(teamId);
    },
    [teamLocked],
  );

  const onClearFilters = useCallback(() => {
    if (!clubLocked) setSelectedClubId('');
    if (!teamLocked) setSelectedTeamId('');
    setStatusFilter('all');
    setRoleFilter('');
    if (isSuperAdmin && !orgLocked) {
      setSelectedOrgId('');
      setSearchParams({});
    }
  }, [clubLocked, teamLocked, isSuperAdmin, orgLocked, setSearchParams]);

  const onAddMember = useCallback(() => {
    if (!selectedOrgId) {
      alert('Select a federation first to add a member.');
      return;
    }
    setIsAddMemberOpen(true);
  }, [selectedOrgId]);

  const handleEditClick = (u: any) => {
    const userData = u.user || u;
    if (!userData.project_memberships && u.project_memberships) {
      userData.project_memberships = u.project_memberships;
    }
    setEditUser(userData);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!editUser) return;
    const apiBaseUrl = getApiBaseUrl();
    const csrfToken = getCsrfToken();
    const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${editUser.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(updatedData),
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to update user (${res.status})`);
    }
  };

  // ── Filter setup effects ───────────────────────────────────
  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
      return;
    }
    const orgParam = searchParams.get('org_id');
    if (orgParam) {
      setSelectedOrgId(orgParam);
      return;
    }
    if (context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [preselectedOrgId, context.organisation?.id, searchParams]);

  useEffect(() => {
    if (preselectedClubId) setSelectedClubId(String(preselectedClubId));
  }, [preselectedClubId]);

  useEffect(() => {
    if (preselectedTeamId) setSelectedTeamId(String(preselectedTeamId));
  }, [preselectedTeamId]);

  // ── Fetch organisations ────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(
        myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
      );
      return;
    }
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setOrganisations(
          (orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })),
        );
      } catch (e) {
        console.error(e);
      }
    };
    void load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // ── Fetch clubs & teams ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      const selectedOrg = selectedOrgId
        ? organisations.find(
            (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
          )
        : null;

      if (selectedOrgId && !selectedOrg) {
        setClubs([]);
        setTeams([]);
        return;
      }

      const orgSlugForApi =
        selectedOrg?.slug || (!selectedOrgId ? context.organisation?.slug : '') || '';

      if (!orgSlugForApi) {
        setClubs([]);
        setTeams([]);
        return;
      }

      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [context.organisation?.slug, organisations, refreshKey, selectedOrgId]);

  // ── Fetch users ────────────────────────────────────────────
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();

      try {
        // Team-locked path: fetch from /projects/:id/members/
        if (teamLocked && preselectedTeamId) {
          const teamMembersUrl = `${apiBaseUrl}/api/v1/projects/${preselectedTeamId}/members/?page_size=500`;
          const res = await fetch(teamMembersUrl, { credentials: 'include' });
          if (!res.ok) throw new Error('Failed to fetch team members');

          const data = await res.json();
          const rawList =
            data?.data?.data ||
            data?.data?.results ||
            data?.results ||
            (Array.isArray(data?.data) ? data.data : []);

          const allEntries = (Array.isArray(rawList) ? rawList : []).map((item: any) => {
            const nestedUser = item?.user;
            const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
            return {
              id: String(u?.id ?? ''),
              email: u?.email,
              first_name: u?.first_name,
              last_name: u?.last_name,
              avatar_url: u?.avatar_url ?? null,
              is_active: u?.is_active ?? item?.is_active ?? true,
              role: item?.role ?? 'viewer',
              functional_roles: item?.functional_roles ?? [],
              project_membership_id: String(item?.id ?? ''),
              membership: {
                id: item?.id,
                role: item?.role,
                source: item?.source,
                joined_at: item?.joined_at,
              },
              source: item?.source,
              joined_at: item?.joined_at,
              project_memberships: [
                {
                  id: item?.id,
                  role: item?.role ?? 'viewer',
                  project_id: preselectedTeamId,
                  project: {
                    id: preselectedTeamId,
                    parent_id: preselectedClubId || 'parent',
                  },
                },
              ],
              _period: item?.period ?? null,
              _metadata: item?.metadata ?? {},
              _created_at: item?.created_at ?? '',
            };
          });

          // Dedup by user id — prefer entry with period / richer metadata
          const byUserId = new Map<string, any>();
          for (const entry of allEntries) {
            const key = entry.id;
            if (!key) continue;
            const existing = byUserId.get(key);
            if (!existing) {
              byUserId.set(key, entry);
              continue;
            }
            const score = (e: any) => {
              let s = 0;
              if (e._period) s += 100;
              if (e._metadata && Object.keys(e._metadata).length > 0) s += 10;
              if (e.functional_roles?.length > 0) s += 5;
              return s;
            };
            if (score(entry) > score(existing)) byUserId.set(key, entry);
          }

          let results = Array.from(byUserId.values());
          if (statusFilter === 'active') {
            results = results.filter((u: any) => u.is_active !== false);
          } else if (statusFilter === 'inactive') {
            results = results.filter((u: any) => u.is_active === false);
          }
          setUsers(results);
          return;
        }

        // Org-scoped path
        const selectedOrg = selectedOrgId
          ? organisations.find(
              (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
            )
          : null;

        if (!selectedOrg?.slug && !isSuperAdmin) {
          setUsers([]);
          return;
        }

        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('include_project_memberships', 'true');
        params.set('include_project_membership_details', 'true');
        if (selectedClubId) params.set('project_id', String(selectedClubId));

        const orgSlug =
          selectedOrg?.slug || (!selectedOrgId ? context.organisation?.slug : '') || '';

        if (selectedOrgId && !selectedOrg) {
          setUsers([]);
          setIsLoading(false);
          return;
        }
        if (!orgSlug) {
          setUsers([]);
          setIsLoading(false);
          return;
        }

        const url = `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/?${params.toString()}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch users');

        const data = await res.json();
        const rawList =
          data?.data?.data || data?.data?.results || data?.results || data?.data || [];

        const byKey = new Map<string, any>();
        for (const item of Array.isArray(rawList) ? rawList : []) {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const key = String(u?.id ?? u?.email ?? item?.id ?? '');
          if (!key) continue;

          const normalized = {
            id: String(u?.id ?? item?.id ?? key),
            email: u?.email,
            first_name: u?.first_name,
            last_name: u?.last_name,
            organisations: u?.organisations,
            is_superuser: Boolean((u as any)?.is_superuser),
            is_active: u?.is_active ?? item?.is_active ?? true,
            role: (u as any)?.role ?? 'User',
            role_label: (u as any)?.role_label ?? (item as any)?.role_label,
            role_assignments:
              (u as any)?.role_assignments ||
              (item as any)?.role_assignments ||
              (u as any)?.rbac_role_assignments ||
              (item as any)?.rbac_role_assignments ||
              [],
            membership: {
              id: item?.id,
              organisation: item?.organisation,
              role: item?.role,
              source: item?.source,
              joined_at: item?.joined_at,
              invited_by: item?.invited_by,
            },
            organisation: item?.organisation,
            source: item?.source,
            joined_at: item?.joined_at,
            invited_by: item?.invited_by,
            project_memberships: item?.project_memberships || u?.project_memberships || [],
          };

          const existing = byKey.get(key);
          if (!existing) {
            byKey.set(key, normalized);
            continue;
          }

          const mergedMemberships = [
            ...(Array.isArray(existing?.project_memberships) ? existing.project_memberships : []),
            ...(Array.isArray(normalized?.project_memberships)
              ? normalized.project_memberships
              : []),
          ];
          const merged = { ...existing, ...normalized, project_memberships: mergedMemberships };
          const score = (v: any) =>
            Number(Boolean(v?.email)) +
            Number(Boolean(v?.first_name)) +
            Number(Boolean(v?.last_name)) +
            Number(Array.isArray(v?.organisations) && v.organisations.length > 0);
          if (score(merged) > score(existing)) {
            byKey.set(key, merged);
          }
        }

        let results = Array.from(byKey.values());

        // Client-side project membership filtering
        if (selectedTeamId) {
          results = results.filter((u: any) =>
            u.project_memberships?.some(
              (m: any) =>
                String(m.project_id ?? m.project?.id ?? m.project?.project_id ?? '') ===
                String(selectedTeamId),
            ),
          );
        } else if (selectedClubId) {
          results = results.filter((u: any) =>
            u.project_memberships?.some(
              (m: any) =>
                String(m.project_id ?? m.project?.id ?? '') === String(selectedClubId),
            ),
          );
        }

        if (statusFilter === 'active') {
          results = results.filter((u: any) => u.is_active !== false);
        } else if (statusFilter === 'inactive') {
          results = results.filter((u: any) => u.is_active === false);
        }

        if (roleFilter) {
          const wanted = normalizeRoleName(roleFilter);
          results = results.filter((u: any) => {
            const roleNames = getUserTeamreelRoleNames(u, selectedTeamId, selectedClubId);
            return roleNames.some((r) => normalizeRoleName(r) === wanted);
          });
        }

        setUsers(results);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error loading users');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [
    selectedOrgId,
    selectedTeamId,
    selectedClubId,
    statusFilter,
    roleFilter,
    organisations,
    isSuperAdmin,
    refreshKey,
    teamLocked,
    preselectedTeamId,
  ]);

  // ── Sorted users ───────────────────────────────────────────
  const sortedUsers = useMemo(() => {
    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };
    const getUserLabel = (u: any) => {
      const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      return label || u.email || '';
    };
    const list = [...users];
    list.sort((a: any, b: any) => {
      const byLabel = sortKey(getUserLabel(a)).localeCompare(sortKey(getUserLabel(b)));
      if (byLabel !== 0) return byLabel;
      return sortKey(a?.email).localeCompare(sortKey(b?.email));
    });
    return list;
  }, [users]);

  // ── Batch selection helpers ────────────────────────────────
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map((u: any) => String(u.id))));
    }
  }, [selectedIds, sortedUsers]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected =
    sortedUsers.length > 0 && sortedUsers.every((u: any) => selectedIds.has(String(u.id)));
  const someSelected = selectedIds.size > 0;

  // Clear selection when user list changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [users]);

  const getSelectedUsers = () =>
    sortedUsers.filter((u: any) => selectedIds.has(String(u.id)));

  // ── Lookup maps ────────────────────────────────────────────
  const clubsById = useMemo(() => {
    const map = new Map<string, ProjectOption>();
    for (const c of clubs) map.set(String(c.id), c);
    return map;
  }, [clubs]);

  const teamsById = useMemo(() => {
    const map = new Map<string, ProjectOption>();
    for (const t of teams) map.set(String(t.id), t);
    return map;
  }, [teams]);

  const teamIdsByClubId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of teams) {
      const teamId = String(t?.id ?? '').trim();
      if (!teamId) continue;
      const clubId = String(
        (t as any)?.parent_id ??
          (t as any)?.parent_project?.id ??
          (t as any)?.parent_project_id ??
          '',
      ).trim();
      if (!clubId) continue;
      const existing = map.get(clubId);
      if (existing) {
        if (!existing.includes(teamId)) existing.push(teamId);
      } else {
        map.set(clubId, [teamId]);
      }
    }
    return map;
  }, [teams]);

  // ── Row display helpers ────────────────────────────────────

  const getUserSeasonCompetitionMatchCounts = (u: any) => {
    const allowedTeamIds = new Set<string>();

    if (selectedTeamId) {
      allowedTeamIds.add(String(selectedTeamId));
    } else if (selectedClubId) {
      for (const tid of teamIdsByClubId.get(String(selectedClubId)) || []) {
        allowedTeamIds.add(String(tid));
      }
    }

    if (allowedTeamIds.size === 0) {
      const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
      for (const m of memberships) {
        const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
        if (!projectId) continue;
        if (teamsById.has(projectId)) {
          allowedTeamIds.add(projectId);
          continue;
        }
        if (clubsById.has(projectId)) {
          for (const tid of teamIdsByClubId.get(projectId) || []) {
            allowedTeamIds.add(String(tid));
          }
        }
      }
    }

    let seasonsCount = 0;
    let competitionsCount = 0;
    let matchesCount = 0;
    for (const teamId of allowedTeamIds) {
      const t = teamsById.get(String(teamId));
      seasonsCount += Number((t as any)?.seasons_count ?? 0) || 0;
      competitionsCount += Number((t as any)?.competitions_count ?? 0) || 0;
      matchesCount += Number((t as any)?.matches_count ?? 0) || 0;
    }
    return { seasonsCount, competitionsCount, matchesCount };
  };

  const getPreferredScopeIdsForRow = (u: any): { clubId: string; teamId: string } => {
    if (selectedTeamId) {
      const team = teamsById.get(String(selectedTeamId));
      const clubId = String(
        (team as any)?.parent_id ??
          (team as any)?.parent_project?.id ??
          (team as any)?.parent_project_id ??
          '',
      ).trim();
      return { clubId, teamId: String(selectedTeamId) };
    }
    if (selectedClubId) {
      return { clubId: String(selectedClubId), teamId: '' };
    }
    const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
    const teamIds: string[] = [];
    const clubIds: string[] = [];
    for (const m of memberships) {
      const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
      if (!projectId) continue;
      if (teamsById.has(projectId)) {
        teamIds.push(projectId);
        continue;
      }
      if (clubsById.has(projectId)) {
        clubIds.push(projectId);
      }
    }
    const pickedTeamId = teamIds.find(Boolean) || '';
    if (pickedTeamId) {
      const team = teamsById.get(String(pickedTeamId));
      const clubId = String(
        (team as any)?.parent_id ??
          (team as any)?.parent_project?.id ??
          (team as any)?.parent_project_id ??
          '',
      ).trim();
      return { clubId, teamId: pickedTeamId };
    }
    return { clubId: clubIds.find(Boolean) || '', teamId: '' };
  };

  const buildOrgScopedDirectoryHref = (
    section: 'seasons' | 'competitions' | 'matches',
    u: any,
  ): string | null => {
    const orgSlug = String(getSelectedOrgSlug() || '').trim();
    if (!orgSlug) return null;
    const { clubId, teamId } = getPreferredScopeIdsForRow(u);
    const qs = new URLSearchParams();
    if (clubId) qs.set('club_id', String(clubId));
    if (teamId) qs.set('team_id', String(teamId));
    const qsStr = qs.toString();
    return qsStr ? `/${orgSlug}/${section}?${qsStr}` : `/${orgSlug}/${section}`;
  };

  const getFederationNameForRow = (u: any) => {
    if (u?.membership?.organisation?.name) return String(u.membership.organisation.name);
    if (u?.organisation?.name) return String(u.organisation.name);
    const org0 = Array.isArray(u?.organisations) ? u.organisations[0] : null;
    if (org0?.name) return String(org0.name);
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
        )
      : null;
    return selectedOrg?.name || '-';
  };

  const getOrganisationLinkForRow = (u: any) => {
    const fromMembership = u?.membership?.organisation;
    const fromRow = u?.organisation;
    const slugOrId =
      fromMembership?.slug ??
      fromMembership?.id ??
      fromRow?.slug ??
      fromRow?.id ??
      getSelectedOrgSlug();
    if (!slugOrId) return null;
    return `/organisations/${slugOrId}`;
  };

  const getUserDetailHrefForRow = (u: any): string | null => {
    const userId = u?.id ? String(u.id).trim() : '';
    if (!userId) return null;
    return `/users/${userId}`;
  };

  const getClubAndTeamLinksForRow = (u: any) => {
    const orgSlug = getSelectedOrgSlug();
    if (!orgSlug)
      return { clubHref: null as string | null, teamHref: null as string | null };

    const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
    const clubIds: string[] = [];
    const teamTuples: Array<{ teamId: string; clubId?: string }> = [];

    if (selectedTeamId) {
      const team = teamsById.get(String(selectedTeamId));
      const clubId =
        String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '') ||
        undefined;
      teamTuples.push({ teamId: String(selectedTeamId), clubId });
    }
    if (selectedClubId) {
      clubIds.push(String(selectedClubId));
    }

    if (!selectedClubId || !selectedTeamId) {
      for (const m of memberships) {
        const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
        if (!projectId) continue;
        const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
        const parentId =
          parentIdRaw === null || parentIdRaw === undefined
            ? ''
            : String(parentIdRaw).trim();
        if (parentId) {
          teamTuples.push({ teamId: projectId, clubId: parentId });
          clubIds.push(parentId);
          continue;
        }
        if (clubsById.has(projectId)) {
          clubIds.push(projectId);
        }
      }
    }

    const clubId = clubIds.find(Boolean) || null;
    const teamTuple = teamTuples.find((t) => Boolean(t?.teamId)) || null;

    const clubHref = clubId ? `/organisations/${orgSlug}/projects/${clubId}` : null;
    const teamHref = teamTuple?.teamId
      ? teamTuple?.clubId
        ? `/organisations/${orgSlug}/projects/${teamTuple.clubId}/teams/${teamTuple.teamId}`
        : `/organisations/${orgSlug}/projects/${teamTuple.teamId}`
      : null;

    return { clubHref, teamHref };
  };

  const getClubAndTeamForRow = (u: any) => {
    if (selectedTeamId) {
      const team = teamsById.get(String(selectedTeamId));
      const clubId = String(
        (team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '',
      );
      const club = clubId ? clubsById.get(clubId) : undefined;
      return {
        club: { label: club?.name || '-', title: club?.name || '' },
        team: { label: team?.name || '-', title: team?.name || '' },
      };
    }

    if (selectedClubId) {
      const club = clubsById.get(String(selectedClubId));
      const memberships = Array.isArray(u?.project_memberships)
        ? u.project_memberships
        : [];
      const teamIds = memberships
        .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
        .filter(Boolean);
      const teamUnderClub = teamIds
        .map((id: string) => teamsById.get(id))
        .find((t: ProjectOption | undefined) => {
          const parentId = String(
            (t as any)?.parent_id ?? (t as any)?.parent_project?.id ?? '',
          );
          return parentId && club && String(parentId) === String(club.id);
        });
      return {
        club: { label: club?.name || '-', title: club?.name || '' },
        team: { label: teamUnderClub?.name || '-', title: teamUnderClub?.name || '' },
      };
    }

    const memberships = Array.isArray(u?.project_memberships)
      ? u.project_memberships
      : [];
    const projectIds = memberships
      .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
      .filter(Boolean);

    const teamNames: string[] = [];
    const clubNames: string[] = [];
    for (const id of projectIds) {
      const team = teamsById.get(id);
      if (team?.name) {
        teamNames.push(String(team.name));
        const clubId = String(
          (team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '',
        );
        const club = clubId ? clubsById.get(clubId) : undefined;
        if (club?.name) clubNames.push(String(club.name));
        continue;
      }
      const club = clubsById.get(id);
      if (club?.name) clubNames.push(String(club.name));
    }

    return {
      club: summarizeNames(clubNames),
      team: summarizeNames(teamNames),
    };
  };

  // ── Delete handlers ────────────────────────────────────────

  const handleDeleteOrgMember = async (
    membershipId: string,
    usernameLabel: string,
    orgName: string,
  ) => {
    const orgSlug = getSelectedOrgSlug();
    if (!orgSlug) {
      alert('Select a federation first.');
      return;
    }
    if (!window.confirm(`Remove ${usernameLabel} from ${orgName}?`)) return;

    const apiBaseUrl = getApiBaseUrl();
    const csrfToken = getCsrfToken();
    const res = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${membershipId}/`,
      {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      alert(text || `Failed to delete member (${res.status})`);
      return;
    }

    setUsers((prev) =>
      prev.filter((row: any) => {
        const rowMembershipId =
          row?.membership?.id ?? row?.membership_id ?? row?.member_id;
        return String(rowMembershipId) !== String(membershipId);
      }),
    );
  };

  const handleDeleteTeamMember = async (
    projectMembershipId: string,
    usernameLabel: string,
    teamName: string,
  ) => {
    if (!window.confirm(`Remove ${usernameLabel} from ${teamName}?`)) return;

    const apiBaseUrl = getApiBaseUrl();
    const csrfToken = getCsrfToken();
    const deleteUrl = `${apiBaseUrl}/api/v1/projects/${preselectedTeamId}/members/${projectMembershipId}/`;

    console.log('🗑️ Deleting team member:', {
      teamId: preselectedTeamId,
      projectMembershipId,
      deleteUrl,
    });

    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Delete failed:', {
        status: res.status,
        statusText: res.statusText,
        response: text,
      });
      alert(text || `Failed to remove member (${res.status})`);
      return;
    }

    console.log('✅ Member removed successfully');
    setUsers((prev) =>
      prev.filter(
        (row: any) => String(row?.project_membership_id) !== String(projectMembershipId),
      ),
    );
  };

  // ── Return ─────────────────────────────────────────────────
  return {
    // Auth / context
    isSuperAdmin,
    // Locks
    orgLocked,
    clubLocked,
    teamLocked,
    scopedLocked,
    // Data
    sortedUsers,
    isLoading,
    error,
    hasUsers: users.length > 0,
    organisations,
    clubs,
    teams,
    availableRoles: AVAILABLE_ROLES as unknown as string[],
    // Filter state
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    roleFilter,
    // Filter handlers
    onOrgChange,
    onClubChange,
    onTeamChange,
    onStatusChange: setStatusFilter,
    onRoleChange: setRoleFilter,
    onClearFilters,
    onAddMember,
    // Batch
    selectedIds,
    setSelectedIds,
    allSelected,
    someSelected,
    handleSelectAll,
    handleSelectOne,
    getSelectedUsers,
    // Modals
    detailUser,
    isDetailModalOpen,
    setDetailUser,
    setIsDetailModalOpen,
    editUser,
    isEditModalOpen,
    setIsEditModalOpen,
    isAddMemberOpen,
    setIsAddMemberOpen,
    isBatchModalOpen,
    setIsBatchModalOpen,
    // Handlers
    handleEditClick,
    handleSaveUser,
    refreshData: () => setRefreshKey((k) => k + 1),
    handleDeleteOrgMember,
    handleDeleteTeamMember,
    // Navigation
    navigate,
    // Row helpers
    getSelectedOrgSlug,
    getUserSeasonCompetitionMatchCounts,
    buildOrgScopedDirectoryHref,
    getFederationNameForRow,
    getOrganisationLinkForRow,
    getUserDetailHrefForRow,
    getClubAndTeamLinksForRow,
    getClubAndTeamForRow,
    // Props passthrough (for modals)
    preselectedClubId,
    preselectedTeamId,
  };
}

export type UsersListData = ReturnType<typeof useUsersListData>;
