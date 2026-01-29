import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canEditProject } from '../../utils/permissions';
import { ACTIVE_CONTEXT_CHANGED_EVENT, getActiveContext, setActiveContext } from '../../utils/activeContext';

type Project = {
  id: string;
  slug?: string;
  name: string;
  organisation?: any;
};

type Organisation = {
  id: string;
  slug?: string;
  name: string;
  user_role?: string;
};

type Period = {
  id: string;
  name: string;
  type?: string;
  period_type?: string;
  parent_period?: any;
  parent_period_id?: string | null;
};

function unwrap<T = any>(payload: any): T {
  return (payload?.data as T) ?? (payload as T);
}

function isSeasonPeriod(p: any): boolean {
  if (!p) return false;
  const explicit = String(p.type || p.period_type || '').toLowerCase();
  if (explicit === 'season') return true;
  const hasParent = Boolean(p.parent_period || p.parent_period_id);
  return !hasParent;
}

const getCsrfToken = (): string =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getUserDisplayName(membership: any): string {
  const u = membership?.user || {};
  const name =
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Member';
  return name;
}

function readAssetsFromMembership(membership: any): {
  kitProfilePhotoUrl: string;
  kitFullBodyUrl: string;
  kitIntro: string;
  kitGoalCelebrationUrl: string;
  oldProfilePhotoUrl: string;
  oldFullBodyUrl: string;
} {
  const meta = (membership as any)?.metadata || {};
  const tr = (meta as any)?.teamreel_assets || (meta as any)?.teamreelAssets || {};
  const kit = tr?.kit || {};
  const old = tr?.old || {};

  return {
    kitProfilePhotoUrl: String(kit?.profile_photo_url || '').trim(),
    kitFullBodyUrl: String(kit?.full_body_url || '').trim(),
    kitIntro: String(kit?.intro_text || '').trim(),
    kitGoalCelebrationUrl: String(kit?.goal_celebration_url || '').trim(),
    oldProfilePhotoUrl: String(old?.profile_photo_url || '').trim(),
    oldFullBodyUrl: String(old?.full_body_url || '').trim(),
  };
}

function mergeAssetsIntoMetadata(existingMetadata: any, patch: ReturnType<typeof readAssetsFromMembership>): any {
  const meta = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {};
  const existingTeamReel =
    meta.teamreel_assets && typeof meta.teamreel_assets === 'object'
      ? meta.teamreel_assets
      : meta.teamreelAssets && typeof meta.teamreelAssets === 'object'
        ? meta.teamreelAssets
        : {};

  const next = {
    ...existingTeamReel,
    kit: {
      ...(existingTeamReel?.kit || {}),
      profile_photo_url: patch.kitProfilePhotoUrl || '',
      full_body_url: patch.kitFullBodyUrl || '',
      intro_text: patch.kitIntro || '',
      goal_celebration_url: patch.kitGoalCelebrationUrl || '',
    },
    old: {
      ...(existingTeamReel?.old || {}),
      profile_photo_url: patch.oldProfilePhotoUrl || '',
      full_body_url: patch.oldFullBodyUrl || '',
    },
  };

  meta.teamreel_assets = next;
  return meta;
}

