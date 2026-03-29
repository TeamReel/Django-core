import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil, MoreHorizontal, Eye, Trash2, Plus } from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import MobileTabBar from '../../components/MobileTabBar';
import { SeasonSwitcher } from '../../components/SeasonSwitcher';
import { useSeasonContext } from '../../providers/SeasonProvider';
import { useSetNavTitle } from '../../providers/BackNavigationProvider';
import { useTeamDetailData } from './useTeamDetailData';
import { useSeasonDetailPageData } from '../periods/useSeasonDetailPageData';
import type { SquadMember } from '../periods/squadTabTypes';
import { useMyTeamHubState } from './useMyTeamHubState';

// ── Extracted sub-components ──
import { HubTabContent } from './HubTabContent';
import { HubPageSheets } from './HubPageSheets';
import { HubPageModals } from './HubPageModals';

import s from './MyTeamHubPage.module.css';

// ─── Hub page component ─────────────────────────────────────────────────────

export const MyTeamHubPage: React.FC = () => {
  const navigate = useNavigate();
  useSetNavTitle('Mijn Team');

  // ── Data sources ──
  const team = useTeamDetailData();
  const seasonCtx = useSeasonContext();
  const d = useSeasonDetailPageData();

  // ── RBAC ──
  const { isPlayer, isSupporter } = d;
  const isAdmin = !isPlayer && !isSupporter;

  // ── Derived state (extracted hook) ──
  const {
    activeTab, navigateToTab,
    seasonOptions, handleSeasonSwitch,
    overflowOpen, setOverflowOpen, overflowRef,
    selectedMatch, setSelectedMatch,
    selectedMember, setSelectedMember,
    detailMemberId, setDetailMemberId,
    detailDefaultTab, setDetailDefaultTab,
    activeAssetSheet, setActiveAssetSheet,
    matchForSheet, matchSheet, clubLogoUrl,
    handleSelectMatch, handleNavigateToMatch,
    isCreateSeasonModalOpen, setIsCreateSeasonModalOpen, handleCreateSeason,
    creditsBalance, creditsSheetOpen, setCreditsSheetOpen, creditsLabel,
    memberAssetSummary,
  } = useMyTeamHubState({ d, seasonCtx, isAdmin, isPlayer, isSupporter });

  // ── Loading / error ──
  if (team.loading || d.loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>My Team</h1></div>
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

  if (team.error || !team.org || !team.club || !team.team) {
    return <Navigate to={team.backToClubHref} replace />;
  }

  if (!d.loading && !team.loading && (seasonCtx.error || !seasonCtx.season)) {
    const teamOnly = `/${team.orgKeyForRoutes}/${team.clubKeyForRoutes}/${team.teamKeyForRoutes}`;
    return <Navigate to={teamOnly} replace />;
  }

  return (
    <>
      <div className={s.page}>

        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <div className={s.titleRow}>
              <h1>{team.team?.name || 'Team'}</h1>
              <div className={s.seasonSwitcherRow}>
                <SeasonSwitcher
                  seasons={seasonOptions}
                  currentSeasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '')}
                  onSelect={handleSeasonSwitch}
                />
                {isAdmin && (
                  <button
                    type="button"
                    className={s.seasonAddBtn}
                    onClick={() => setIsCreateSeasonModalOpen(true)}
                    aria-label="Seizoen aanmaken"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={s.actions}>
            <ShareButton compact className={s.shareBtn} />
            <div className={s.overflowWrap} ref={overflowRef}>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setOverflowOpen((o) => !o)}
                aria-label="Meer opties"
              >
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  {d.userCanEditProject && team.team && (
                    <button type="button" onClick={() => {
                      navigate(`/organisations/${team.orgIdForDirectoryLists}/projects/${team.teamIdForDirectoryLists}/edit`);
                      setOverflowOpen(false);
                    }}>
                      <Pencil size={14} /> Bewerken
                    </button>
                  )}
                  <button type="button" onClick={() => { d.setSelectedDetailPeriod(d.season); d.setIsPeriodDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  {d.userCanDeleteProject && d.userCanEditProject && (
                    <button type="button" className={s.overflowDanger} onClick={() => { d.handleDeleteSeason(); setOverflowOpen(false); }}>
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Modals (extracted) ── */}
        <HubPageModals
          d={d}
          navigateToTab={navigateToTab}
          isCreateSeasonModalOpen={isCreateSeasonModalOpen}
          setIsCreateSeasonModalOpen={setIsCreateSeasonModalOpen}
          handleCreateSeason={handleCreateSeason}
        />

        {/* ── Tab Bar (RBAC) ── */}
        <div className={s.mobileTabBarWrap}>
          <MobileTabBar
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'wedstrijden', label: 'Wedstrijden' },
              ...(!isSupporter ? [{ id: 'assets', label: 'Assets' }] : []),
              ...(!isSupporter ? [{ id: 'selectie', label: 'Selectie' }] : []),
              ...(isAdmin ? [{ id: 'beheer', label: 'Beheer', desktopOnly: true }] : []),
              ...(isAdmin ? [{ id: 'club', label: 'Club', desktopOnly: true }] : []),
            ]}
            activeTab={activeTab}
          />
        </div>

        {/* ── Tab Content ── */}
        <HubTabContent
          activeTab={activeTab}
          seasonCtx={seasonCtx}
          d={d}
          team={team}
          isAdmin={isAdmin}
          isSupporter={isSupporter}
          memberAssetSummary={memberAssetSummary}
          creditsLabel={creditsLabel}
          handleSelectMatch={handleSelectMatch}
          navigateToTab={navigateToTab}
          setActiveAssetSheet={setActiveAssetSheet}
          setCreditsSheetOpen={setCreditsSheetOpen}
          setSelectedMember={setSelectedMember}
        />
      </div>
      
      {/* ── Sheets ── Sheets & Overlays (extracted) ── */}
      <HubPageSheets
        matchForSheet={matchForSheet}
        matchSheet={matchSheet}
        selectedMatch={selectedMatch}
        setSelectedMatch={() => setSelectedMatch(null)}
        onNavigateToMatch={handleNavigateToMatch}
        clubLogoUrl={clubLogoUrl}
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        members={d.members as SquadMember[]}
        clubName={d.club?.name}
        isAdmin={isAdmin}
        activeAssetSheet={activeAssetSheet}
        setActiveAssetSheet={setActiveAssetSheet}
        batchBrandKits={d.batchBrandKits}
        brandLogoUrl={d.brandLogoUrl}
        brandSponsorUrl={d.brandSponsorUrl}
        memberAssetSummary={memberAssetSummary}
        onNavigateToTab={navigateToTab}
        creditsBalance={creditsBalance}
        creditsSheetOpen={creditsSheetOpen}
        setCreditsSheetOpen={setCreditsSheetOpen}
        detailMemberId={detailMemberId}
        setDetailMemberId={setDetailMemberId}
        detailDefaultTab={detailDefaultTab}
        setDetailDefaultTab={setDetailDefaultTab}
        project={d.project}
        org={d.org}
        club={d.club}
        apiBaseUrl={d.apiBaseUrl}
        isTeamRoute={d.isTeamRoute}
        userCanEditProject={d.userCanEditProject}
        clubBrand={d.clubBrand}
        teamBrand={d.teamBrand}
        setMembersReloadToken={d.setMembersReloadToken}
        toasts={d.toasts}
        dismissToast={d.dismissToast}
      />
    </>
  );
};

export default MyTeamHubPage;
