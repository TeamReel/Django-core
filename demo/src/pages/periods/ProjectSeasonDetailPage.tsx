import React from 'react';
import { Alert } from '@django-core/design-system';
import {
  Eye, Pencil, Trash2, Receipt, Check, ChevronLeft,
} from 'lucide-react';
import MobileTabBar from '../../components/MobileTabBar';
import { isSeasonPeriod } from '../../providers/SeasonProvider';
import s from './ProjectSeasonDetailPage.module.css';
import { useSeasonDetailPageData } from './useSeasonDetailPageData';
import SeasonDetailModals from './SeasonDetailModals';
import SeasonOverviewTab from './SeasonOverviewTab';
import SeasonContentTab from './SeasonContentTab';
import SeasonHierarchyTab from './SeasonHierarchyTab';
import SeasonSquadTab from './SeasonSquadTab';
import SeasonTeamTab from './SeasonTeamTab';
import SeasonMediaTab from './SeasonMediaTab';
import SeasonCompetitionsTab from './SeasonCompetitionsTab';
import SeasonMatchesTab from './SeasonMatchesTab';
import SeasonWorkflowTab from './SeasonWorkflowTab';
import SeasonTransactionsTab from './SeasonTransactionsTab';
import SeasonAssetsSettingsTab from './SeasonAssetsSettingsTab';

// ---------------------------------------------------------------------------

