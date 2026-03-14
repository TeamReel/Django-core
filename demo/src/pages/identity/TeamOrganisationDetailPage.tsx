import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { useUserRole } from '../../components/PermissionGuards';

import TeamCreditsTab from './detail/TeamCreditsTab';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { useTeamDetailData } from './useTeamDetailData';
import type { Project } from './teamDetailTypes';
import { useTeamTabData } from './useTeamTabData';
import { TeamOverviewTab } from './TeamOverviewTab';
import { TeamHierarchyTab } from './TeamHierarchyTab';
import { TeamSelectieTab } from './TeamSelectieTab';
import { TeamMediaTab } from './TeamMediaTab';
import { TeamPageHeader } from './TeamPageHeader';
import { IdentitySubtab } from './IdentitySubtab';
import s from './TeamOrganisationDetailPage.module.css';
import { routes } from '../../routes';

export default function TeamOrganisationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { isAdmin: isGlobalAdmin } = useUserRole();

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
    refetch,
  } = useTeamDetailData();

  // ── Stack navigation: back arrow → club ──
  useSetBackNavigation({ label: club?.name || 'Club', path: backToClubHref });

  // ── Tab logic ──
  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const normalized = tab === 'people' || tab === 'users' ? 'members'
      : (tab === 'balance' || tab === 'transactions') ? 'credits'
      : (tab === 'seasons' || tab === 'competitions' || tab === 'matches') ? 'hierarchy'
      : (tab === 'assets' || tab === 'kits') ? 'identity'
      : tab;
    const allowed = isPlayer
      ? new Set(['overview', 'hierarchy', 'members'])
      : new Set([
          'overview', 'hierarchy',
          'members', 'media', 'identity', 'credits',
        ]);
    return allowed.has(normalized) ? normalized : 'overview';
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
    orgId: String(org?.id || ''),
    clubId: clubIdForDirectoryLists,
  });

  /* ── Derive edit mode from user's team membership role ── */
  const currentUserId = String(authUser?.id || '').trim();
  const userEditMode: 'all' | 'own' | 'none' = useMemo(() => {
    // System / Org / Club admins always get full edit access
    if (isGlobalAdmin) return 'all';

    if (!currentUserId || !tabData.fullMembers?.length) return 'none';
    const myMembership = tabData.fullMembers.find(
      (m) => String(m?.user?.id || '').trim() === currentUserId,
    );
    if (!myMembership) return 'none';
    const role = String(myMembership?.role || '').toLowerCase();
    if (role === 'admin') return 'all';   // Team Admin: edit any member
    if (role === 'editor') return 'none';  // Team Editor: no member editing
    return 'own';                          // Team Member (viewer): own only
  }, [currentUserId, tabData.fullMembers, isPlayer, isGlobalAdmin]);

  /* ── Overflow menu ── */

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>Team</h1></div>
        </div>
        <div className={s.skeleton}>
          <div className={s.skeletonBar} />
          <div className={s.skeletonBarShort} />
          <div className={s.skeletonBarFull} />
          <div className={s.skeletonCard} />
          <div className={s.skeletonCard} />
        </div>
      </div>
    );
  }

  if (error || !org || !club || !team) {
    return (
      <div className={s.page}>
        <div className={s.errorBox}>
          <div className={s.errorMsg}>{error || 'Team not found'}</div>
          <button type="button" className={s.backBtn} onClick={() => navigate(backToClubHref)}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  const isActive = !!team && String((activeContextState as { team?: { id?: string } } | null)?.team?.id ?? '') === String(team.id ?? '');

  return (
    <>
      <div className={s.page}>
        {/* ── Header ── */}
        <TeamPageHeader
          team={team}
          club={club}
          org={org}
          isActive={isActive}
          activatingContext={activatingContext}
          setActivatingContext={setActivatingContext}
          activeContextState={activeContextState}
          setActiveContextState={setActiveContextState}
          isPlayer={isPlayer}
          backToClubHref={backToClubHref}
          setTeam={setTeam}
          onEditClick={() => setIsProjectEditModalOpen(true)}
          onDetailClick={() => setIsProjectDetailModalOpen(true)}
        />

        {/* ── Tab Bar ── */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'members', label: 'Selectie' },
            ...(!isPlayer ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer ? [{ id: 'identity', label: 'Identity' }] : []),
            ...(!isPlayer ? [{ id: 'credits', label: 'Credits' }] : []),
          ]}
          activeTab={activeTabFromUrl}
        />

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {activeTabFromUrl === 'overview' && (
            <TeamOverviewTab
              hierarchy={{
                seasons: tabData.hierarchySeasons,
                competitionsBySeasonId: tabData.hierarchyCompetitionsBySeasonId,
                matchesCountBySeasonId: tabData.hierarchyMatchesCountBySeasonId,
                loading: tabData.hierarchyLoading,
                error: tabData.hierarchyError,
              }}
              overviewMembers={{
                members: tabData.overviewMembers,
                count: tabData.overviewMembersCount,
                loading: tabData.overviewMembersLoading,
                error: tabData.overviewMembersError,
              }}
              routeKeys={{
                orgKey: orgKeyForRoutes,
                clubKey: clubKeyForRoutes,
                teamKey: teamKeyForRoutes,
              }}
              team={team}
              club={club}
              org={org}
              makeTabHref={makeTabHref}
              brand={{
                brandAssets: tabData.brandAssets,
                assetStats: tabData.assetStats,
                fullMembersLoading: tabData.fullMembersLoading,
                contentCount: tabData.contentCount,
                contentCountLoading: tabData.contentCountLoading,
              }}
              matchData={{
                matches: tabData.teamMatches,
                loading: tabData.teamMatchesLoading,
              }}
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
              teamMatchesByPeriodId={tabData.teamMatchesByPeriodId}
              teamMatchesLoading={tabData.teamMatchesLoading}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              teamKeyForRoutes={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'members' && teamIdForDirectoryLists && (
            <TeamSelectieTab
              members={tabData.fullMembers as unknown as import('./teamSelectieHelpers').MemberRecord[]}
              membersLoading={tabData.fullMembersLoading}
              memberDetailHref={!isPlayer ? (m) => {
                const memberId = String(m?.id || m?.user?.id || '');
                return `/${orgKeyForRoutes}/${clubKeyForRoutes}/${teamKeyForRoutes}/members/${memberId}`;
              } : undefined}
              showAdminLink={!isPlayer}
              onAdminLinkClick={!isPlayer ? () => {
                navigate(`${routes.team({ orgId: orgKeyForRoutes, clubId: clubKeyForRoutes, projectId: teamKeyForRoutes })}/directory`);
              } : undefined}
              apiBaseUrl={apiBaseUrl}
              teamId={teamIdForDirectoryLists}
              editMode={userEditMode}
              currentUserId={currentUserId}
              onRefresh={tabData.refreshFullMembers}
            />
          )}

          {activeTabFromUrl === 'credits' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && team && org && (
            <TeamMediaTab
              members={tabData.fullMembers}
              membersLoading={tabData.fullMembersLoading}
            />
          )}

          {activeTabFromUrl === 'identity' && team && org && (
            <IdentitySubtab
              org={org}
              team={team}
              setTeam={setTeam}
              brandProfileId={brandProfileId}
              club={club}
            />
          )}
        </div>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={team}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => refetch()}
        entityType="team"
        entityId={team?.slug || team?.id || ''}
        entityName={team?.name}
        organisationId={String(org?.id || '')}
        projectId={team?.slug || team?.id}
        initialEntityData={team ? {
          id: String(team.id),
          name: team.name || '',
          slug: team.slug,
          description: team.description,
          is_active: team.is_active ?? true,
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
