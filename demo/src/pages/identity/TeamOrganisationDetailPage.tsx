import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader } from '@django-core/page-templates';

import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';

import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { AssetsTab } from '../../components/AssetsTab';
import { KitsTab } from '../../components/KitsTab';
import { MemberMediaMatrix } from '../../components/MemberMediaMatrix';
import { AssetCompletionMatrix } from '../../components/AssetCompletionMatrix';

import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { TeamOverviewTab } from './TeamOverviewTab';
import { TeamHierarchyTab } from './TeamHierarchyTab';

/**
 * Lazy-loading wrapper for MemberMediaMatrix on the team page.
 * Fetches all project members when mounted (i.e. when media tab is active).
 */
function MediaMatrixLoader({ apiBaseUrl, teamId }: { apiBaseUrl: string; teamId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamId)}/members/?page_size=200`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (!cancelled) setMembers(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [apiBaseUrl, teamId]);

  return (
    <MemberMediaMatrix
      members={members}
      membersLoading={loading}
      membersError={error}
    />
  );
}

export default function TeamOrganisationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    org, club, team, setTeam, loading, error,
    orgIdForDirectoryLists, clubIdForDirectoryLists, teamIdForDirectoryLists,
    orgSlugForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes, teamKeyForRoutes,
    activatingContext, setActivatingContext,
    activeContextState, setActiveContextState,
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    brandProfileId,
    clubTeamsForSwitcherLoading,
    teamBreadcrumbOptions, handleTeamSwitch,
    backToClubHref, federationClubsHref,
    apiBaseUrl, isPlayer,
  } = useTeamDetailData();

  // ── Tab logic ──
  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = isPlayer
      ? new Set(['hierarchy', 'matches'])
      : new Set([
          'overview', 'hierarchy', 'seasons', 'competitions', 'matches',
          'members', 'media', 'balance', 'transactions', 'assets', 'kits',
        ]);
    return allowed.has(normalized) ? normalized : (isPlayer ? 'hierarchy' : 'overview');
  }, [location.search, isPlayer]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  // ── Tab data (hierarchy + overview members) ──
  const tabData = useTeamTabData({
    activeTabFromUrl,
    apiBaseUrl,
    teamIdForDirectoryLists,
    clubIdForDirectoryLists,
    orgSlugForDirectoryLists,
  });

  if (loading) {
    return (
      <div className="p-6 team-detail-page">
        <div>
          <PageHeader title="Team" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">Loading team details...</div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org || !club || !team) {
    return (
      <div className="p-6 team-detail-page">
        <div>
          <PageHeader title="Team" />
          <PageContent>
            <Alert variant="error">{error || 'Team not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(backToClubHref)}>
              Back
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="team-detail-page">
        <PageHeader
          title={team.name}
          subtitle={`${(team as any)?.team_type === 'legends' ? 'Legends' : 'Regulier'} Team`}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: org?.name || 'Federation', onClick: () => navigate(federationClubsHref) },
            { label: club?.name || 'Club', onClick: () => navigate(backToClubHref) },
            {
              label: (
                <BreadcrumbContextSwitcher
                  currentId={String(team.id)}
                  options={teamBreadcrumbOptions}
                  onSelect={handleTeamSwitch}
                  hasDropdown={!clubTeamsForSwitcherLoading && teamBreadcrumbOptions.length > 1}
                  type="project"
                />
              ),
              current: true,
            },
          ]}
          actions={
            <div className="flex-row gap-8 flex-wrap">
              {!isPlayer && (
              <select
                value={(team as any)?.team_type || 'regular'}
                onChange={async (e) => {
                  const newType = e.target.value;
                  try {
                    const res = await fetch(
                      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                        credentials: 'include',
                        body: JSON.stringify({ team_type: newType }),
                      },
                    );
                    if (!res.ok) throw new Error('Failed to update team type');
                    setTeam((prev: any) => prev ? { ...prev, team_type: newType } : prev);
                  } catch (err) {
                    console.error('Failed to update team type:', err);
                    alert('Kon team type niet opslaan');
                  }
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '4px 10px',
                  background: (team as any)?.team_type === 'legends' ? '#fffbeb' : 'white',
                  cursor: 'pointer',
                  color: (team as any)?.team_type === 'legends' ? '#d97706' : '#374151',
                }}
              >
                <option value="regular">Regulier</option>
                <option value="legends">Legends</option>
              </select>
              )}
              {(() => {
                const isActive = !!team && String(activeContextState?.team?.id ?? '') === String(team.id ?? '');
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!team || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('team', String(team.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    title={isActive ? 'This team is already your active context' : 'Set this team as your active context'}
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      cursor: (activatingContext || isActive) ? 'not-allowed' : 'pointer',
                      opacity: (activatingContext || isActive) ? 0.8 : 1,
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}

              <Button variant="secondary" size="sm" onClick={() => navigate(backToClubHref)}>
                Back
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectDetailModalOpen(true)}>
                View
              </Button>
              {!isPlayer && (
              <Button variant="secondary" size="sm" onClick={() => setIsProjectEditModalOpen(true)}>
                Edit
              </Button>
              )}
              {!isPlayer && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!team) return;
                  if (!window.confirm(`Are you sure you want to delete team ${team.name}?`)) return;
                  try {
                    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                      },
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('Failed to delete team');
                    navigate(backToClubHref);
                  } catch (e) {
                    console.error('Delete failed:', e);
                    alert('Failed to delete team');
                  }
                }}
                style={{ color: '#dc2626' }}
              >
                Delete
              </Button>
              )}
            </div>
          }
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            ...(!isPlayer ? [{ id: 'overview', label: 'Overview' }] : []),
            { id: 'hierarchy', label: 'Hierarchy' },
            ...(!isPlayer ? [{ id: 'seasons', label: 'Seasons' }] : []),
            ...(!isPlayer ? [{ id: 'competitions', label: 'Competitions' }] : []),
            { id: 'matches', label: 'Matches' },
            ...(!isPlayer ? [{ id: 'members', label: 'Squad' }] : []),
            ...(!isPlayer ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer ? [{ id: 'balance', label: 'Balance' }] : []),
            ...(!isPlayer ? [{ id: 'transactions', label: 'Transactions' }] : []),
            ...(!isPlayer ? [{ id: 'assets', label: 'Assets' }] : []),
            ...(!isPlayer ? [{ id: 'kits', label: 'Kits' }] : []),
          ]}
          activeTab={activeTabFromUrl}
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <TeamOverviewTab
              hierarchySeasons={tabData.hierarchySeasons}
              hierarchyCompetitionsBySeasonId={tabData.hierarchyCompetitionsBySeasonId}
              hierarchyMatchesCountBySeasonId={tabData.hierarchyMatchesCountBySeasonId}
              hierarchyLoading={tabData.hierarchyLoading}
              hierarchyError={tabData.hierarchyError}
              overviewMembers={tabData.overviewMembers}
              overviewMembersCount={tabData.overviewMembersCount}
              overviewMembersLoading={tabData.overviewMembersLoading}
              overviewMembersError={tabData.overviewMembersError}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              teamKeyForRoutes={teamKeyForRoutes}
              team={team}
              club={club}
              org={org}
              makeTabHref={makeTabHref}
            />
          )}

          {activeTabFromUrl === 'hierarchy' && teamIdForDirectoryLists && (
            <TeamHierarchyTab
              hierarchySeasons={tabData.hierarchySeasons}
              hierarchyCompetitionsBySeasonId={tabData.hierarchyCompetitionsBySeasonId}
              hierarchyMatchesCountBySeasonId={tabData.hierarchyMatchesCountBySeasonId}
              hierarchyMatchesCountByCompetitionId={tabData.hierarchyMatchesCountByCompetitionId}
              hierarchyLoading={tabData.hierarchyLoading}
              hierarchyError={tabData.hierarchyError}
              hierarchySearch={tabData.hierarchySearch}
              setHierarchySearch={tabData.setHierarchySearch}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              teamKeyForRoutes={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'seasons' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <SeasonsList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <CompetitionsList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <MatchesList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <UsersList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'balance' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'transactions' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="transactions" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && team && org && (
            <div className="space-y-6">
              <AssetCompletionMatrix
                projectId={team.slug || String(team.id)}
                entityName={team.name}
                title="Asset Completion Matrix"
              />

              <Card>
                <div style={{ padding: '16px 16px 0 16px' }}>
                  <div className="flex-row gap-12 mb-4">
                    <span className="fs-24">👥</span>
                    <h3 className="m-0 fs-16 fw-600">Member Media Matrix</h3>
                  </div>
                </div>
                <div className="p-16">
                  <MediaMatrixLoader
                    apiBaseUrl={apiBaseUrl}
                    teamId={team.slug || String(team.id)}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'assets' && team && org && (
            <AssetsTab
              level="team"
              organisationId={String(org.id)}
              projectId={String(team.id)}
              parentProjectId={club ? String(club.id) : undefined}
              entityName={team.name}
              sponsorMode={((team as any)?.metadata?.sponsor_mode as 'club' | 'custom') || 'club'}
              onSponsorModeChange={async (mode) => {
                if (!team) return;
                const csrfToken = getCsrfToken();
                const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}) },
                  credentials: 'include',
                  body: JSON.stringify({ metadata: { ...((team as any)?.metadata || {}), sponsor_mode: mode } }),
                });
                if (res.ok) {
                  const raw = await res.json().catch(() => null);
                  const updated: any = (raw?.data ?? raw) as any;
                  setTeam((prev) => ({ ...(prev as any), ...(updated as any) }));
                }
              }}
            />
          )}

          {activeTabFromUrl === 'kits' && team && org && (
            <KitsTab
              projectSlug={team.slug || String(team.id)}
              projectName={team.name}
              brandProfileId={brandProfileId}
              orgId={String(org.id)}
            />
          )}
        </PageContent>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={team}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="team"
        entityId={team?.slug || team?.id || ''}
        entityName={team?.name}
        organisationId={String(org?.id || '')}
        projectId={team?.slug || team?.id}
        initialEntityData={team ? {
          id: String(team.id),
          name: team.name || '',
          slug: team.slug,
          description: (team as any).description,
          is_active: (team as any).is_active ?? true,
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
