import React from 'react';
import PeriodEditModal from '../identity/PeriodEditModal';
import { type PeriodLike } from '../identity/PeriodEditModal';
import MatchEditModal from '../identity/MatchEditModal';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodCreateModal from '../identity/PeriodCreateModal';
import type { PeriodCreatePayload } from '../identity/PeriodCreateModal/types';
import MatchCreateModal from '../identity/MatchCreateModal';
import type { MatchCreatePayload } from '../identity/matchCreateTypes';
import MatchDetailModal from '../identity/MatchDetailModal';
import SeasonSquadAddMemberModal from '../identity/SeasonSquadAddMemberModal';
import type { SeasonSquadAddMemberPayload } from '../identity/SeasonSquadAddMemberModal';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';

/** Minimal match shape for modal props. */
export interface MatchLike {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  activity_type?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** For org/club/team select options passed to create modals. */
interface ModalSelectOption {
  id: string;
  name: string;
  slug?: string;
  [key: string]: unknown;
}

// ─── Sub-interfaces ──────────────────────────────────────────────────────────

export interface TransactionModalConfig {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgId: string;
  projectId: string;
  seasonId: string;
  currentUserId: number;
  walletOptions: WalletOption[];
}

export interface PeriodEditConfig {
  isOpen: boolean;
  onClose: () => void;
  selected: PeriodLike | null;
  isSeasonPeriod: (p: PeriodLike | null) => boolean;
  organisationSportId: string | null;
  onSave: (period: PeriodLike, payload: Record<string, unknown>) => Promise<void>;
}

export interface PeriodDetailConfig {
  isOpen: boolean;
  onClose: () => void;
  selected: PeriodLike | null;
}

export interface MatchDetailConfig {
  isOpen: boolean;
  onClose: () => void;
  selected: MatchLike | null;
}

export interface MatchEditConfig {
  isOpen: boolean;
  onClose: () => void;
  selected: MatchLike | null;
  onSave: (match: MatchLike, payload: Record<string, unknown>) => Promise<void>;
}

export interface CompetitionCreateConfig {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: PeriodCreatePayload) => Promise<void>;
  organisations: ModalSelectOption[];
  clubs: ModalSelectOption[];
  teams: ModalSelectOption[];
  initialOrganisationId: string;
  initialClubId: string;
  initialTeamId: string;
  initialSeasonId: string;
}

export interface MatchCreateGroupConfig {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;
  apiBaseUrl: string;
}

export interface SquadAddMemberConfig {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: SeasonSquadAddMemberPayload) => Promise<void>;
  seasonId: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SeasonDetailModalsProps {
  transactionModal: TransactionModalConfig;
  periodEdit: PeriodEditConfig;
  periodDetail: PeriodDetailConfig;
  matchDetail: MatchDetailConfig;
  matchEdit: MatchEditConfig;
  competitionCreate: CompetitionCreateConfig;
  matchCreate: MatchCreateGroupConfig;
  squadAddMember: SquadAddMemberConfig;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SeasonDetailModals: React.FC<SeasonDetailModalsProps> = ({
  transactionModal,
  periodEdit,
  periodDetail,
  matchDetail,
  matchEdit,
  competitionCreate,
  matchCreate,
  squadAddMember,
}) => (
  <>
    <CreateTransactionModal
      isOpen={transactionModal.isOpen}
      onClose={transactionModal.onClose}
      onCreated={transactionModal.onCreated}
      title="Create season transaction"
      scope="season"
      organizationId={transactionModal.orgId}
      defaultProjectId={transactionModal.projectId}
      seasonId={transactionModal.seasonId}
      periodId={transactionModal.seasonId}
      activityId={null}
      currentUserId={transactionModal.currentUserId}
      chargedUserId={null}
      walletOptions={transactionModal.walletOptions}
    />

    <PeriodEditModal
      opened={periodEdit.isOpen}
      onClose={periodEdit.onClose}
      period={periodEdit.selected}
      showSportVariant={!periodEdit.isSeasonPeriod(periodEdit.selected)}
      organisationSportId={periodEdit.organisationSportId}
      onSave={async (payload) => {
        if (!periodEdit.selected) return;
        await periodEdit.onSave(periodEdit.selected, payload);
      }}
    />

    <PeriodDetailModal
      opened={periodDetail.isOpen}
      onClose={periodDetail.onClose}
      period={periodDetail.selected}
    />

    <MatchDetailModal
      opened={matchDetail.isOpen}
      onClose={matchDetail.onClose}
      match={matchDetail.selected}
    />

    <MatchEditModal
      opened={matchEdit.isOpen}
      onClose={matchEdit.onClose}
      match={matchEdit.selected}
      onSave={async (payload) => {
        if (!matchEdit.selected) return;
        await matchEdit.onSave(matchEdit.selected, payload);
      }}
    />

    <PeriodCreateModal
      opened={competitionCreate.isOpen}
      onClose={competitionCreate.onClose}
      title="Create Competition"
      organisations={competitionCreate.organisations}
      clubs={competitionCreate.clubs}
      teams={competitionCreate.teams}
      requirements={{
        requireOrganisation: true,
        requireClub: true,
        requireTeam: true,
        requireSeason: true,
        showSportVariant: true,
      }}
      initialOrganisationId={competitionCreate.initialOrganisationId}
      initialClubId={competitionCreate.initialClubId}
      initialTeamId={competitionCreate.initialTeamId}
      initialSeasonId={competitionCreate.initialSeasonId}
      onCreate={competitionCreate.onCreate}
    />

    <MatchCreateModal
      opened={matchCreate.isOpen}
      onClose={matchCreate.onClose}
      mode="season-detail"
      apiBaseUrl={matchCreate.apiBaseUrl}
      selectOptions={{
        organisations: competitionCreate.organisations,
        clubs: competitionCreate.clubs,
        teams: competitionCreate.teams,
      }}
      initialIds={{
        organisationId: competitionCreate.initialOrganisationId,
        clubId: competitionCreate.initialClubId,
        teamId: competitionCreate.initialTeamId,
        seasonId: competitionCreate.initialSeasonId,
      }}
      onCreate={matchCreate.onCreate}
    />

    <SeasonSquadAddMemberModal
      opened={squadAddMember.isOpen}
      onClose={squadAddMember.onClose}
      apiBaseUrl={matchCreate.apiBaseUrl}
      seasonId={squadAddMember.seasonId}
      organisations={competitionCreate.organisations}
      clubs={competitionCreate.clubs}
      teams={competitionCreate.teams}
      initialOrganisationId={competitionCreate.initialOrganisationId}
      initialClubId={competitionCreate.initialClubId}
      initialTeamId={competitionCreate.initialTeamId}
      onAdd={squadAddMember.onAdd}
    />
  </>
);

export default SeasonDetailModals;
