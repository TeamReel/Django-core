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
import { MEDIA_SLOTS, MediaSlotId, MemberMediaForm } from '../../constants/mediaSlots';
import { getApiBaseUrl } from '../../utils/apiBase';

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

// MEDIA_SLOTS, MediaSlotId, MemberMediaForm imported from ../../constants/mediaSlots

/**
 * Create empty media form - uses shared MEDIA_SLOTS
 */
function createEmptyMediaForm(): MemberMediaForm {
  return MEDIA_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = { url: '', caption: '' };
    return acc;
  }, {} as MemberMediaForm);
}

/**
 * Read assets from membership with legacy format migration.
 * This is specific to member detail page as it handles backwards compatibility.
 */
function readAssetsFromMembership(membership: any): MemberMediaForm {
  const meta = (membership as any)?.metadata || {};
  const tr = (meta as any)?.teamreel_assets || (meta as any)?.teamreelAssets || {};
  const media = tr?.media || {};

  // Also read legacy format for backwards compatibility
  const legacyKit = tr?.kit || {};
  const legacyOld = tr?.old || {};

  const form = createEmptyMediaForm();

  // Read new format first
  for (const slot of MEDIA_SLOTS) {
    const slotData = media[slot.id] || {};
    form[slot.id] = {
      url: String(slotData?.url || '').trim(),
      caption: String(slotData?.caption || '').trim(),
    };
  }

  // Migrate legacy format if new format is empty
  if (!form.profile.url && legacyKit?.profile_photo_url) {
    form.profile.url = String(legacyKit.profile_photo_url).trim();
  }
  if (!form.kit.url && legacyKit?.full_body_url) {
    form.kit.url = String(legacyKit.full_body_url).trim();
  }
  if (!form.intro.caption && legacyKit?.intro_text) {
    form.intro.caption = String(legacyKit.intro_text).trim();
  }
  if (!form.celebration.url && legacyKit?.goal_celebration_url) {
    form.celebration.url = String(legacyKit.goal_celebration_url).trim();
  }
  if (!form.legacy_photo.url && legacyOld?.profile_photo_url) {
    form.legacy_photo.url = String(legacyOld.profile_photo_url).trim();
  }

  return form;
}

