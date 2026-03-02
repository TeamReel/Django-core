import React from 'react';
import { Alert, Button, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader } from '@django-core/page-templates';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';

import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';
import ClubAssetsTab from './detail/ClubAssetsTab';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import ContentAvailabilityCard from '../../components/FeatureFlags/ContentAvailabilityCard';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';
import { ClubOverviewTab } from './ClubOverviewTab';
import { ClubHierarchyTab } from './ClubHierarchyTab';
import { AssetsTab } from '../../components/AssetsTab';
import { AssetCompletionMatrix } from '../../components/AssetCompletionMatrix';
import { ClubKitsTab } from './ClubKitsTab';
import { getCsrfToken } from './clubOrgDetailHelpers';
import { useClubOrgDetailData } from './useClubOrgDetailData';

/* ═══════════════════════════════════════════════════════════════
   ClubOrganisationDetailPage  (thin JSX shell)
   All state / effects / computed values live in useClubOrgDetailData.
   ═══════════════════════════════════════════════════════════════ */

export default function ClubOrganisationDetailPage() {
  const {
    org, club, loading, error, navigate, apiBaseUrl,
    activeContext, setActiveContextState, activatingContext, setActivatingContext,
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    activeTabFromUrl, makeTabHref,
    orgIdForDirectoryLists, orgSlugForDirectoryLists,
    clubIdForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes,
    backToOrgHref,
    clubBreadcrumbOptions, orgClubsForSwitcherLoading, handleClubSwitch,
    overviewLoading, overviewError, overviewTeams, overviewSeasons, overviewMembers, overviewCounts,
    hierarchySearch, setHierarchySearch,
    hierarchyTeams, hierarchySeasonsByTeamId,
    hierarchyCompetitionsCountByTeamId, hierarchyMatchesCountByTeamId,
    hierarchyCompetitionsCountBySeasonId, hierarchyMatchesCountBySeasonId,
    hierarchyMembersCountByTeamId, hierarchyMembersCountForClub,
    hierarchyLoading, hierarchyError,
    brandLogoUrl, brandProfileId,
  } = useClubOrgDetailData();

  // ── Loading state ──
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

  // ── Error state ──
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

  const clubDefaultLocation = String((club as any)?.metadata?.identity?.default_location || '').trim();

  return (
    <>
      <div className="club-detail-page">
        <PageHeader
          title={club.name}
          subtitle={clubDefaultLocation ? `Club overview \u2022 Location: ${clubDefaultLocation}` : 'Club overview \u2022 Location: \u2014'}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: org?.name || 'Federation', onClick: () => navigate(backToOrgHref) },
            {
              label: (
                <BreadcrumbContextSwitcher
                  currentId={String(club.id)}
                  options={clubBreadcrumbOptions}
                  onSelect={handleClubSwitch}
                  hasDropdown={!orgClubsForSwitcherLoading && clubBreadcrumbOptions.length > 1}
                  type="project"
                />
              ),
              current: true,
            },
          ]}
          actions={
            <div className="flex-row flex-wrap gap-8">
              {(() => {
                const isActive = club && activeContext?.club && (
                  String(activeContext.club.id) === String(club.id) ||
                  activeContext.club.slug === club.slug
                );
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!club || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('club', String(club.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } catch (err) {
                        console.error('Failed to set active context:', err);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      fontWeight: isActive ? 600 : undefined,
                      opacity: activatingContext || isActive ? 0.8 : 1,
                    }}
                  >
                    {isActive ? '\u2713 Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button variant="secondary" size="sm" onClick={() => navigate(backToOrgHref)}>Back</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectDetailModalOpen(true)}>View</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectEditModalOpen(true)}>Edit</Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!club) return;
                  if (!window.confirm(`Are you sure you want to delete club ${club.name}?`)) return;
                  try {
                    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('Failed to delete club');
                    navigate(backToOrgHref);
                  } catch (e) {
                    console.error('Delete failed:', e);
                    alert('Failed to delete club');
                  }
                }}
                style={{ color: '#dc2626' }}
              >
                Delete
              </Button>
            </div>
          }
        />

        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'teams', label: 'Teams' },
            { id: 'seasons', label: 'Seasons' },
            { id: 'competitions', label: 'Competitions' },
            { id: 'matches', label: 'Matches' },
            { id: 'members', label: 'Members' },
            { id: 'media', label: 'Media' },
            { id: 'assets', label: 'Assets' },
            { id: 'balance', label: 'Balance' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'identity', label: 'Identity' },
            { id: 'kits', label: 'Kits' },
            { id: 'settings', label: 'Settings' },
          ]}
          activeTab={activeTabFromUrl}
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <ClubOverviewTab
              club={club} org={org}
              overviewError={overviewError} overviewLoading={overviewLoading}
              overviewTeams={overviewTeams} overviewSeasons={overviewSeasons}
              overviewMembers={overviewMembers} overviewCounts={overviewCounts}
              orgKeyForRoutes={orgKeyForRoutes} clubKeyForRoutes={clubKeyForRoutes}
              navigate={navigate} makeTabHref={makeTabHref}
            />
          )}

          {activeTabFromUrl === 'hierarchy' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <ClubHierarchyTab
              club={club} orgKeyForRoutes={orgKeyForRoutes} clubKeyForRoutes={clubKeyForRoutes}
              hierarchySearch={hierarchySearch} setHierarchySearch={setHierarchySearch}
              hierarchyTeams={hierarchyTeams} hierarchySeasonsByTeamId={hierarchySeasonsByTeamId}
              hierarchyCompetitionsCountByTeamId={hierarchyCompetitionsCountByTeamId}
              hierarchyMatchesCountByTeamId={hierarchyMatchesCountByTeamId}
              hierarchyCompetitionsCountBySeasonId={hierarchyCompetitionsCountBySeasonId}
              hierarchyMatchesCountBySeasonId={hierarchyMatchesCountBySeasonId}
              hierarchyMembersCountByTeamId={hierarchyMembersCountByTeamId}
              hierarchyMembersCountForClub={hierarchyMembersCountForClub}
              hierarchyLoading={hierarchyLoading} hierarchyError={hierarchyError}
              navigate={navigate}
            />
          )}

          {activeTabFromUrl === 'teams' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'seasons' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <MatchesList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && club && orgIdForDirectoryLists && (
            <div className="space-y-6">
              <AssetCompletionMatrix
                projectId={club.slug || String(club.id)}
                entityName={club.name} title="Asset Completion Matrix"
              />
            </div>
          )}

          {activeTabFromUrl === 'assets' && club && orgIdForDirectoryLists && (
            <div className="space-y-6">
              <AssetsTab level="club" organisationId={String(orgIdForDirectoryLists)} projectId={club.slug || String(club.id)} entityName={club.name} />
              <ClubAssetsTab clubId={String(club.id)} clubName={club.name} clubMetadata={(club as any)?.metadata || {}} onAssetsUpdated={() => { window.location.reload(); }} />
            </div>
          )}

          {activeTabFromUrl === 'balance' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'transactions' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="transactions" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'identity' && club && orgIdForDirectoryLists && (
            <BrandIdentityPage projectId={club.slug || String(club.id)} projectName={club.name} />
          )}

          {activeTabFromUrl === 'kits' && club && orgIdForDirectoryLists && (
            <ClubKitsTab club={club} apiBaseUrl={apiBaseUrl} brandProfileId={brandProfileId} orgId={String(orgIdForDirectoryLists)} />
          )}

          {activeTabFromUrl === 'settings' && club && orgIdForDirectoryLists && (
            <ContentAvailabilityCard scopeType="PROJECT" organisationId={String(orgIdForDirectoryLists)} projectId={String(club.id)} scopeName={club.name} />
          )}
        </PageContent>
      </div>

      <ProjectDetailModal opened={isProjectDetailModalOpen} onClose={() => setIsProjectDetailModalOpen(false)} project={club} />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="club"
        entityId={club?.slug || club?.id || ''}
        entityName={club?.name}
        organisationId={String(org?.id || '')}
        projectId={club?.slug || club?.id}
        initialEntityData={club ? {
          id: String(club.id), name: club.name || '', slug: club.slug,
          description: (club as any).description, is_active: (club as any).is_active ?? true,
          metadata: (club as any).metadata || {},
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
