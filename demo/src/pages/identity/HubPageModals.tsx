/**
 * HubPageModals — All modal dialogs for MyTeamHubPage.
 *
 * Renders SeasonDetailModals (transaction, period edit/detail, match edit/detail,
 * competition create, match create, squad add) and PeriodCreateModal (season create).
 */
import React from 'react';
import { isSeasonPeriod } from '../../providers/SeasonProvider';
import SeasonDetailModals from '../periods/SeasonDetailModals';
import PeriodCreateModal from './PeriodCreateModal';
import type { UseSeasonDetailPageDataReturn } from '../periods/useSeasonDetailPageData';
import type { PeriodCreatePayload } from './PeriodCreateModal/types';

interface HubPageModalsProps {
  d: UseSeasonDetailPageDataReturn;
  navigateToTab: (tabId: string) => void;
  isCreateSeasonModalOpen: boolean;
  setIsCreateSeasonModalOpen: (v: boolean) => void;
  handleCreateSeason: (payload: PeriodCreatePayload) => Promise<void>;
}

export const HubPageModals: React.FC<HubPageModalsProps> = ({
  d,
  navigateToTab,
  isCreateSeasonModalOpen,
  setIsCreateSeasonModalOpen,
  handleCreateSeason,
}) => (
  <>
    <SeasonDetailModals
      transactionModal={{
        isOpen: d.isCreateTxnModalOpen,
        onClose: () => d.setIsCreateTxnModalOpen(false),
        onCreated: () => navigateToTab('beheer'),
        orgId: String(d.org?.id || '').trim(),
        projectId: d.project?.id != null ? String(d.project.id) : '',
        seasonId: String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim(),
        currentUserId: Number(d.user?.id),
        walletOptions: d.seasonWalletOptions,
      }}
      periodEdit={{
        isOpen: d.isPeriodEditModalOpen,
        onClose: () => { d.setIsPeriodEditModalOpen(false); d.setSelectedEditPeriod(null); },
        selected: d.selectedEditPeriod,
        isSeasonPeriod,
        organisationSportId: d.organisationSportId,
        onSave: d.savePeriodEdits,
      }}
      periodDetail={{
        isOpen: d.isPeriodDetailModalOpen,
        onClose: () => { d.setIsPeriodDetailModalOpen(false); d.setSelectedDetailPeriod(null); },
        selected: d.selectedDetailPeriod,
      }}
      matchDetail={{
        isOpen: d.isMatchDetailModalOpen,
        onClose: () => { d.setIsMatchDetailModalOpen(false); d.setSelectedDetailMatch(null); },
        selected: d.selectedDetailMatch,
      }}
      matchEdit={{
        isOpen: d.isMatchEditModalOpen,
        onClose: () => { d.setIsMatchEditModalOpen(false); d.setSelectedEditMatch(null); },
        selected: d.selectedEditMatch,
        onSave: d.saveMatchEdits,
      }}
      competitionCreate={{
        isOpen: d.isCreateCompetitionModalOpen,
        onClose: () => d.setIsCreateCompetitionModalOpen(false),
        onCreate: d.handleCreateCompetition,
        organisations: d.createModalOrganisations,
        clubs: d.createModalClubs,
        teams: d.createModalTeams,
        initialOrganisationId: String(d.org?.id || ''),
        initialClubId: String(d.club?.id || ''),
        initialTeamId: String(d.project?.id || ''),
        initialSeasonId: String(d.resolvedSeasonId || d.season?.id || ''),
      }}
      matchCreate={{
        isOpen: d.isCreateMatchModalOpen,
        onClose: () => d.setIsCreateMatchModalOpen(false),
        onCreate: d.handleCreateMatch,
        apiBaseUrl: d.apiBaseUrl,
      }}
      squadAddMember={{
        isOpen: d.isAddSquadMemberModalOpen,
        onClose: () => d.setIsAddSquadMemberModalOpen(false),
        onAdd: d.handleAddSquadMember,
        seasonId: String(d.resolvedSeasonId || '').trim(),
      }}
    />

    <PeriodCreateModal
      opened={isCreateSeasonModalOpen}
      onClose={() => setIsCreateSeasonModalOpen(false)}
      title="Seizoen aanmaken"
      organisations={d.createModalOrganisations}
      clubs={d.createModalClubs}
      teams={d.createModalTeams}
      requirements={{
        requireOrganisation: false,
        requireClub: false,
        requireTeam: false,
        requireSeason: false,
        showSportVariant: true,
      }}
      initialOrganisationId={String(d.org?.id || '')}
      initialClubId={String(d.club?.id || '')}
      initialTeamId={String(d.project?.id || '')}
      onCreate={handleCreateSeason}
    />
  </>
);

export default HubPageModals;
