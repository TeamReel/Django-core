import React, { useEffect, useRef, useState } from 'react';
import {
  Check, Pencil, Eye, Trash2, MoreHorizontal,
} from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import { Organisation } from '../../types';
import MobileTabBar from '../../components/MobileTabBar';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';
import ContentAvailabilityCard from '../../components/FeatureFlags/ContentAvailabilityCard';
import { OrgOverviewTab } from './OrgOverviewTab';
import { ClubsList } from './directory/ClubsList';
import { UsersList } from './directory/UsersList';
import { OrgModals } from './OrgModals';
import { useOrgData } from './useOrgData';
import s from './OrganisationDetailPage.module.css';

/**
 * T007 - Organisation Detail Page — Premium rebuild
 *
 * Compact 5-tab layout: Overview | Clubs | Members | Identity | Settings
 * Consistent with Team & Club detail page design
 */
export const OrganisationDetailPage: React.FC = () => {
  const d = useOrgData();

  /* ── Overflow menu ── */
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // ── Loading state ──
  if (d.loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>Federatie</h1></div>
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

  // ── Error state ──
  if (d.error || !d.org) {
    return (
      <div className={s.page}>
        <div className={s.errorBox}>
          <div className={s.errorMsg}>{d.error || 'Federatie niet gevonden'}</div>
          <button type="button" className={s.backBtn} onClick={() => d.navigate('/federations')}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  const org = d.org;
  const isActive =
    String((d.activeContext?.organisation as Record<string, unknown> | undefined)?.id ?? '') === String(org?.id ?? '') ||
    (d.activeContext?.organisation as Record<string, unknown> | undefined)?.slug === org?.slug;

  return (
    <>
      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <h1>{org.name}</h1>
            <p>Federatie{org?.sport?.name ? ` · ${org.sport.name}` : ''}</p>
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={`${s.activeBtn} ${isActive ? s.activeBtnOn : ''}`}
              disabled={d.activatingContext || isActive}
              onClick={() => { if (!isActive) void d.handleActivateContext(); }}
              title={isActive ? 'Deze federatie is al actief' : 'Stel in als actieve context'}
            >
              {isActive && <Check size={14} />}
              {isActive ? 'Actief' : 'Activeren'}
            </button>

            {d.userCanEditOrg && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => d.setIsOrgEditModalOpen(true)}
                title="Bewerken"
              >
                <Pencil size={16} />
              </button>
            )}

            {/* Share link */}
            <ShareButton compact />

            <div className={s.overflowWrap} ref={overflowRef}>
              <button type="button" className={s.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer" aria-label="Meer">
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  <button type="button" onClick={() => { d.setIsOrgDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  <button type="button" onClick={() => { d.navigate('/federations'); setOverflowOpen(false); }}>
                    <Eye size={14} /> Alle federaties
                  </button>
                  {d.userCanDeleteOrg && (
                    <button
                      type="button"
                      className={s.overflowDanger}
                      onClick={() => { d.handleDelete(); setOverflowOpen(false); }}
                    >
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'clubs', label: 'Clubs' },
            { id: 'members', label: 'Members' },
            { id: 'identity', label: 'Identity' },
            ...(d.isSuperAdmin || d.userCanEditOrg ? [{ id: 'settings', label: 'Settings' }] : []),
          ]}
          activeTab={d.activeTab}
        />

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {d.activeTab === 'overview' && (
            <OrgOverviewTab
              org={org}
              clubs={d.clubs}
              teams={d.teams}
              members={d.members}
              loadingState={{
                clubsLoading: d.clubsLoading,
                teamsLoading: d.teamsLoading,
                membersLoading: d.membersLoading,
                scheduledMatchesLoading: d.scheduledMatchesLoading,
              }}
              countsData={{
                clubsCount: d.clubsCount,
                teamsCount: d.teamsCount,
                matchesCount: d.matchesCount,
              }}
              scheduledMatches={d.scheduledMatches}
              navigate={d.navigate}
              makeTabHref={d.makeTabHref}
              getBestMatchDetailPath={d.getBestMatchDetailPath}
              currentOrgSlug={d.currentOrgSlug}
              id={d.id}
              permissionContext={d.permissionContext}
              setIsOrgEditModalOpen={d.setIsOrgEditModalOpen}
            />
          )}

          {d.activeTab === 'clubs' && d.orgIdForDirectoryLists && (
            <ClubsList preselectedOrgId={d.orgIdForDirectoryLists} />
          )}

          {d.activeTab === 'members' && d.orgIdForDirectoryLists && (
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
        </div>

        <OrgModals
          org={org}
          currentOrgSlug={d.currentOrgSlug}
          currentOrgId={d.currentOrgId}
          permissionContext={d.permissionContext!}
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
          setMembers={d.setMembers}
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
          setEditingMember={d.setEditingMember as (v: Record<string, unknown> | null) => void}
          isOrgDetailModalOpen={d.isOrgDetailModalOpen}
          setIsOrgDetailModalOpen={d.setIsOrgDetailModalOpen}
          isOrgEditModalOpen={d.isOrgEditModalOpen}
          setIsOrgEditModalOpen={d.setIsOrgEditModalOpen}
          detailUser={d.detailUser as { id: string; email: string; first_name: string; last_name: string; is_active: boolean; role?: string } | null}
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