export default function ProjectSeasonMemberDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const orgSlugOrId = String((params as any).orgId || '').trim();
  const clubSlugOrId = String((params as any).clubId || '').trim();
  const projectSlugOrId = String((params as any).projectId || '').trim();
  const seasonKeyOrId = String((params as any).seasonId || '').trim();
  const membershipId = String((params as any).competitionId || '').trim();

  const isOrgRoutes = location.pathname.startsWith('/organisations/');
  const isTeamRoute = Boolean(clubSlugOrId);

  const seasonsBasePath = useMemo(() => {
    if (isOrgRoutes) {
      if (isTeamRoute) {
        return `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`;
      }
      return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
    }

    if (isTeamRoute) {
      return `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`;
    }

    return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
  }, [clubSlugOrId, isOrgRoutes, isTeamRoute, orgSlugOrId, projectSlugOrId]);

  const activeTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = String(sp.get('tab') || '').trim();
    if (!raw) return 'overview';
    return raw;
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tabId);
    const next = sp.toString();
    navigate(next ? `${location.pathname}?${next}` : location.pathname);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);

  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');

  const [membership, setMembership] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctx = await getActiveContext();
        if (!cancelled) setActiveContextState(ctx);
      } catch {
        if (!cancelled) setActiveContextState(null);
      }
    };

    const onChanged = () => {
      void load();
    };

    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    };
  }, []);

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const orgIdMatches = (candidate: any) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String((org as any)?.id || '').trim();
      const oslug = String((org as any)?.slug || '').trim();
      const route = String(orgSlugOrId || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };

    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((org as any)?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);

  const [form, setForm] = useState(() =>
    readAssetsFromMembership({ metadata: { teamreel_assets: { kit: {}, old: {} } } })
  );

  useEffect(() => {
    if (!membership) return;
    setForm(readAssetsFromMembership(membership));
  }, [membership]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orgSlugOrId || !projectSlugOrId || !seasonKeyOrId || !membershipId) {
          throw new Error('Missing route parameters');
        }
        if (!UUID_RE.test(membershipId)) {
          throw new Error('Member id must be a UUID');
        }

        const looksLikeIdentifier = (value: string) => {
          const v = String(value || '').trim();
          if (!v) return false;
          if (/^\d+$/.test(v)) return true;
          if (UUID_RE.test(v)) return true;
          return false;
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

        if (!orgRes.ok) throw new Error('Failed to load federation');
        if (!projectRes.ok) throw new Error('Failed to load team');

        const orgJson = unwrap<Organisation>(await orgRes.json());
        const projectJson = unwrap<Project>(await projectRes.json());

        if (cancelled) return;
        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute) {
          const clubRes = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' }
          );
          if (clubRes.ok) {
            const clubJson = unwrap<Project>(await clubRes.json());
            if (!cancelled) setClub(clubJson);
          }
        }

        // Resolve season UUID from key-or-id
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?page_size=500&project_id=${encodeURIComponent(
          projectJson.id
        )}&parent_id=null`;
        const allPeriods = await fetchAllPages<any>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` }
        );

        const seasonOptions = (Array.isArray(allPeriods) ? allPeriods : []).filter(isSeasonPeriod);
        const isUuidParam = looksLikeUuid(seasonKeyOrId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p: any) => String(p.id) === String(seasonKeyOrId))
          : seasonOptions.find((p: any) => periodPathKey(p) === String(seasonKeyOrId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? seasonKeyOrId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');

        if (!cancelled) setResolvedSeasonId(seasonUuid);

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
          credentials: 'include',
        });
        if (seasonRes.ok) {
          const seasonJson = unwrap<Period>(await seasonRes.json());
          if (!cancelled) setSeason(seasonJson);
        }

        const memberRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectJson.id)}/members/${encodeURIComponent(membershipId)}/`,
          { credentials: 'include' }
        );

        if (!memberRes.ok) {
          const detail = await memberRes.text().catch(() => '');
          throw new Error(detail || 'Failed to load member');
        }

        const memberJson = unwrap<any>(await memberRes.json());
        if (!cancelled) setMembership(memberJson);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load member');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, clubSlugOrId, isTeamRoute, membershipId, orgSlugOrId, projectSlugOrId, seasonKeyOrId]);

  const seasonKeyForLinks = periodPathKey(season as any) || String(seasonKeyOrId || resolvedSeasonId).trim();

  const title = membership ? `Member: ${getUserDisplayName(membership)}` : 'Member';

  const breadcrumbs = useMemo(() => {
    const orgCrumb = org
      ? { label: org.name, onClick: () => navigate(`/organisations/${org.slug || org.id}`) }
      : { label: 'Federation' };

    const clubCrumb =
      isTeamRoute && club
        ? {
            label: club.name,
            onClick: () =>
              navigate(
                isOrgRoutes
                  ? `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
                  : `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
              ),
          }
        : null;

    const teamCrumb = project
      ? {
          label: project.name,
          onClick: () =>
            navigate(
              isOrgRoutes
                ? isTeamRoute
                  ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
                : isTeamRoute
                  ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
            ),
        }
      : { label: 'Team' };

    const seasonLabel = season?.name || 'Season';

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      teamCrumb,
      {
        label: seasonLabel,
        onClick: () => {
          if (!seasonKeyForLinks) return;
          navigate(`${seasonsBasePath}/${seasonKeyForLinks}`);
        },
      },
      { label: 'Member Profile' },
    ];
  }, [
    club,
    clubSlugOrId,
    isOrgRoutes,
    isTeamRoute,
    navigate,
    org,
    orgSlugOrId,
    project,
    season?.name,
    seasonKeyForLinks,
    seasonsBasePath,
  ]);

  const save = async () => {
    if (!membership || !project || !userCanEditProject) return;

    setSaving(true);
    setSaveError(null);

    try {
      const nextMetadata = mergeAssetsIntoMetadata((membership as any)?.metadata, form);

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(membership.id)}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ metadata: nextMetadata }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to save');
      }

      const raw = await res.json().catch(() => null);
      const updated = (raw as any)?.data || raw || null;
      setMembership(updated ? { ...(membership as any), ...(updated as any) } : membership);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as any}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive =
                !!membership &&
                String(activeContext?.membership?.id ?? '') === String((membership as any)?.id ?? '');

              return (
                <button
                  type="button"
                  className="app-action-button"
                  onClick={async () => {
                    if (!membership || isActive) return;
                    try {
                      setActivatingContext(true);
                      await setActiveContext('membership', String((membership as any).id));
                      const ctx = await getActiveContext();
                      setActiveContextState(ctx);
                    } finally {
                      setActivatingContext(false);
                    }
                  }}
                  disabled={activatingContext || isActive}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    background: isActive ? '#dcfce7' : 'var(--app-surface)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    fontWeight: isActive ? 600 : 500,
                    opacity: activatingContext || isActive ? 0.8 : 1,
                    cursor: activatingContext || isActive ? 'not-allowed' : 'pointer',
                  }}
                  title="Set this member as your active context"
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            <Button
              variant="secondary"
              onClick={() => {
                if (!seasonKeyForLinks) return;
                navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
              }}
            >
              Back to squad
            </Button>
            <Button
              variant={userCanEditProject ? 'primary' : 'secondary'}
              disabled={!userCanEditProject || saving || loading}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      <PageContent>
        {loading && <LoadingState message="Loading member…" />}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && membership && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {saveError && (
                  <Alert variant="error">{saveError}</Alert>
                )}

                {activeTab === 'overview' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>Season member profile</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Stored on the season membership (per season/team), so the same person can have different assets next season.
                      </div>

                      <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Kit</div>
                          <div style={{ fontSize: '13px', opacity: 0.85 }}>Profile photo: {form.kitProfilePhotoUrl || '—'}</div>
                          <div style={{ fontSize: '13px', opacity: 0.85 }}>Full body: {form.kitFullBodyUrl || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Old</div>
                          <div style={{ fontSize: '13px', opacity: 0.85 }}>Profile photo: {form.oldProfilePhotoUrl || '—'}</div>
                          <div style={{ fontSize: '13px', opacity: 0.85 }}>Full body: {form.oldFullBodyUrl || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {activeTab === 'kit' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>In tenue</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Profile photo (kit) URL</div>
                          <Input
                            value={form.kitProfilePhotoUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, kitProfilePhotoUrl: e.target.value }))}
                            placeholder="https://…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Full body (kit) URL</div>
                          <Input
                            value={form.kitFullBodyUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, kitFullBodyUrl: e.target.value }))}
                            placeholder="https://…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Short intro (kit)</div>
                          <Input
                            value={form.kitIntro}
                            onChange={(e) => setForm((prev) => ({ ...prev, kitIntro: e.target.value }))}
                            placeholder="Korte intro…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Goal celebration (kit) URL</div>
                          <Input
                            value={form.kitGoalCelebrationUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, kitGoalCelebrationUrl: e.target.value }))}
                            placeholder="https://…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '12px' }}>
                          <Alert variant="info">You don’t have permission to edit this team.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {activeTab === 'old' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>Old</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Profile photo (old) URL</div>
                          <Input
                            value={form.oldProfilePhotoUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, oldProfilePhotoUrl: e.target.value }))}
                            placeholder="https://…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Full body (old) URL</div>
                          <Input
                            value={form.oldFullBodyUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, oldFullBodyUrl: e.target.value }))}
                            placeholder="https://…"
                            disabled={!userCanEditProject}
                          />
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '12px' }}>
                          <Alert variant="info">You don’t have permission to edit this team.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>Member</div>
                    <div style={{ fontSize: '13px' }}>{getUserDisplayName(membership)}</div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant="default">Membership: {String(membership?.id || '').slice(0, 8)}…</Badge>
                      {season && <Badge variant="default">Season: {season.name}</Badge>}
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Quick links</div>
                      {seasonKeyForLinks ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season squad
                          </Link>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=content`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season content
                          </Link>
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: '13px' }}>Season link unavailable.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageContent>
    </AppShell>
  );
}
