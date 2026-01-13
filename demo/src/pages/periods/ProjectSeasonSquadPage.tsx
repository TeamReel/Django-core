import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader } from '@django-core/page-templates';

import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';

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

export default function ProjectSeasonSquadPage() {
  const navigate = useNavigate();
  const params = useParams();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

        const [orgRes, projectRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectSlugOrId)}/`, { credentials: 'include' }),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const orgJson = unwrap<Organisation>(await orgRes.json());
        const projectJson = unwrap<Project>(await projectRes.json());

        if (isCancelled) return;

        setOrganisation(orgJson);
        setProject(projectJson);

        if (isTeamRoute) {
          const clubRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubSlugOrId)}/`, { credentials: 'include' });
          if (clubRes.ok) {
            const clubJson = unwrap<Project>(await clubRes.json());
            if (!isCancelled) setClubProject(clubJson);
          }
        }

        // Resolve season UUID from URL param (UUID or slugified name)
        const periodsRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/?page_size=250&project_id=${encodeURIComponent(projectJson.id)}`,
          { credentials: 'include' }
        );
        if (!periodsRes.ok) throw new Error('Failed to load periods');

        const allPeriods = unwrapList(await periodsRes.json());
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

        // Season-scoped squad
        const membersRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectJson.id)}/members/?period=${encodeURIComponent(seasonUuid)}`,
          { credentials: 'include' }
        );
        if (membersRes.ok) {
          const rawMembers = await membersRes.json();
          if (!isCancelled) setMembers(unwrapList(rawMembers));
        }
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

    const seasonsCrumb = {
      label: 'Seasons',
      onClick: () => navigate(seasonsBasePath),
    };

    const seasonCrumb = season
      ? {
          label: season.name,
          onClick: () => navigate(`${seasonsBasePath}/${periodPathKey(season) || season.id}`),
        }
      : { label: 'Season' };

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: 'Federations', onClick: () => navigate('/federations') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      projectCrumb,
      seasonsCrumb,
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
      },
      { label: 'Squad', current: true },
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

  if (loading) {
    return (
      <AppShell>
        <PageContent>
          <LoadingState message="Loading squad..." />
        </PageContent>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageContent>
          <Alert variant="error">{error}</Alert>
        </PageContent>
      </AppShell>
    );
  }

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

  return (
    <AppShell>
      <div>
        <PageHeader
          title={title}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(`${seasonsBasePath}/${periodPathKey(season || {}) || resolvedSeasonId || effectiveSeasonId}`)}
                style={actionButtonStyle('neutral')}
              >
                Back to season
              </button>
            </div>
          }
        />

        <PageContent>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Players & Staff</h3>
                <Badge variant="info">{members.length} members</Badge>
              </div>
              <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
                Season-scoped roster (filtered by period).
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              <div className="overflow-x-auto">
                <Table style={compactTableStyle}>
                  <thead>
                    <tr>
                      <th style={compactThStyle}>Name</th>
                      <th style={compactThStyle}>Email</th>
                      <th style={compactThStyle}>Role</th>
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
                      const role = String(m.role || 'member');
                      const position = m.metadata?.position || '—';
                      const shirtNumber = m.metadata?.shirt_number ?? '';
                      const membershipId = m.id;

                      return (
                        <tr key={String(membershipId || user.id)}>
                          <td style={compactTextTdStyle}>{name}</td>
                          <td style={compactTextTdStyle}>{email}</td>
                          <td style={compactTdStyle}>
                            <Badge variant={role === 'admin' || role === 'manager' ? 'warning' : 'default'}>
                              {role}
                            </Badge>
                          </td>
                          <td style={compactTextTdStyle}>{position}</td>
                          <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                          <td style={compactTdStyle}>
                            <div style={compactActionsStyle}>
                              {orgSlugOrId && membershipId ? (
                                <button
                                  onClick={() => navigate(`/organisations/${orgSlugOrId}/members/${membershipId}`)}
                                  style={actionButtonStyle('primary')}
                                >
                                  View
                                </button>
                              ) : (
                                <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {members.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...compactTdStyle, textAlign: 'center', padding: '24px' }}>
                          No members found for this season.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </Card>
        </PageContent>
      </div>
    </AppShell>
  );
}
