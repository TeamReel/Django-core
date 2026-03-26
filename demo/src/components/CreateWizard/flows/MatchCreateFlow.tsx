/**
 * MatchCreateFlow — "Wedstrijd aanmaken" sub-flow inside CreateWizard (M1).
 *
 * Wraps the existing useMatchCreateData hook (reusing all cascading logic,
 * form state, and API submission) in a 2‑step wizard:
 *   Step 1 (matchDetails): opponent, date, time, venue, location
 *   Step 2 (matchConfirm): summary + submit + post-create actions
 *
 * Pre‑fills org/club/team/season/competition from CreateWizardProvider.
 */
import React, { useCallback, useMemo } from 'react';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { ChooseFlowStep } from '../steps/ChooseFlowStep';
import { MatchDetailsStep, type MatchDetailsData } from '../steps/MatchDetailsStep';
import { MatchConfirmStep, type MatchConfirmData } from '../steps/MatchConfirmStep';

import { useMatchCreateData } from '@/pages/identity/useMatchCreateData';
import type { MatchCreatePayload } from '@/pages/identity/matchCreateTypes';
import { api } from '@/api';

// ─── Step config ──────────────────────────────────────────

const MATCH_CREATE_STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'matchDetails', title: 'Wedstrijd details' },
  { id: 'matchConfirm', title: 'Bevestigen' },
];

// ─── Props ────────────────────────────────────────────────

export interface MatchCreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────

export function MatchCreateFlow({ isOpen, onClose }: MatchCreateFlowProps) {
  const { resetAll, selectedFlow, prefill } = useCreateWizard();

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  // Build the onCreate handler that POSTs to the API
  const handleCreateMatch = useCallback(async (payload: MatchCreatePayload) => {
    const teamId = String(payload.project_id || '').trim();
    const competitionId = String(payload.period_id || '').trim();
    if (!teamId) throw new Error('Selecteer eerst een team.');
    if (!competitionId) throw new Error('Selecteer eerst een competitie.');

    await api.post('/activities/', {
      title: payload.title,
      activity_type: 'match',
      project_id: teamId ? Number(teamId) : undefined,
      opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
      period_id: competitionId,
      start_time: payload.start_time,
      end_time: payload.end_time,
      location: payload.location,
      description: payload.description,
      metadata: {
        venue: payload.venue || 'Home',
        is_home: (payload.venue || 'Home') === 'Home',
        ...(payload.metadata || {}),
      },
    });

    // Trigger queue update event so lists refresh
    window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
  }, []);

  // Initialise the existing useMatchCreateData hook with prefill values
  const d = useMatchCreateData({
    opened: isOpen,
    onClose: handleClose,
    onCreate: handleCreateMatch,
    mode: 'team-context',
    initialIds: {
      organisationId: prefill.organisationId || '',
      clubId: prefill.clubProjectId ? String(prefill.clubProjectId) : '',
      teamId: prefill.teamIdForApi ? String(prefill.teamIdForApi) : (prefill.teamProjectId ? String(prefill.teamProjectId) : ''),
      seasonId: prefill.periodId || '',
      competitionId: prefill.competitionId || '',
    },
  });

  // Map hook data → step data interfaces
  const detailsData: MatchDetailsData = useMemo(() => ({
    seasonOptions: d.seasonOptions as { id: string | number; name: string }[],
    selectedSeasonId: d.selectedSeasonId,
    setSelectedSeasonId: d.setSelectedSeasonId,
    loadingSeasons: d.loadingSeasons,
    competitionOptions: d.competitionOptions as { id: string | number; name: string }[],
    selectedCompetitionId: d.selectedCompetitionId,
    setSelectedCompetitionId: d.setSelectedCompetitionId,
    loadingCompetitions: d.loadingCompetitions,
    selectedOpponentOrganisationId: d.selectedOpponentOrganisationId,
    setSelectedOpponentOrganisationId: d.setSelectedOpponentOrganisationId,
    selectedOpponentClubId: d.selectedOpponentClubId,
    setSelectedOpponentClubId: d.setSelectedOpponentClubId,
    selectedOpponentTeamId: d.selectedOpponentTeamId,
    setSelectedOpponentTeamId: d.setSelectedOpponentTeamId,
    loadingOpponentTeams: d.loadingOpponentTeams,
    loadingOpponentClubs: d.loadingOpponentClubs,
    sortedOrganisations: d.sortedOrganisations,
    filteredOpponentClubs: d.filteredOpponentClubs as { id: string | number; name: string }[],
    opponentTeamOptions: d.opponentTeamOptions as { id: string | number; name: string }[],
    matchDate: d.matchDate,
    setMatchDate: d.setMatchDate,
    matchTime: d.matchTime,
    setMatchTime: d.setMatchTime,
    venue: d.venue,
    setVenue: d.setVenue,
    location: d.location,
    setLocation: d.setLocation,
    setLocationTouched: d.setLocationTouched,
    contextSummary: buildContextSummary(prefill),
  }), [d, prefill]);

  // Find opponent name from options
  const opponentName = useMemo(() => {
    const id = d.selectedOpponentTeamId;
    if (!id) return '';
    const found = d.opponentTeamOptions.find((t) => String(t.id) === id);
    return found ? String(found.name || '') : '';
  }, [d.selectedOpponentTeamId, d.opponentTeamOptions]);

  // Resolve season/competition names from current selections (not just prefill)
  const resolvedSeasonName = useMemo(() => {
    if (d.selectedSeasonId) {
      const found = d.seasonOptions.find((s) => String(s.id) === d.selectedSeasonId);
      if (found?.name) return String(found.name);
    }
    return prefill.periodName || '';
  }, [d.selectedSeasonId, d.seasonOptions, prefill.periodName]);

  const resolvedCompetitionName = useMemo(() => {
    if (d.selectedCompetitionId) {
      const found = d.competitionOptions.find((c) => String(c.id) === d.selectedCompetitionId);
      if (found?.name) return String(found.name);
    }
    return prefill.competitionName || '';
  }, [d.selectedCompetitionId, d.competitionOptions, prefill.competitionName]);

  const confirmData: MatchConfirmData = useMemo(() => ({
    effectiveTitle: d.effectiveTitle,
    teamName: prefill.teamName || '',
    opponentName,
    seasonName: resolvedSeasonName,
    competitionName: resolvedCompetitionName,
    matchDate: d.matchDate,
    matchTime: d.matchTime,
    venue: d.venue,
    location: d.location,
    handleCreate: d.handleCreate,
    isSaving: d.isSaving,
    error: d.error,
  }), [d, prefill, opponentName, resolvedSeasonName, resolvedCompetitionName]);

  return (
    <WizardProvider
      steps={MATCH_CREATE_STEPS}
      initialStepId={selectedFlow ? 'matchDetails' : 'choose'}
      initialHistory={selectedFlow ? ['choose'] : []}
      onClose={handleClose}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="choose">
          <ChooseFlowStep />
        </WizardStep>

        <WizardStep stepId="matchDetails">
          <MatchDetailsStep data={detailsData} />
        </WizardStep>

        <WizardStep stepId="matchConfirm">
          <MatchConfirmStep data={confirmData} />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// ── Helper ──
function buildContextSummary(prefill: Record<string, any>): string {
  // Only show team — season/competition are now separate selectable fields
  return prefill.teamName ? String(prefill.teamName) : '';
}

export default MatchCreateFlow;
