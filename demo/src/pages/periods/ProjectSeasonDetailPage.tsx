import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import {
  Eye, Pencil, Trash2, Check, MoreHorizontal,
} from 'lucide-react';
import MobileTabBar from '../../components/MobileTabBar';
import { isSeasonPeriod } from '../../providers/SeasonProvider';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import s from './ProjectSeasonDetailPage.module.css';
import { useSeasonDetailPageData } from './useSeasonDetailPageData';
import SeasonDetailModals from './SeasonDetailModals';
import SeasonOverviewTab from './SeasonOverviewTab';
import SeasonContentTab from './SeasonContentTab';
import SeasonSquadTab from './SeasonSquadTab';
import SeasonMediaTab from './SeasonMediaTab';
import SeasonCompetitionsTab from './SeasonCompetitionsTab';
import SeasonMatchesTab from './SeasonMatchesTab';
import SeasonAssetsSettingsTab from './SeasonAssetsSettingsTab';

// ---------------------------------------------------------------------------

export const ProjectSeasonDetailPage: React.FC = () => {
  const d = useSeasonDetailPageData();

  /* ---- back navigation ---- */
  const backPath = d.projectDetailPath || d.seasonsBasePath || '/';
  const backLabel = d.project?.name || 'Team';
  useSetBackNavigation({ label: backLabel, path: backPath });

  /* ---- overflow menu ---- */
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

  const isActive =
    d.activeContext &&
    String(d.activeContext.season?.id || '').trim() === String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim();

  return (
    <>
      <div className={s.page}>
        {/* ── Header ─────────────────────────────────────── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            {backPath && (
              <Link to={backPath} className={s.parentLink}>
                ‹ {backLabel}
              </Link>
            )}
            <h1>{d.season ? d.season.name : 'Seizoen'}</h1>
            {(d.season as any)?.period_type === 'legends' && <p>Legends Seizoen</p>}
          </div>

          <div className={s.actions}>
            {/* Activate context — always visible */}
            <button
              type="button"
              className={`${s.activeBtn} ${isActive ? s.activeBtnOn : ''}`}
              disabled={d.activatingContext || (isActive ?? false)}
              onClick={d.handleActivateContext}
              title="Stel dit seizoen in als actieve context"
            >
              {isActive && <Check size={14} />}
              {isActive ? 'Actief' : 'Activeren'}
            </button>

            {/* Edit (admin) — always visible */}
            {d.userCanEditProject && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => {
                  d.setSelectedEditPeriod(d.season);
                  d.setIsPeriodEditModalOpen(true);
                }}
                title="Bewerken"
              >
                <Pencil size={16} />
              </button>
            )}

            {/* Overflow menu — View + Delete */}
            <div className={s.overflowWrap} ref={overflowRef}>
              <button type="button" className={s.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer">
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  <button type="button" onClick={() => { d.setSelectedDetailPeriod(d.season); d.setIsPeriodDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  {d.userCanDeleteProject && (
                    <button type="button" className={s.overflowDanger} onClick={() => { d.handleDeleteSeason(); setOverflowOpen(false); }}>
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <SeasonDetailModals
          isCreateTxnModalOpen={d.isCreateTxnModalOpen}
          onCloseTxnModal={() => d.setIsCreateTxnModalOpen(false)}
          onTxnCreated={() => d.navigateToTab('transactions')}
          orgId={String(d.org?.id || '').trim()}
          projectId={d.project?.id != null ? String(d.project.id) : ''}
          seasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim()}
          currentUserId={Number((d.user as any)?.id)}
          seasonWalletOptions={d.seasonWalletOptions}
          isPeriodEditModalOpen={d.isPeriodEditModalOpen}
          onClosePeriodEdit={() => {
            d.setIsPeriodEditModalOpen(false);
            d.setSelectedEditPeriod(null);
          }}
          selectedEditPeriod={d.selectedEditPeriod}
          isSeasonPeriod={isSeasonPeriod}
          organisationSportId={d.organisationSportId}
          onSavePeriodEdits={d.savePeriodEdits}
          isPeriodDetailModalOpen={d.isPeriodDetailModalOpen}
          onClosePeriodDetail={() => {
            d.setIsPeriodDetailModalOpen(false);
            d.setSelectedDetailPeriod(null);
          }}
          selectedDetailPeriod={d.selectedDetailPeriod}
          isMatchDetailModalOpen={d.isMatchDetailModalOpen}
          onCloseMatchDetail={() => {
            d.setIsMatchDetailModalOpen(false);
            d.setSelectedDetailMatch(null);
          }}
          selectedDetailMatch={d.selectedDetailMatch}
          isMatchEditModalOpen={d.isMatchEditModalOpen}
          onCloseMatchEdit={() => {
            d.setIsMatchEditModalOpen(false);
            d.setSelectedEditMatch(null);
          }}
          selectedEditMatch={d.selectedEditMatch}
          onSaveMatchEdits={d.saveMatchEdits}
          isCreateCompetitionModalOpen={d.isCreateCompetitionModalOpen}
          onCloseCreateCompetition={() => d.setIsCreateCompetitionModalOpen(false)}
          onCreateCompetition={d.handleCreateCompetition}
          createModalOrganisations={d.createModalOrganisations}
          createModalClubs={d.createModalClubs}
          createModalTeams={d.createModalTeams}
          initialOrganisationId={String(d.org?.id || '')}
          initialClubId={String((d.club as any)?.id || '')}
          initialTeamId={String((d.project as any)?.id || '')}
          initialSeasonId={String(d.resolvedSeasonId || d.season?.id || '')}
          isCreateMatchModalOpen={d.isCreateMatchModalOpen}
          onCloseCreateMatch={() => d.setIsCreateMatchModalOpen(false)}
          onCreateMatch={d.handleCreateMatch}
          apiBaseUrl={d.apiBaseUrl}
          isAddSquadMemberModalOpen={d.isAddSquadMemberModalOpen}
          onCloseAddSquadMember={() => d.setIsAddSquadMemberModalOpen(false)}
          onAddSquadMember={d.handleAddSquadMember}
          squadSeasonId={String(d.resolvedSeasonId || '').trim()}
        />

        {/* Mobile Tab Bar — RBAC: Supporter (2), Member (5), Admin (8) */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            ...(!d.isSupporter ? [{ id: 'media', label: 'Media' }] : []),
            ...(!d.isSupporter ? [{ id: 'content', label: 'Content' }] : []),
            { id: 'matches', label: 'Matches' },
            ...(!d.isSupporter ? [{ id: 'selectie', label: 'Selectie' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'competitions', label: 'Competities' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'assets', label: 'Assets' }] : []),
          ]}
          activeTab={d.activeTab}
        />

        <div className={s.tabContent}>
          {d.error && <Alert variant="error">{d.error}</Alert>}

          {d.loading ? (
            <div className={s.skeleton}>
              <div className={s.skeletonBar} />
              <div className={s.skeletonBarShort} />
              <div className={s.skeletonBarFull} />
              <div className={s.skeletonCard} />
              <div className={s.skeletonCard} />
            </div>
          ) : (
            <>
              {d.activeTab === 'overview' && (
                <SeasonOverviewTab
                  season={d.season}
                  competitions={d.competitions}
                  members={d.members}
                  matches={d.matches}
                  matchesLoading={d.matchesLoading}
                  navigateToTab={d.navigateToTab}
                  isTeamRoute={d.isTeamRoute}
                  seasonsBasePath={d.seasonsBasePath}
                  seasonPathKey={d.seasonPathKey}
                  matchDisplayTitle={d.matchDisplayTitle}
                  teamRosterCount={d.teamRoster?.length}
                  brandLogoUrl={d.brandLogoUrl}
                  brandSponsorUrl={d.brandSponsorUrl}
                  batchBrandKits={d.batchBrandKits}
                />
              )}

              {d.activeTab === 'content' && (
                <SeasonContentTab
                  org={d.org}
                  projectId={String(d.project?.id || '')}
                  seasonId={d.resolvedSeasonId || d.effectiveSeasonId || ''}
                  apiBaseUrl={d.apiBaseUrl}
                  members={d.members}
                  pushToast={d.pushToast}
                />
              )}

              {d.activeTab === 'selectie' && (
                <SeasonSquadTab
                  members={d.members}
                  membersLoading={d.membersLoading}
                  membersError={d.membersError}
                  userCanEditProject={d.userCanEditProject}
                  bulkSubmitting={d.bulkSubmitting}
                  isTeamRoute={d.isTeamRoute}
                  apiBaseUrl={d.apiBaseUrl}
                  projectId={String(d.project?.id || '')}
                  memberDetailHref={(mid: string) => {
                    const base = d.memberDetailHref(mid);
                    return base ? `${base}?from=selectie` : base;
                  }}
                  unassignMembershipsFromSeasonSquad={d.unassignMembershipsFromSeasonSquad}
                  setIsAddSquadMemberModalOpen={d.setIsAddSquadMemberModalOpen}
                  onMemberUpdated={() => d.setMembersReloadToken(t => t + 1)}
                  teamRoster={d.teamRoster}
                  teamRosterLoading={d.teamRosterLoading}
                  teamRosterError={d.teamRosterError}
                  assignUsersToSeasonSquad={d.assignUsersToSeasonSquad}
                  getBestRoleForUser={d.getBestRoleForUser}
                  getFunctionalRolesForUser={d.getFunctionalRolesForUser}
                />
              )}

              {d.activeTab === 'media' && (
                <SeasonMediaTab
                  members={d.members}
                  membersLoading={d.membersLoading}
                  project={d.project}
                  org={d.org}
                  club={d.club}
                  apiBaseUrl={d.apiBaseUrl}
                  memberDetailHref={(mid: string) => {
                    const base = d.memberDetailHref(mid);
                    return base ? `${base}?from=media` : base;
                  }}
                  brandLogoUrl={d.brandLogoUrl}
                  brandSponsorUrl={d.brandSponsorUrl}
                  batchBrandKits={d.batchBrandKits}
                  clubBrand={d.clubBrand}
                  onMembersReload={() => d.setMembersReloadToken(t => t + 1)}
                  isTeamRoute={d.isTeamRoute}
                  userCanEditProject={d.userCanEditProject}
                  teamBrand={d.teamBrand}
                />
              )}

              {d.activeTab === 'competitions' && (
                <SeasonCompetitionsTab
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
                />
              )}

              {d.activeTab === 'matches' && (
                <SeasonMatchesTab
                  matches={d.matches}
                  matchesLoading={d.matchesLoading}
                  isTeamRoute={d.isTeamRoute}
                  seasonsBasePath={d.seasonsBasePath}
                  seasonPathKey={d.seasonPathKey}
                  userCanEditProject={d.userCanEditProject}
                  userCanDeleteProject={d.userCanDeleteProject}
                  apiBaseUrl={d.apiBaseUrl}
                  matchDisplayTitle={d.matchDisplayTitle}
                  setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
                  setSelectedDetailMatch={d.setSelectedDetailMatch}
                  setIsMatchDetailModalOpen={d.setIsMatchDetailModalOpen}
                  setSelectedEditMatch={d.setSelectedEditMatch}
                  setIsMatchEditModalOpen={d.setIsMatchEditModalOpen}
                  setMatches={d.setMatches}
                />
              )}
            </>
          )}

          {d.activeTab === 'assets' && d.season && d.project && (
            <SeasonAssetsSettingsTab
              season={d.season}
              project={d.project}
              org={d.org}
              orgSlugOrId={d.orgSlugOrId}
              club={d.club}
              userCanEditProject={d.userCanEditProject}
              apiBaseUrl={d.apiBaseUrl}
              onSeasonUpdate={d.setSeason}
            />
          )}

        </div>
      </div>

      {/* Toast notifications */}
      {d.toasts.length > 0 && (
        <div className={s.toastContainer}>
          {d.toasts.map(toast => (
            <div
              key={toast.id}
              className={s.toast}
              style={{
                background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#1e40af',
              }}
            >
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => d.dismissToast(toast.id)}
                className={s.toastDismiss}
              >
                �
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ProjectSeasonDetailPage;