function mergeAssetsIntoMetadata(existingMetadata: any, form: MemberMediaForm): any {
  const meta = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {};
  const existingTeamReel =
    meta.teamreel_assets && typeof meta.teamreel_assets === 'object'
      ? meta.teamreel_assets
      : meta.teamreelAssets && typeof meta.teamreelAssets === 'object'
        ? meta.teamreelAssets
        : {};

  // Build new media object
  const media: Record<string, { url: string; caption: string }> = {};
  for (const slot of MEDIA_SLOTS) {
    media[slot.id] = {
      url: form[slot.id]?.url || '',
      caption: form[slot.id]?.caption || '',
    };
  }

  // Keep legacy format for backwards compatibility
  const next = {
    ...existingTeamReel,
    media,
    // Legacy format (will be phased out)
    kit: {
      profile_photo_url: form.profile?.url || '',
      full_body_url: form.kit?.url || '',
      intro_text: form.intro?.caption || '',
      goal_celebration_url: form.celebration?.url || '',
    },
    old: {
      profile_photo_url: form.legacy_photo?.url || '',
      full_body_url: '',
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

  const apiBaseUrl = getApiBaseUrl();

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

  const [form, setForm] = useState<MemberMediaForm>(() => createEmptyMediaForm());

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
      <div className="has-mobile-action-bar">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as any}
        actions={
          <div className="hide-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive =
                !!membership &&
                String(activeContext?.membership?.id ?? '') === String((membership as any)?.id ?? '');

              const canMakeActive =
                !!membership &&
                String((membership as any)?.user?.id ?? '') &&
                String((user as any)?.id ?? '') &&
                String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');

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
                  disabled={!canMakeActive || activatingContext || isActive}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    background: isActive ? '#dcfce7' : 'var(--app-surface)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    fontWeight: isActive ? 600 : 500,
                    opacity: !canMakeActive || activatingContext || isActive ? 0.8 : 1,
                    cursor: !canMakeActive || activatingContext || isActive ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    canMakeActive
                      ? 'Set this member as your active context'
                      : 'You can only set your own membership as active context'
                  }
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

                {/* Overview Tab - Media completion matrix */}
                {activeTab === 'overview' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>Media Overview</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Track which media assets have been uploaded for this member's season profile.
                      </div>

                      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {MEDIA_SLOTS.map((slot) => {
                          const hasContent = Boolean(form[slot.id]?.url || form[slot.id]?.caption);
                          return (
                            <div
                              key={slot.id}
                              onClick={() => navigateToTab(slot.id)}
                              style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: `1px solid ${hasContent ? '#10b981' : 'var(--app-border)'}`,
                                background: hasContent ? '#dcfce7' : 'var(--app-surface)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>{slot.icon}</span>
                                <span style={{ fontWeight: 600 }}>{slot.label}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '14px' }}>
                                  {hasContent ? '✅' : '⬜'}
                                </span>
                              </div>
                              <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>
                                {slot.description}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '20px', padding: '12px', background: 'var(--app-muted)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Completion: {MEDIA_SLOTS.filter((s) => form[s.id]?.url || form[s.id]?.caption).length} / {MEDIA_SLOTS.length} media slots
                        </div>
                        <div style={{ marginTop: '8px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(MEDIA_SLOTS.filter((s) => form[s.id]?.url || form[s.id]?.caption).length / MEDIA_SLOTS.length) * 100}%`,
                              background: '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Dynamic media slot tabs */}
                {MEDIA_SLOTS.map((slot) => activeTab === slot.id && (
                  <Card key={slot.id}>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>{slot.icon}</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>{slot.label}</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        {slot.description}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '20px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                            Media URL {slot.id === 'intro' || slot.id === 'celebration' ? '(image or video)' : '(image)'}
                          </div>
                          <Input
                            value={form[slot.id]?.url || ''}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              [slot.id]: { ...prev[slot.id], url: e.target.value }
                            }))}
                            placeholder="https://..."
                            disabled={!userCanEditProject}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                            Caption / Description
                          </div>
                          <Input
                            value={form[slot.id]?.caption || ''}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              [slot.id]: { ...prev[slot.id], caption: e.target.value }
                            }))}
                            placeholder="Optional caption..."
                            disabled={!userCanEditProject}
                          />
                        </div>

                        {form[slot.id]?.url && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Preview</div>
                            <div style={{
                              border: '1px solid var(--app-border)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#f3f4f6',
                              maxWidth: '400px',
                            }}>
                              {(slot.id === 'intro' || slot.id === 'celebration') && form[slot.id]?.url?.includes('.mp4') ? (
                                <video
                                  src={form[slot.id].url}
                                  controls
                                  style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                />
                              ) : (
                                <img
                                  src={form[slot.id].url}
                                  alt={slot.label}
                                  style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        <div style={{
                          padding: '24px',
                          border: '2px dashed var(--app-border)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          opacity: userCanEditProject ? 1 : 0.5,
                        }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Upload {slot.label}</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                            Drag & drop or click to upload
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '8px' }}>
                            (File upload coming soon - use URL for now)
                          </div>
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">You don't have permission to edit this member's media.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {/* Identity Tab - Profile photo and user info */}
                {activeTab === 'identity' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>🪪</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>Identity</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Profile photo and personal information for this member.
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        {/* Profile Photo Section */}
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Profile Photo</div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{
                              width: '160px',
                              height: '160px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              backgroundColor: 'var(--app-surface-secondary)',
                              border: '2px solid var(--app-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {membership?.user?.avatar_url ? (
                                <img
                                  src={membership.user.avatar_url}
                                  alt={getUserDisplayName(membership)}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div style={{ fontSize: '48px', opacity: 0.3 }}>👤</div>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', opacity: 0.7 }}>
                                Photo URL (from user account)
                              </div>
                              <div style={{
                                padding: '10px 12px',
                                background: 'var(--app-surface-secondary)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                color: membership?.user?.avatar_url ? 'var(--app-text)' : 'var(--app-muted-text)',
                              }}>
                                {membership?.user?.avatar_url || 'No profile photo set'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* User Information Section */}
                        <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '20px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>User Information</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Name</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{getUserDisplayName(membership)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Email</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{membership?.user?.email || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>User ID</div>
                              <div style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.8 }}>{membership?.user?.id || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Membership ID</div>
                              <div style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.8 }}>{membership?.id || '—'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Role/Position Section */}
                        <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '20px', marginTop: '20px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Role & Position</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Role</div>
                              <Badge variant="default">{membership?.role || 'member'}</Badge>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Position</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                {(membership as any)?.metadata?.position || (membership as any)?.position || '—'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Jersey Number</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                {(membership as any)?.metadata?.jersey_number || (membership as any)?.jersey_number || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
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
      </div>

      {/* Mobile sticky action bar */}
      {!loading && !error && membership && userCanEditProject && (
        <div className="mobile-action-bar show-mobile-only">
          <Button
            variant="primary"
            onClick={save}
            disabled={saving}
            style={{ flex: 2 }}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!seasonKeyForLinks) return;
              navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
            }}
            style={{ flex: 1 }}
          >
            ← Squad
          </Button>
        </div>
      )}
    </AppShell>
  );
}
