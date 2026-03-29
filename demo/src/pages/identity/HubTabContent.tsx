import React from 'react';
import { Alert } from '@django-core/design-system';
import { HubOverviewTab } from './HubOverviewTab';
import { HubWedstrijdenTab } from './HubWedstrijdenTab';
import { HubSelectieTab } from './HubSelectieTab';
import { HubBeheerTab } from './HubBeheerTab';
import { HubClubTab } from './HubClubTab';
import { AssetsTab } from '../../components/AssetsTab';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './MyTeamHubPage.module.css';
import { projectsApi } from '../../api';

interface HubTabContentProps {
  activeTab: string;
  seasonCtx: any;
  d: any;
  team: any;
  isAdmin: boolean;
  isSupporter: boolean;
  memberAssetSummary: any;
  creditsLabel: any;
  handleSelectMatch: any;
  navigateToTab: any;
  setActiveAssetSheet: any;
  setCreditsSheetOpen: any;
  setSelectedMember: any;
}

export const HubTabContent: React.FC<HubTabContentProps> = ({
  activeTab,
  seasonCtx,
  d,
  team,
  isAdmin,
  isSupporter,
  memberAssetSummary,
  creditsLabel,
  handleSelectMatch,
  navigateToTab,
  setActiveAssetSheet,
  setCreditsSheetOpen,
  setSelectedMember,
}) => {
  return (
    <div className={s.tabContent}>
          {d.error && <Alert variant="error">{d.error}</Alert>}

          {activeTab === 'overview' && (
            <HubOverviewTab
              matches={d.matches as MatchRecord[]}
              members={d.members as SquadMember[]}
              competitionsCount={seasonCtx.competitions.length}
              org={d.org}
              club={team.club}
              season={seasonCtx.season}
              batchBrandKits={d.batchBrandKits}
              brandSponsorUrl={d.brandSponsorUrl}
              memberAssetSummary={memberAssetSummary}
              isAdmin={isAdmin}
              userCanEditProject={d.userCanEditProject}
              orgIdForDirectoryLists={team.orgIdForDirectoryLists}
              teamIdForDirectoryLists={team.teamIdForDirectoryLists}
              creditsLabel={creditsLabel}
              matchDisplayTitle={d.matchDisplayTitle}
              onMatchTap={handleSelectMatch}
              onNavigateToTab={navigateToTab}
              onAssetSheetOpen={setActiveAssetSheet}
              onCreditsSheetOpen={() => setCreditsSheetOpen(true)}
            />
          )}

          {activeTab === 'wedstrijden' && (
            <HubWedstrijdenTab
              matches={d.matches}
              matchesLoading={d.matchesLoading}
              isTeamRoute={d.isTeamRoute}
              seasonsBasePath={d.seasonsBasePath}
              seasonPathKey={d.seasonPathKey}
              canManageContent={isAdmin || d.userCanEditProject}
              matchDisplayTitle={d.matchDisplayTitle}
              setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
              setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
              onMatchTap={handleSelectMatch}
              seasonName={(d.season?.name || seasonCtx.season?.name) as string | undefined}
              competitions={seasonCtx.competitions}
            />
          )}

          {activeTab === 'assets' && !isSupporter && team.org && team.team && (
            <AssetsTab
              level="team"
              organisationId={team.orgIdForDirectoryLists}
              projectId={team.teamIdForDirectoryLists}
              parentProjectId={team.clubIdForDirectoryLists || undefined}
              entityName={team.team.name}
            />
          )}

          {activeTab === 'selectie' && !isSupporter && (
            <HubSelectieTab
              members={d.members as SquadMember[]}
              membersLoading={d.membersLoading}
              membersError={d.membersError}
              isAdmin={isAdmin}
              memberDetailHref={(mid: string) => {
                const base = d.memberDetailHref(mid);
                return base ? `${base}?from=selectie` : base;
              }}
              teamRoster={d.teamRoster as SquadMember[] | undefined}
              teamRosterLoading={d.teamRosterLoading}
              assignUsersToSeasonSquad={d.assignUsersToSeasonSquad}
              removeFromSquad={d.unassignMembershipsFromSeasonSquad
                ? (id: string) => d.unassignMembershipsFromSeasonSquad([id])
                : undefined}
              onRolesChange={isAdmin && d.project?.id ? async (mid, roles) => {
                const member = (d.members as SquadMember[]).find((m) => String(m.id) === mid);
                const userId = Number(member?.user?.id);
                if (!userId) return;
                const prevDirect = (member as Record<string, unknown>)?.functional_roles;
                const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: unknown) => String(r || '').trim()).filter(Boolean) : [];
                const prevSet = new Set(prevRoles);
                const nextSet = new Set(roles);
                const toAdd = roles.filter((r) => !prevSet.has(r));
                const toRemove = prevRoles.filter((r) => !nextSet.has(r));
                if (toRemove.length) await projectsApi.unassignFunctionalRoles(d.project!.id, { user_id: userId, roles: toRemove });
                if (toAdd.length) await projectsApi.assignFunctionalRoles(d.project!.id, { user_id: userId, roles: toAdd });
                d.setMembersReloadToken((t: number) => t + 1);
              } : undefined}
              onMemberTap={setSelectedMember}
            />
          )}

          {activeTab === 'beheer' && isAdmin && (
            <HubBeheerTab
              competitions={d.competitions}
              competitionsLoading={d.competitionsLoading}
              userCanEditProject={d.userCanEditProject}
              userCanDeleteProject={d.userCanDeleteProject}
              apiBaseUrl={d.apiBaseUrl}
              getMatchCountForCompetition={d.getMatchCountForCompetition}
              getCompetitionParticipantsCount={d.getCompetitionParticipantsCount}
              setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
              setSelectedDetailPeriod={d.setSelectedDetailPeriod}
              setIsPeriodDetailModalOpen={d.setIsPeriodDetailModalOpen}
              setSelectedEditPeriod={d.setSelectedEditPeriod}
              setIsPeriodEditModalOpen={d.setIsPeriodEditModalOpen}
              setCompetitions={d.setCompetitions}
              season={d.season}
              project={d.project}
              org={d.org}
              orgSlugOrId={d.orgSlugOrId}
              club={d.club}
              setSeason={d.setSeason}
              members={d.members as SquadMember[]}
              memberDetailHref={d.memberDetailHref}
              onMemberTap={setSelectedMember}
              resolvedSeasonId={d.resolvedSeasonId}
              effectiveSeasonId={d.effectiveSeasonId}
              pushToast={d.pushToast}
              teamOrg={team.org}
              teamProject={team.team}
              setTeam={team.setTeam}
              brandProfileId={team.brandProfileId ?? undefined}
              teamClub={team.club}
              organisationId={team.orgIdForDirectoryLists}
              teamId={team.teamIdForDirectoryLists}
            />
          )}

          {activeTab === 'club' && isAdmin && team.org && team.club && (
            <HubClubTab
              org={team.org}
              club={team.club}
              orgSlug={team.orgSlugForDirectoryLists}
              clubId={team.clubIdForDirectoryLists}
              orgKeyForRoutes={team.orgKeyForRoutes}
              clubKeyForRoutes={team.clubKeyForRoutes}
              brandProfileId={team.brandProfileId}
              apiBaseUrl={team.apiBaseUrl}
            />
          )}
        </div>
  );
};
