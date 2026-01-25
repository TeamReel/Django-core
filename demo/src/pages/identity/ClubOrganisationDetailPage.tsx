import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';

import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';

type Organisation = {
  id: string;
  name: string;
  slug?: string;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

export default function ClubOrganisationDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Back-compat: older club detail pages used `people`/`users`.
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = new Set(['overview', 'hierarchy', 'teams', 'seasons', 'competitions', 'matches', 'members']);
    return allowed.has(normalized) ? normalized : 'overview';
  }, [location.search]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!orgSlugOrId || !clubSlugOrId) {
          throw new Error('Missing organisation or club identifier.');
        }

        const [orgRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, {
            credentials: 'include',
          }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          ),
        ]);

        if (!orgRes.ok) throw new Error(`Failed to load organisation (${orgRes.status})`);
        if (!clubRes.ok) throw new Error(`Failed to load club (${clubRes.status})`);

        const orgJson = await orgRes.json().catch(() => null);
        const clubJson = await clubRes.json().catch(() => null);

        const loadedOrg = unwrapEnvelope<Organisation>(orgJson);
        const loadedClub = unwrapEnvelope<Project>(clubJson);

        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load club');
        setOrg(null);
        setClub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orgSlugOrId, clubSlugOrId]);

  const orgIdForDirectoryLists = useMemo(() => {
    const id = String(org?.id || '').trim();
    return id;
  }, [org?.id]);

  const clubIdForDirectoryLists = useMemo(() => {
    const id = String(club?.id || '').trim();
    return id;
  }, [club?.id]);

  const backToOrgHref = useMemo(() => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return '/federations';

    // Mirror federation layout: go back to org page, clubs tab.
    const params = new URLSearchParams(location.search || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
  }, [location.search, org?.slug, orgSlugOrId]);

  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);

  useEffect(() => {
    if (!org || !club) return;
    if (!shouldResolveClub) return;
    const slug = String(club?.slug || '').trim();
    if (!slug) return;
    if (slug === clubSlugOrId) return;

    navigate(
      `/${encodeURIComponent(String(org?.slug || orgSlugOrId))}/${encodeURIComponent(slug)}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub]);

  if (loading) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">Loading club details...</div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org || !club) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Alert variant="error">{error || 'Club not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(backToOrgHref)}>
              Back
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  // If we're still on a numeric/UUID route, the redirect useEffect will replace the URL.

  const renderTabs = () => {
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'hierarchy', label: 'Hierarchy' },
      { id: 'teams', label: 'Teams' },
      { id: 'seasons', label: 'Seasons' },
      { id: 'competitions', label: 'Competitions' },
      { id: 'matches', label: 'Matches' },
      { id: 'members', label: 'Members' },
    ];

    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => {
          const selected = activeTabFromUrl === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className="app-unstyled-button"
              onClick={() => navigate(makeTabHref(t.id))}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--app-border)',
                background: selected ? 'var(--app-surface-2)' : 'var(--app-surface)',
                color: 'var(--app-text)',
                fontWeight: selected ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="club-detail-page">
        <PageHeader
          title={club.name}
          subtitle="Club overview"
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(backToOrgHref)}>
                Back
              </Button>
              {renderTabs()}
            </div>
          }
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('teams'))}>
                  <div className="text-sm font-medium text-gray-500">Teams</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('seasons'))}>
                  <div className="text-sm font-medium text-gray-500">Seasons</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('members'))}>
                  <div className="text-sm font-medium text-gray-500">Members</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('matches'))}>
                  <div className="text-sm font-medium text-gray-500">Matches</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
              </div>

              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Club Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-base text-gray-900 mt-1">{club?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Federation</div>
                    <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'hierarchy' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <div className="space-y-6">
              <Card>
                <div className="flex justify-between items-center" style={{ padding: 12 }}>
                  <h3 className="text-lg font-semibold">Teams</h3>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('teams'))}>
                    View Teams
                  </Button>
                </div>
              </Card>
              <TeamsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />

              <Card>
                <div className="flex justify-between items-center" style={{ padding: 12 }}>
                  <h3 className="text-lg font-semibold">Seasons</h3>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('seasons'))}>
                    View Seasons
                  </Button>
                </div>
              </Card>
              <SeasonsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
            </div>
          )}

          {activeTabFromUrl === 'teams' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'seasons' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'competitions' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'matches' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <MatchesList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'members' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}
        </PageContent>
      </div>
    </>
  );
}
