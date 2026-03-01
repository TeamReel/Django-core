import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader } from '@django-core/page-templates';

import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import PeriodEditModal from '../identity/PeriodEditModal';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';

type Project = {
  id: string;
  slug?: string;
  name: string;
  parent_project?: { id: string; slug?: string; name: string } | null;
};

type Organisation = {
  id: string;
  slug?: string;
  name: string;
};

type Period = {
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

function isSeasonPeriod(p: any): boolean {
  if (!p) return false;
  const explicit = String(p.type || p.period_type || '').toLowerCase();
  if (explicit === 'season') return true;
  const hasParent = Boolean(p.parent_period || p.parent_period_id);
  return !hasParent;
}

function unwrap<T = any>(payload: any): T {
  return (payload?.data as T) ?? (payload as T);
}

function unwrapList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function MembershipEditModal({
  opened,
  onClose,
  membership,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  membership: any | null;
  onSave: (payload: { role: string; functional_roles: string[] }) => Promise<void>;
}) {
  const [role, setRole] = useState('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

  const readFunctionalRolesFromMembership = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) {
      return direct.map((r) => String(r || '').trim()).filter(Boolean);
    }

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  useEffect(() => {
    if (!opened || !membership) return;
    setRole(String(membership?.role || 'viewer'));
    setFunctionalRoles(readFunctionalRolesFromMembership(membership));
    setError(null);
  }, [opened, membership]);

  if (!opened || !membership) return null;

  const user = membership.user || {};
  const displayName =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Member';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '20px',
          borderRadius: '8px',
          width: '520px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">Edit member</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--app-text)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-muted fs-13" style={{ marginTop: '10px' }}>{displayName}</div>

        <div className="flex-col gap-10 mt-16">
          <div className="flex-col gap-6">
            <label style={{ fontWeight: 600 }} htmlFor="membership-role">
              Access role
            </label>
            <select
              id="membership-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="flex-col gap-6">
            <div className="fw-600">Functional roles</div>
            <div
              className="grid p-10 rounded-6 border bg-surface-2"
              style={{
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px 12px',
              }}
            >
              {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
                const checked = functionalRoles.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex-row gap-8 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextChecked = e.currentTarget.checked;
                        setFunctionalRoles((prev) => {
                          const normalized = (Array.isArray(prev) ? prev : [])
                            .map((r) => String(r || '').trim())
                            .filter(Boolean);
                          const set = new Set(normalized);
                          if (nextChecked) set.add(opt.value);
                          else set.delete(opt.value);
                          return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                        });
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <div style={{ color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await onSave({ role, functional_roles: functionalRoles });
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to save');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-primary, #1976d2)',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectSeasonSquadPage() {
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

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';

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
    [orgForPermissions, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const handleSeasonSwitch = (option: { id: string; slug?: string } | null) => {
    if (!option) return;
    const slugOrId = String(option.slug || option.id).trim();
    if (!slugOrId) return;
    navigate(`${seasonsBasePath}/${slugOrId}/squad`);
  };

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
          if (/^\d+$/.test(v)) return true;
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
          return false;
        };

        const teamScopedProjectUrl = (org: string, club: string, team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(club)}/teams/${encodeURIComponent(team)}/`;

        const defaultProjectUrl = (team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(team)}/`;

        const projectUrl = isTeamRoute && clubSlugOrId && projectSlugOrId && !looksLikeIdentifier(projectSlugOrId)
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
            { credentials: 'include' }
          );
          if (clubRes.ok) {
            const clubJson = unwrap<Project>(await clubRes.json());
            if (!isCancelled) setClubProject(clubJson);
          }
        }

        // Resolve season UUID from URL param (UUID or slugified name)
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?page_size=500&project_id=${encodeURIComponent(
          projectJson.id
        )}&parent_id=null`;
        const allPeriods = await fetchAllPages<any>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` }
        );
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

        // Season-scoped squad (fetch all pages to avoid missing members on large rosters)
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(
          projectJson.id
        )}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;

        console.log('[Squad] Fetching members with period filter:', { membersUrl, seasonUuid, projectId: projectJson.id });

        const membersList = await fetchAllPages<any>(
          membersUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

        console.log('[Squad] Fetched members count:', membersList?.length || 0);

        if (!isCancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
        if (!isCancelled) setError(e instanceof Error ? e.message : 'Failed to load squad');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    run();
    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, clubSlugOrId, effectiveSeasonId, isTeamRoute, navigate, orgSlugOrId, projectSlugOrId, seasonsBasePath]);

  const breadcrumbs = useMemo(() => {
    const orgCrumb = organisation
      ? { label: organisation.name, onClick: () => navigate(`/organisations/${organisation.slug || organisation.id}`) }
      : { label: 'Federation' };

    const clubCrumb = clubProject
      ? { label: clubProject.name, onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubProject.slug || clubProject.id}`) }
      : null;

    const projectCrumb = project
      ? {
          label: project.name,
          onClick: () =>
            navigate(
              isTeamRoute
                ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
                : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
            ),
        }
      : { label: 'Team' };

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      projectCrumb,
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={String(resolvedSeasonId || (season as any)?.id || '')}
            options={seasonsForSwitcher.map((s) => ({
              id: String(s.id),
              label: String(s.name || (s as any).slug || s.id),
              slug: periodPathKey(s) || String(s.id),
            }))}
            onSelect={handleSeasonSwitch}
            hasDropdown={seasonsForSwitcher.length > 1}
          />
        ) as any,
        current: true,
      },
    ];
  }, [
    clubProject,
    clubSlugOrId,
    effectiveSeasonId,
    isTeamRoute,
    navigate,
    orgSlugOrId,
    organisation,
    project,
    season,
    resolvedSeasonId,
    seasonsForSwitcher,
    seasonsBasePath,
  ]);

  const title = season ? `${season.name} Squad` : 'Squad';

  const seasonKeyOrId =
    periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'squad', label: 'Squad' },
  ];

  const navigateToTab = (tabId: string) => {
    if (!seasonKeyOrId) return;
    if (tabId === 'squad') return;
    navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=${encodeURIComponent(tabId)}`);
  };

  const deleteSeason = async () => {
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!seasonUuid) return;

    if (!window.confirm(`Are you sure you want to delete season ${season?.name || ''}?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (res.ok) {
        navigate(seasonsBasePath);
        return;
      }

      alert('Error deleting season');
    } catch (e) {
      console.error(e);
      alert('Error deleting season');
    }
  };

  const deleteMembership = async (membership: any) => {
    const membershipId = String(membership?.id || '').trim();
    const projectId = String(project?.id || '').trim();
    if (!membershipId || !projectId) return;

    const user = membership.user || {};
    const displayName =
      user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'this member';

    if (!window.confirm(`Remove ${displayName} from this team?`)) return;

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to remove member');
      }

      setMembers((prev) => prev.filter((m: any) => String(m.id) !== membershipId));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error removing member');
    }
  };

  return (
    <>
      <div>
        <PageHeader
          title={title}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(`${seasonsBasePath}/${periodPathKey(season || {}) || resolvedSeasonId || effectiveSeasonId}`)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Back to season
              </button>
              {userCanEditProject && season && (
                <button
                  onClick={() => {
                    setSelectedEditPeriod(season);
                    setIsPeriodEditModalOpen(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #fd7e14',
                    backgroundColor: 'var(--app-surface)',
                    color: '#fd7e14',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Edit
                </button>
              )}
              {userCanDeleteProject && season && (
                <button
                  onClick={deleteSeason}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dc3545',
                    backgroundColor: 'var(--app-surface)',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          }
        />

        <PageContent>
          {loading && <LoadingState message="Loading squad..." />}
          {!loading && error && <Alert variant="error">{error}</Alert>}

          {!loading && !error && (
            <>
              {/* Tabs (match Season detail) */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  borderBottom: '1px solid var(--app-border)',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--app-border)',
                      borderBottom: tab.id === 'squad' ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                      backgroundColor: tab.id === 'squad' ? 'var(--app-surface)' : 'var(--app-surface-2)',
                      color: 'var(--app-text)',
                      cursor: tab.id === 'squad' ? 'default' : 'pointer',
                      fontSize: '13px',
                      fontWeight: tab.id === 'squad' ? 600 : 500,
                      opacity: tab.id === 'squad' ? 1 : 0.9,
                    }}
                    disabled={tab.id === 'squad'}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <Card>
            <div style={{ padding: '16px 16px 0 16px' }}>
              <div className="flex-row gap-12 flex-wrap">
                <h3 className="m-0 fs-16 fw-600">Players & Staff</h3>
                <Badge variant="info">{members.length} members</Badge>
              </div>
              <div className="mt-4 text-muted fs-13">
                Season-scoped roster (filtered by period).
              </div>
            </div>

            <div className="p-16">
              <div className="overflow-x-auto">
                <Table style={compactTableStyle}>
                  <thead>
                    <tr>
                      <th style={compactThStyle}>Name</th>
                      <th style={compactThStyle}>Email</th>
                      <th style={compactThStyle}>Access</th>
                      <th style={compactThStyle}>Functional</th>
                      <th style={compactThStyle}>Position</th>
                      <th style={compactThStyle}>#</th>
                      <th style={compactThStyle} className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => {
                      const user = m.user || m;
                      const name =
                        user.name ||
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                        user.email ||
                        '—';

                      const email = user.email || '—';
                      const normalizeAccessRole = (raw: any): 'viewer' | 'editor' | 'admin' => {
                        const role = String(raw || '').trim().toLowerCase();
                        if (role === 'admin') return 'admin';
                        if (role === 'editor') return 'editor';
                        if (role === 'viewer') return 'viewer';
                        if (['coach', 'trainer'].includes(role)) return 'editor';
                        if (['manager', 'owner'].includes(role)) return 'admin';
                        return 'viewer';
                      };

                      const functionalRoles = (() => {
                        const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
                        if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);

                        const meta = (m as any)?.metadata || {};
                        const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
                        return legacy ? [legacy] : [];
                      })();

                      const role = normalizeAccessRole(m.role || 'viewer');
                      const position = m.metadata?.position || '—';
                      const shirtNumber = m.metadata?.shirt_number ?? '';
                      const membershipId = m.id;
                      const userId = user?.id;

                      return (
                        <tr key={String(membershipId || user.id)}>
                          <td style={compactTextTdStyle}>
                            {userId ? (
                              <Link
                                to={`/users/${userId}`}
                                className="text-blue-600 hover:underline"
                                style={{ textDecoration: 'none' }}
                              >
                                {name}
                              </Link>
                            ) : (
                              name
                            )}
                          </td>
                          <td style={compactTextTdStyle}>{email}</td>
                          <td style={compactTdStyle}>
                            <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                              {role}
                            </Badge>
                          </td>
                          <td style={compactTdStyle}>
                            {functionalRoles.length ? (
                              <div className="flex-row gap-6 flex-wrap">
                                {functionalRoles.map((r: string) => (
                                  <Badge key={r} variant="default">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={compactTextTdStyle}>{position}</td>
                          <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                          <td style={compactTdStyle}>
                            <div style={compactActionsStyle}>
                              {userId ? (
                                <button
                                  onClick={() => navigate(`/users/${userId}`)}
                                  style={actionButtonStyle('primary')}
                                >
                                  View
                                </button>
                              ) : (
                                <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                              )}

                              {userCanEditProject && (
                                <button
                                  onClick={() => {
                                    setSelectedMembership(m);
                                    setIsMembershipEditModalOpen(true);
                                  }}
                                  style={actionButtonStyle('warning')}
                                >
                                  Edit
                                </button>
                              )}
                              {userCanDeleteProject && (
                                <button
                                  onClick={() => deleteMembership(m)}
                                  style={actionButtonStyle('danger')}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {members.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...compactTdStyle, textAlign: 'center', padding: '24px' }}>
                          No members found for this season.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </Card>
            </>
          )}
        </PageContent>

        <PeriodEditModal
          opened={isPeriodEditModalOpen}
          onClose={() => {
            setIsPeriodEditModalOpen(false);
          }}
          period={selectedEditPeriod}
          showSportVariant={false}
          onSave={async (payload) => {
            if (!selectedEditPeriod) return;
            const periodId = String(selectedEditPeriod?.id || '').trim();
            if (!periodId) return;

            const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to save season');
            }

            const raw = await res.json().catch(() => null);
            const updated = (raw as any)?.data || raw || { ...selectedEditPeriod, ...payload };
            setSeason((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
          }}
        />

        <MembershipEditModal
          opened={isMembershipEditModalOpen}
          membership={selectedMembership}
          onClose={() => {
            setIsMembershipEditModalOpen(false);
            setSelectedMembership(null);
          }}
          onSave={async ({ role, functional_roles }) => {
            const membershipId = String(selectedMembership?.id || '').trim();
            const projectId = String(project?.id || '').trim();
            if (!membershipId || !projectId) return;

            const res = await fetch(
              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ role }),
              }
            );

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to save member');
            }

            const membershipUserId = Number(selectedMembership?.user?.id);
            if (!membershipUserId) throw new Error('Missing user id');

            const prevDirect = (selectedMembership as any)?.functional_roles ?? (selectedMembership as any)?.functionalRoles;
            const prevRoles = Array.isArray(prevDirect)
              ? prevDirect.map((r: any) => String(r || '').trim()).filter(Boolean)
              : [];
            const nextRoles = (Array.isArray(functional_roles) ? functional_roles : [])
              .map((r: any) => String(r || '').trim())
              .filter(Boolean);

            const prevSet = new Set(prevRoles);
            const nextSet = new Set(nextRoles);
            const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
            const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));

            if (toAdd.length) {
              const assignRes = await fetch(
                `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/functional-roles/assign/`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken(),
                  },
                  credentials: 'include',
                  body: JSON.stringify({ user_id: membershipUserId, roles: toAdd }),
                }
              );
              if (!assignRes.ok) {
                const detail = await assignRes.text().catch(() => '');
                throw new Error(detail || 'Failed to assign functional roles');
              }
            }

            if (toRemove.length) {
              const unassignRes = await fetch(
                `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/functional-roles/unassign/`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken(),
                  },
                  credentials: 'include',
                  body: JSON.stringify({ user_id: membershipUserId, roles: toRemove }),
                }
              );
              if (!unassignRes.ok) {
                const detail = await unassignRes.text().catch(() => '');
                throw new Error(detail || 'Failed to unassign functional roles');
              }
            }

            setMembers((prev) =>
              prev.map((m: any) => (String(m.id) === membershipId ? { ...m, role, functional_roles } : m))
            );
          }}
        />
      </div>
    </>
  );
}