export const ProjectSeasonDetailPage: React.FC = () => {
  const d = useSeasonDetailPageData();

  const isActive =
    d.activeContext &&
    String(d.activeContext.season?.id || '').trim() === String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim();

  return (
    <>
      <div className={s.page}>
        {/* ── Header ─────────────────────────────────────── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <h1>{d.season ? d.season.name : 'Seizoen'}</h1>
            {(d.season as any)?.period_type === 'legends' && <p>Legends Seizoen</p>}
          </div>

          <div className={s.actions}>
            {/* Activate context */}
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

            {/* Back */}
            <button type="button" className={s.iconBtn} onClick={() => d.navigate(d.seasonsBasePath)} title="Terug">
              <ChevronLeft size={16} />
            </button>

            {/* View */}
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => {
                d.setSelectedDetailPeriod(d.season);
                d.setIsPeriodDetailModalOpen(true);
              }}
              title="Bekijken"
            >
              <Eye size={16} />
            </button>

            {/* Edit (admin) */}
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

            {/* Delete (admin) */}
            {d.userCanDeleteProject && (
              <button type="button" className={s.iconBtn} onClick={d.handleDeleteSeason} title="Verwijderen">
                <Trash2 size={16} />
              </button>
            )}

            {/* Create transaction (admin) */}
            {d.userCanEditProject && (
              <button type="button" className={s.iconBtn} onClick={() => d.setIsCreateTxnModalOpen(true)} title="Transactie aanmaken">
                <Receipt size={16} />
              </button>
            )}
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

        {/* Mobile Tab Bar — RBAC: Supporter (2), Member (5), Admin (all 11) */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            ...(!d.isSupporter ? [{ id: 'matches', label: 'Matches' }] : [{ id: 'matches', label: 'Matches' }]),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'hierarchy', label: 'Hierarchy' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'competitions', label: 'Competitions' }] : []),
            ...(!d.isSupporter ? [{ id: 'squad', label: 'Squad' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'team', label: 'Team' }] : []),
            ...(!d.isSupporter ? [{ id: 'media', label: 'Media' }] : []),
            ...(!d.isSupporter ? [{ id: 'content', label: 'Content' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'transactions', label: 'Transactions' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'assets', label: 'Assets' }] : []),
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'workflow', label: 'Workflow' }] : []),
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
                  competitionsLoading={d.competitionsLoading}
                  members={d.members}
                  seasonMatchesCount={d.matches.length}
                  navigateToTab={d.navigateToTab}
                  isTeamRoute={d.isTeamRoute}
                  seasonsBasePath={d.seasonsBasePath}
                  seasonPathKey={d.seasonPathKey}
                  userCanEditProject={d.userCanEditProject}
                  userCanDeleteProject={d.userCanDeleteProject}
                  apiBaseUrl={d.apiBaseUrl}
                  getMatchCountForCompetition={d.getMatchCountForCompetition}
                  setSelectedDetailPeriod={d.setSelectedDetailPeriod}
                  setIsPeriodDetailModalOpen={d.setIsPeriodDetailModalOpen}
                  setSelectedEditPeriod={d.setSelectedEditPeriod}
                  setIsPeriodEditModalOpen={d.setIsPeriodEditModalOpen}
                  setCompetitions={d.setCompetitions}
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

              {d.activeTab === 'hierarchy' && (
                <SeasonHierarchyTab
                  competitions={d.competitions}
                  competitionsLoading={d.competitionsLoading}
                  matches={d.matches}
                  matchesLoading={d.matchesLoading}
                  isTeamRoute={d.isTeamRoute}
                  seasonsBasePath={d.seasonsBasePath}
                  seasonPathKey={d.seasonPathKey}
                  userCanEditProject={d.userCanEditProject}
                  userCanDeleteProject={d.userCanDeleteProject}
                  apiBaseUrl={d.apiBaseUrl}
                  matchDisplayTitle={d.matchDisplayTitle}
                  getMatchCountForCompetition={d.getMatchCountForCompetition}
                  getCompetitionParticipantsCount={d.getCompetitionParticipantsCount}
                  setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
                  setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
                  setSelectedDetailPeriod={d.setSelectedDetailPeriod}
                  setIsPeriodDetailModalOpen={d.setIsPeriodDetailModalOpen}
                  setSelectedEditPeriod={d.setSelectedEditPeriod}
                  setIsPeriodEditModalOpen={d.setIsPeriodEditModalOpen}
                  setSelectedDetailMatch={d.setSelectedDetailMatch}
                  setIsMatchDetailModalOpen={d.setIsMatchDetailModalOpen}
                  setSelectedEditMatch={d.setSelectedEditMatch}
                  setIsMatchEditModalOpen={d.setIsMatchEditModalOpen}
                  setCompetitions={d.setCompetitions}
                  setMatches={d.setMatches}
                />
              )}

              {d.activeTab === 'squad' && (
                <SeasonSquadTab
                  members={d.members}
                  membersLoading={d.membersLoading}
                  membersError={d.membersError}
                  userCanEditProject={d.userCanEditProject}
                  bulkSubmitting={d.bulkSubmitting}
                  isTeamRoute={d.isTeamRoute}
                  apiBaseUrl={d.apiBaseUrl}
                  projectId={String(d.project?.id || '')}
                  memberDetailHref={d.memberDetailHref}
                  unassignMembershipsFromSeasonSquad={d.unassignMembershipsFromSeasonSquad}
                  setIsAddSquadMemberModalOpen={d.setIsAddSquadMemberModalOpen}
                  onMemberUpdated={() => d.setMembersReloadToken(t => t + 1)}
                />
              )}

              {d.activeTab === 'team' && (
                <SeasonTeamTab
                  teamRoster={d.teamRoster}
                  teamRosterLoading={d.teamRosterLoading}
                  teamRosterError={d.teamRosterError}
                  members={d.members}
                  userCanEditProject={d.userCanEditProject}
                  bulkSubmitting={d.bulkSubmitting}
                  isTeamRoute={d.isTeamRoute}
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
                  memberDetailHref={d.memberDetailHref}
                  brandLogoUrl={d.brandLogoUrl}
                  brandSponsorUrl={d.brandSponsorUrl}
                  batchBrandKits={d.batchBrandKits}
                  clubBrand={d.clubBrand}
                  onMembersReload={() => d.setMembersReloadToken(t => t + 1)}
                />
              )}

              {d.activeTab === 'competitions' && (
                <SeasonCompetitionsTab
                  competitions={d.competitions}
                  competitionsLoading={d.competitionsLoading}
                  isTeamRoute={d.isTeamRoute}
                  seasonsBasePath={d.seasonsBasePath}
                  seasonPathKey={d.seasonPathKey}
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

          {d.activeTab === 'transactions' && (
            <SeasonTransactionsTab
              orgId={String(d.org?.id || '')}
              projectId={String(d.project?.id || '')}
              seasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '')}
            />
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

          {d.activeTab === 'workflow' && d.season && d.project && (
            <SeasonWorkflowTab
              projectId={String(d.project.id)}
              seasonId={String(d.season.id)}
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
