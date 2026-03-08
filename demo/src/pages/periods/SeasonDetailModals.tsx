import React from 'react';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchEditModal from '../identity/MatchEditModal';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodCreateModal from '../identity/PeriodCreateModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import SeasonSquadAddMemberModal from '../identity/SeasonSquadAddMemberModal';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SeasonDetailModalsProps {
  // Transaction modal
  isCreateTxnModalOpen: boolean;
  onCloseTxnModal: () => void;
  onTxnCreated: () => void;
  orgId: string;
  projectId: string;
  seasonId: string;
  currentUserId: number;
  seasonWalletOptions: WalletOption[];

  // Period edit modal
  isPeriodEditModalOpen: boolean;
  onClosePeriodEdit: () => void;
  selectedEditPeriod: any;
  isSeasonPeriod: (p: any) => boolean;
  organisationSportId: string | null;
  onSavePeriodEdits: (period: any, payload: any) => Promise<void>;

  // Period detail modal
  isPeriodDetailModalOpen: boolean;
  onClosePeriodDetail: () => void;
  selectedDetailPeriod: any;

  // Match detail modal
  isMatchDetailModalOpen: boolean;
  onCloseMatchDetail: () => void;
  selectedDetailMatch: any;

  // Match edit modal
  isMatchEditModalOpen: boolean;
  onCloseMatchEdit: () => void;
  selectedEditMatch: any;
  onSaveMatchEdits: (match: any, payload: any) => Promise<void>;

  // Competition create modal
  isCreateCompetitionModalOpen: boolean;
  onCloseCreateCompetition: () => void;
  onCreateCompetition: (payload: any) => Promise<void>;
  createModalOrganisations: any[];
  createModalClubs: any[];
  createModalTeams: any[];
  initialOrganisationId: string;
  initialClubId: string;
  initialTeamId: string;
  initialSeasonId: string;

  // Match create modal
  isCreateMatchModalOpen: boolean;
  onCloseCreateMatch: () => void;
  onCreateMatch: (payload: any) => Promise<void>;
  apiBaseUrl: string;

  // Squad add member modal
  isAddSquadMemberModalOpen: boolean;
  onCloseAddSquadMember: () => void;
  onAddSquadMember: (payload: any) => Promise<void>;
  squadSeasonId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SeasonDetailModals: React.FC<SeasonDetailModalsProps> = ({
  isCreateTxnModalOpen,
  onCloseTxnModal,
  onTxnCreated,
  orgId,
  projectId,
  seasonId,
  currentUserId,
  seasonWalletOptions,

  isPeriodEditModalOpen,
  onClosePeriodEdit,
  selectedEditPeriod,
  isSeasonPeriod: isSeasonPeriodFn,
  organisationSportId,
  onSavePeriodEdits,

  isPeriodDetailModalOpen,
  onClosePeriodDetail,
  selectedDetailPeriod,

  isMatchDetailModalOpen,
  onCloseMatchDetail,
  selectedDetailMatch,

  isMatchEditModalOpen,
  onCloseMatchEdit,
  selectedEditMatch,
  onSaveMatchEdits,

  isCreateCompetitionModalOpen,
  onCloseCreateCompetition,
  onCreateCompetition,
  createModalOrganisations,
  createModalClubs,
  createModalTeams,
  initialOrganisationId,
  initialClubId,
  initialTeamId,
  initialSeasonId,

  isCreateMatchModalOpen,
  onCloseCreateMatch,
  onCreateMatch,
  apiBaseUrl,

  isAddSquadMemberModalOpen,
  onCloseAddSquadMember,
  onAddSquadMember,
  squadSeasonId,
}) => (
  <>
    <CreateTransactionModal
      isOpen={isCreateTxnModalOpen}
      onClose={onCloseTxnModal}
      onCreated={onTxnCreated}
      title="Create season transaction"
      scope="season"
      organizationId={orgId}
      defaultProjectId={projectId}
      seasonId={seasonId}
      periodId={seasonId}
      activityId={null}
      currentUserId={currentUserId}
      chargedUserId={null}
      walletOptions={seasonWalletOptions}
    />

    <PeriodEditModal
      opened={isPeriodEditModalOpen}
      onClose={onClosePeriodEdit}
      period={selectedEditPeriod}
      showSportVariant={!isSeasonPeriodFn(selectedEditPeriod)}
      organisationSportId={organisationSportId}
      onSave={async (payload: any) => {
        if (!selectedEditPeriod) return;
        await onSavePeriodEdits(selectedEditPeriod, payload);
      }}
    />

    <PeriodDetailModal
      opened={isPeriodDetailModalOpen}
      onClose={onClosePeriodDetail}
      period={selectedDetailPeriod}
    />

    <MatchDetailModal
      opened={isMatchDetailModalOpen}
      onClose={onCloseMatchDetail}
      match={selectedDetailMatch}
    />

    <MatchEditModal
      opened={isMatchEditModalOpen}
      onClose={onCloseMatchEdit}
      match={selectedEditMatch}
      onSave={async (payload: any) => {
        if (!selectedEditMatch) return;
        await onSaveMatchEdits(selectedEditMatch, payload);
      }}
    />

    <PeriodCreateModal
      opened={isCreateCompetitionModalOpen}
      onClose={onCloseCreateCompetition}
      title="Create Competition"
      organisations={createModalOrganisations}
      clubs={createModalClubs}
      teams={createModalTeams}
      requireOrganisation
      requireClub
      requireTeam
      requireSeason
      showSportVariant
      initialOrganisationId={initialOrganisationId}
      initialClubId={initialClubId}
      initialTeamId={initialTeamId}
      initialSeasonId={initialSeasonId}
      onCreate={onCreateCompetition}
    />

    <MatchCreateModal
      opened={isCreateMatchModalOpen}
      onClose={onCloseCreateMatch}
      mode="season-detail"
      apiBaseUrl={apiBaseUrl}
      organisations={createModalOrganisations}
      clubs={createModalClubs}
      teams={createModalTeams}
      initialOrganisationId={initialOrganisationId}
      initialClubId={initialClubId}
      initialTeamId={initialTeamId}
      initialSeasonId={initialSeasonId}
      onCreate={onCreateMatch}
    />

    <SeasonSquadAddMemberModal
      opened={isAddSquadMemberModalOpen}
      onClose={onCloseAddSquadMember}
      apiBaseUrl={apiBaseUrl}
      seasonId={squadSeasonId}
      organisations={createModalOrganisations}
      clubs={createModalClubs}
      teams={createModalTeams}
      initialOrganisationId={initialOrganisationId}
      initialClubId={initialClubId}
      initialTeamId={initialTeamId}
      onAdd={onAddSquadMember}
    />
  </>
);

export default SeasonDetailModals;
