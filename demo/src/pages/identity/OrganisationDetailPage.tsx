import React from 'react';
import {
  Button,
  Card,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Organisation } from '../../types';
import { AuditLogTable } from '../../components/AuditLog/AuditLogTable';
import { PolicyList } from '../../components/Organisations/PolicyList';
import { ClubsList } from './directory/ClubsList';
import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import MobileTabBar from '../../components/MobileTabBar';
import ContentAvailabilityCard from '../../components/FeatureFlags/ContentAvailabilityCard';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';
import { OrgOverviewTab } from './OrgOverviewTab';
import { OrgHierarchyTab } from './OrgHierarchyTab';
import { OrgModals } from './OrgModals';
import { useOrgData } from './useOrgData';

/**
 * T007 - Organisation Detail Page
 *
 * Purpose: Display organisation summary with members, projects, and credits snippet
 * - Shows org metadata, member count, project list
 * - Links to projects and audit log
 * - Permission-aware: viewer sees read-only view
 */
export const OrganisationDetailPage: React.FC = () => {
  const d = useOrgData();

  if (d.loading) {
    return (
      <div className="p-6 org-detail-page">
        <div>
          <PageHeader title="Organisation Details" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading organisation details...
              </div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (d.error || !d.org) {
    return (
      <div className="p-6 org-detail-page">
        <div>
          <PageHeader title="Organisation Details" />
          <PageContent>
            <Alert variant="error" data-testid="org-detail-error">
              {d.error || 'Organisation not found'}
            </Alert>
            <Button variant="secondary" onClick={() => d.navigate('/federations')}>
              Back to Organisations
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  const org = d.org;
  const isActive =
    String(d.activeContext?.organisation?.id ?? '') === String((org as any)?.id ?? '') ||
    d.activeContext?.organisation?.slug === (org as any)?.slug;

  return (
    <>
      <div className="org-detail-page">
        <PageHeader
          title={org.name}
          subtitle="Federation overview"
          actions={
            <div className="flex-row flex-wrap gap-8">
              <button
                onClick={() => { if (!isActive) void d.handleActivateContext(); }}
                disabled={d.activatingContext || isActive}
                className="rounded-4 fs-12"
                style={{
                  padding: '6px 12px',
                  border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                  backgroundColor: isActive ? '#dcfce7' : 'var(--app-surface-2)',
                  color: isActive ? '#166534' : 'var(--app-text)',
                  cursor: (d.activatingContext || isActive) ? 'not-allowed' : 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  opacity: (d.activatingContext || isActive) ? 0.8 : 1,
                }}
                title={isActive ? 'This federation is already your active context' : 'Set this federation as your active context'}
              >
                {isActive ? '✓ Active Context' : 'Make active'}
              </button>
              <Button variant="secondary" size="sm" onClick={() => d.navigate('/federations')}>
                Back
              </Button>
              <Button variant="secondary" size="sm" onClick={() => d.setIsOrgDetailModalOpen(true)}>
                View
              </Button>
              {d.userCanEditOrg && (
                <Button variant="secondary" size="sm" onClick={() => d.setIsOrgEditModalOpen(true)}>
                  Edit
                </Button>
              )}
              {d.userCanEditOrg && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={d.handleDelete}
                  disabled={d.deleteLoading}
                >
                  {d.deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          }
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'clubs', label: 'Clubs' },
            { id: 'teams', label: 'Teams' },
            { id: 'seasons', label: 'Seasons' },
            { id: 'competitions', label: 'Competitions' },
            { id: 'matches', label: 'Matches' },
            { id: 'users', label: 'Users' },
            { id: 'identity', label: 'Identity' },
            { id: 'settings', label: 'Settings' },
          ]}
          activeTab={d.activeTab}
        />

        <PageContent>
          {d.activeTab === 'overview' && (
            <OrgOverviewTab
              org={org}
              clubs={d.clubs}
              teams={d.teams}
              members={d.members}
              clubsCount={d.clubsCount}
              clubsLoading={d.clubsLoading}
              teamsCount={d.teamsCount}
              teamsLoading={d.teamsLoading}
              membersLoading={d.membersLoading}
              matchesCount={d.matchesCount}
              scheduledMatches={d.scheduledMatches}
              scheduledMatchesLoading={d.scheduledMatchesLoading}
              navigate={d.navigate}
              makeTabHref={d.makeTabHref}
              getBestMatchDetailPath={d.getBestMatchDetailPath}
              currentOrgSlug={d.currentOrgSlug}
              id={d.id}
              permissionContext={d.permissionContext}
              setIsOrgEditModalOpen={d.setIsOrgEditModalOpen}
            />
          )}

          {d.activeTab === 'hierarchy' && (
            <OrgHierarchyTab
              hierarchySearch={d.hierarchySearch}
              setHierarchySearch={d.setHierarchySearch}
              teams={d.teams}
              clubsForHierarchy={d.clubsForHierarchy}
              membershipUserCounts={d.membershipUserCounts}
              teamSeasonsCountById={d.teamSeasonsCountById}
              teamCompetitionsCountById={d.teamCompetitionsCountById}
              teamMatchesCountById={d.teamMatchesCountById}
              teamsLoading={d.teamsLoading}
              orgSlugOrId={d.orgSlugOrId}
              currentOrgSlug={d.currentOrgSlug}
              id={d.id}
              navigate={d.navigate}
            />
          )}

          {d.activeTab === 'audit' && (
            <Card>
              {d.isSuperAdmin || d.userCanEditOrg ? (
                <AuditLogTable organisationId={String(d.currentOrgId || org?.id || '')} limit={50} />
              ) : (
                <Alert variant="error">You do not have access to the audit log for this organisation.</Alert>
              )}
            </Card>
          )}

          {d.activeTab === 'governance' && (
            <Card>
              {d.isSuperAdmin || d.userCanEditOrg ? (
                <PolicyList organisationId={String(d.currentOrgId || org?.id || '')} />
              ) : (
                <Alert variant="error">You do not have access to governance policies for this organisation.</Alert>
              )}
            </Card>
          )}

          {d.activeTab === 'operations' && (
            <Card>
              {d.isSuperAdmin ? (
                <div className="p-12 text-muted">
                  Operations tooling is not wired yet for this demo.
                </div>
              ) : (
                <Alert variant="error">You do not have access to operations for this organisation.</Alert>
              )}
            </Card>
          )}

          {d.activeTab === 'clubs' && d.orgIdForDirectoryLists && (
            <ClubsList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'teams' && d.orgIdForDirectoryLists && (
            <TeamsList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'seasons' && d.orgIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'competitions' && d.orgIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'matches' && d.orgIdForDirectoryLists && (
            <MatchesList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'users' && d.orgIdForDirectoryLists && (
            <UsersList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'identity' && org && (
            <BrandIdentityPage
              organisationId={org.slug || String(org.id)}
              organisationName={org.name}
            />
          )}

          {d.activeTab === 'settings' && org && (
            <ContentAvailabilityCard
              scopeType="ORGANISATION"
              organisationId={String(org.id)}
              scopeName={org.name}
            />
          )}
        </PageContent>

        <OrgModals
          org={org}
          currentOrgSlug={d.currentOrgSlug}
          currentOrgId={d.currentOrgId}
          permissionContext={d.permissionContext}
          getApiV1BaseUrl={d.getApiV1BaseUrl}
          getCsrfToken={d.getCsrfToken}
          fetchClubsPage={d.fetchClubsPage}
          fetchTeamsForOrg={d.fetchTeamsForOrg}
          fetchMembers={d.fetchMembers}
          fetchFederationCounts={d.fetchFederationCounts}
          recomputePeriodCounts={d.recomputePeriodCounts}
          saveProjectEdits={d.saveProjectEdits}
          setClubs={d.setClubs}
          setClubsPage={d.setClubsPage}
          setClubsCount={d.setClubsCount}
          setAllClubsForTeams={d.setAllClubsForTeams}
          setTeams={d.setTeams}
          setTeamsCount={d.setTeamsCount}
          setOrgPeriods={d.setOrgPeriods}
          setFederationMatches={d.setFederationMatches}
          setMatchesCount={d.setMatchesCount}
          setMembers={d.setMembers as any}
          isClubModalOpen={d.isClubModalOpen}
          setIsClubModalOpen={d.setIsClubModalOpen}
          selectedClub={d.selectedClub}
          isDetailModalOpen={d.isDetailModalOpen}
          setIsDetailModalOpen={d.setIsDetailModalOpen}
          detailProject={d.detailProject}
          isEditModalOpen={d.isEditModalOpen}
          setIsEditModalOpen={d.setIsEditModalOpen}
          selectedEditProject={d.selectedEditProject}
          isCreateClubModalOpen={d.isCreateClubModalOpen}
          setIsCreateClubModalOpen={d.setIsCreateClubModalOpen}
          isCreateTeamModalOpen={d.isCreateTeamModalOpen}
          setIsCreateTeamModalOpen={d.setIsCreateTeamModalOpen}
          teamClubFilterId={d.teamClubFilterId}
          isAddMemberModalOpen={d.isAddMemberModalOpen}
          setIsAddMemberModalOpen={d.setIsAddMemberModalOpen}
          isCreateSeasonModalOpen={d.isCreateSeasonModalOpen}
          setIsCreateSeasonModalOpen={d.setIsCreateSeasonModalOpen}
          seasonClubFilterId={d.seasonClubFilterId}
          seasonTeamFilterId={d.seasonTeamFilterId}
          isCreateCompetitionModalOpen={d.isCreateCompetitionModalOpen}
          setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
          compClubFilterId={d.compClubFilterId}
          compTeamFilterId={d.compTeamFilterId}
          isCreateMatchModalOpen={d.isCreateMatchModalOpen}
          setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
          matchClubFilterId={d.matchClubFilterId}
          matchTeamFilterId={d.matchTeamFilterId}
          isEditMemberRoleModalOpen={d.isEditMemberRoleModalOpen}
          setIsEditMemberRoleModalOpen={d.setIsEditMemberRoleModalOpen}
          editingMember={d.editingMember}
          setEditingMember={d.setEditingMember}
          isOrgDetailModalOpen={d.isOrgDetailModalOpen}
          setIsOrgDetailModalOpen={d.setIsOrgDetailModalOpen}
          isOrgEditModalOpen={d.isOrgEditModalOpen}
          setIsOrgEditModalOpen={d.setIsOrgEditModalOpen}
          detailUser={d.detailUser}
          isUserDetailModalOpen={d.isUserDetailModalOpen}
          setIsUserDetailModalOpen={d.setIsUserDetailModalOpen}
          createModalOrganisations={d.createModalOrganisations}
          createModalClubs={d.createModalClubs}
          teams={d.teams}
        />
      </div>
    </>
  );
};

export default OrganisationDetailPage;
