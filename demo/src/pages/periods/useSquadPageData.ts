/**
 * useSquadPageData — state, data fetching, permissions, breadcrumbs, mutations
 * for ProjectSeasonSquadPage.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';

import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';

// ── Types ────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  slug?: string;
  name: string;
  parent_project?: { id: string; slug?: string; name: string } | null;
};

export type Organisation = {
  id: string;
  slug?: string;
  name: string;
};

export type Period = {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  parent_period?: { id: string; name: string } | null;
  parent_period_id?: string | null;
  data?: Record<string, any>;
};

// ── Helpers ──────────────────────────────────────────────────────────

function isSeasonPeriod(p: any): boolean {
  if (!p) return false;
  const explicit = String(p.type || p.period_type || '').toLowerCase();
  if (explicit === 'season') return true;
  return !Boolean(p.parent_period || p.parent_period_id);
}

function unwrap<T = any>(payload: any): T {
  return (payload?.data as T) ?? (payload as T);
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSquadPageData() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(params.orgId || '').trim();
  const projectSlugOrId = String(params.projectId || '').trim();
  const clubSlugOrId = String((params as any).clubId || '').trim();
  const effectiveSeasonId = String(params.seasonId || '').trim();
  const isTeamRoute = Boolean(clubSlugOrId);

  const seasonsBasePath = useMemo(() => {
    if (isTeamRoute) {
      return `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`;
    }
    return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
  }, [clubSlugOrId, isTeamRoute, orgSlugOrId, projectSlugOrId]);

  // ── State ──────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [clubProject, setClubProject] = useState<Project | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');

  const [seasonsForSwitcher, setSeasonsForSwitcher] = useState<Period[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);
  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any | null>(null);

  // ── Permissions ────────────────────────────────────────────────────

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const route = String(orgSlugOrId || '').trim();
    const orgIdMatches = (candidate: any) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String((organisation as any)?.id || '').trim();
      const oslug = String((organisation as any)?.slug || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };
    const fromList = (myOrganisations as any[])?.find((o: any) => orgIdMatches(o));
    if (fromList?.user_role) return fromList;
    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((organisation as any)?.user_role) return organisation as any;
    if (fromList) return fromList;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || organisation || fromList || contextOrg || null;
  }, [context?.organisation, myOrganisations, orgSlugOrId, organisation, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin],
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // ── Fetch data ─────────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) {
          throw new Error('Missing route parameters');
        }

        const looksLikeIdentifier = (value: string) => {
          const v = String(value || '').trim();
          if (!v) return false;
          return /^\d+$/.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
        };

        const teamScopedProjectUrl = (org: string, club: string, team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(club)}/teams/${encodeURIComponent(team)}/`;
        const defaultProjectUrl = (team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(team)}/`;

        const projectUrl =
          isTeamRoute && clubSlugOrId && projectSlugOrId && !looksLikeIdentifier(projectSlugOrId)
            ? teamScopedProjectUrl(orgSlugOrId, clubSlugOrId, projectSlugOrId)
            : defaultProjectUrl(projectSlugOrId);

        const [orgRes, projectRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(projectUrl, { credentials: 'include' }),
        ]);
        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const orgJson = unwrap<Organisation>(await orgRes.json());
        const projectJson = unwrap<Project>(await projectRes.json());
        if (isCancelled) return;
        setOrganisation(orgJson);
        setProject(projectJson);

        if (isTeamRoute) {
          const clubRes = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          );
          if (clubRes.ok) {
            const clubJson = unwrap<Project>(await clubRes.json());
            if (!isCancelled) setClubProject(clubJson);
          }
        }

        // Resolve season UUID
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?page_size=500&project_id=${encodeURIComponent(projectJson.id)}&parent_id=null`;
        const allPeriods = await fetchAllPages<any>(rootPeriodsUrl, { credentials: 'include' }, { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` });
        const seasonOptions = allPeriods.filter(isSeasonPeriod);
        if (!isCancelled) setSeasonsForSwitcher(seasonOptions);

        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p) => periodPathKey(p) === String(effectiveSeasonId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');
        if (!isCancelled) setResolvedSeasonId(seasonUuid);

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' });
        if (!seasonRes.ok) throw new Error('Failed to load season');
        const seasonJson = unwrap<Period>(await seasonRes.json());
        if (!isCancelled) setSeason(seasonJson);

        const desiredKey = periodPathKey(seasonJson);
        if (desiredKey && desiredKey !== String(effectiveSeasonId)) {
          navigate(`${seasonsBasePath}/${desiredKey}/squad`, { replace: true });
        }

        // Squad members
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectJson.id)}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;
        const membersList = await fetchAllPages<any>(membersUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });
        if (!isCancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
        console.error(e);
        if (!isCancelled) setError(e instanceof Error ? e.message : 'Failed to load squad');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    run();
    return () => { isCancelled = true; };
  }, [apiBaseUrl, clubSlugOrId, effectiveSeasonId, isTeamRoute, navigate, orgSlugOrId, projectSlugOrId, seasonsBasePath]);

  // ── Breadcrumbs ────────────────────────────────────────────────────

  const handleSeasonSwitch = (option: { id: string; slug?: string } | null) => {
    if (!option) return;
    const slugOrId = String(option.slug || option.id).trim();
    if (slugOrId) navigate(`${seasonsBasePath}/${slugOrId}/squad`);
  };

  const seasonKeyOrId = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  // ── Mutations ──────────────────────────────────────────────────────

  const deleteSeason = async () => {
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!seasonUuid) return;
    if (!window.confirm(`Are you sure you want to delete season ${season?.name || ''}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      });
      if (res.ok) { navigate(seasonsBasePath); return; }
      alert('Error deleting season');
    } catch (e) { console.error(e); alert('Error deleting season'); }
  };

  const deleteMembership = async (membership: any) => {
    const membershipId = String(membership?.id || '').trim();
    const projectId = String(project?.id || '').trim();
    if (!membershipId || !projectId) return;
    const u = membership.user || {};
    const displayName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'this member';
    if (!window.confirm(`Remove ${displayName} from this team?`)) return;
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include' },
      );
      if (!res.ok) { const detail = await res.text().catch(() => ''); throw new Error(detail || 'Failed to remove member'); }
      setMembers((prev) => prev.filter((m: any) => String(m.id) !== membershipId));
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : 'Error removing member'); }
  };

  const savePeriodEdit = async (payload: any) => {
    if (!selectedEditPeriod) return;
    const periodId = String(selectedEditPeriod?.id || '').trim();
    if (!periodId) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const detail = await res.text().catch(() => ''); throw new Error(detail || 'Failed to save season'); }
    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...selectedEditPeriod, ...payload };
    setSeason((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
  };

  const saveMembershipEdit = async ({ role, functional_roles }: { role: string; functional_roles: string[] }) => {
    const membershipId = String(selectedMembership?.id || '').trim();
    const projectId = String(project?.id || '').trim();
    if (!membershipId || !projectId) return;

    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ role }),
      },
    );
    if (!res.ok) { const detail = await res.text().catch(() => ''); throw new Error(detail || 'Failed to save member'); }

    const membershipUserId = Number(selectedMembership?.user?.id);
    if (!membershipUserId) throw new Error('Missing user id');

    const prevDirect = selectedMembership?.functional_roles ?? selectedMembership?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: any) => String(r || '').trim()).filter(Boolean) : [];
    const nextRoles = (Array.isArray(functional_roles) ? functional_roles : []).map((r: any) => String(r || '').trim()).filter(Boolean);

    const prevSet = new Set(prevRoles);
    const nextSet = new Set(nextRoles);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));

    if (toAdd.length) {
      const assignRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/functional-roles/assign/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
          credentials: 'include',
          body: JSON.stringify({ user_id: membershipUserId, roles: toAdd }),
        },
      );
      if (!assignRes.ok) { const detail = await assignRes.text().catch(() => ''); throw new Error(detail || 'Failed to assign functional roles'); }
    }

    if (toRemove.length) {
      const unassignRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/functional-roles/unassign/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
          credentials: 'include',
          body: JSON.stringify({ user_id: membershipUserId, roles: toRemove }),
        },
      );
      if (!unassignRes.ok) { const detail = await unassignRes.text().catch(() => ''); throw new Error(detail || 'Failed to unassign functional roles'); }
    }

    setMembers((prev) =>
      prev.map((m: any) => (String(m.id) === membershipId ? { ...m, role, functional_roles } : m)),
    );
  };

  return {
    // Route info
    navigate,
    orgSlugOrId,
    clubSlugOrId,
    isTeamRoute,
    seasonsBasePath,
    effectiveSeasonId,

    // Data
    loading,
    error,
    organisation,
    clubProject,
    project,
    season,
    resolvedSeasonId,
    seasonsForSwitcher,
    members,
    seasonKeyOrId,

    // Permissions
    userCanEditProject,
    userCanDeleteProject,

    // Modal state
    isPeriodEditModalOpen,
    setIsPeriodEditModalOpen,
    selectedEditPeriod,
    setSelectedEditPeriod,
    isMembershipEditModalOpen,
    setIsMembershipEditModalOpen,
    selectedMembership,
    setSelectedMembership,

    // Actions
    handleSeasonSwitch,
    deleteSeason,
    deleteMembership,
    savePeriodEdit,
    saveMembershipEdit,
  };
}
