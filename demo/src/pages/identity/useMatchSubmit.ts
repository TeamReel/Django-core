import React from 'react';
import type { MatchCreatePayload } from './matchCreateTypes';
import { combineDateTime, addHoursToIsoLike } from './matchCreateHelpers';
import type { useMatchFormState } from './useMatchFormState';
import type { useMatchDerived } from './useMatchDerived';

// ─── Props ───────────────────────────────────────────────────────────────────

type FormState = ReturnType<typeof useMatchFormState>;
type DerivedState = ReturnType<typeof useMatchDerived>;

export interface UseMatchSubmitProps {
  form: FormState;
  derivedState: DerivedState;
  requireOpponent: boolean;
  initialSeasonId: string;
  initialCompetitionId: string;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;
  onClose: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMatchSubmit({
  form,
  derivedState,
  requireOpponent,
  initialSeasonId,
  initialCompetitionId,
  onCreate,
  onClose,
}: UseMatchSubmitProps) {
  const {
    setTitle, setTitleTouched, setTitleAutoValue,
    setMatchDate, setMatchTime,
    setLocation, setLocationTouched, setLocationAutoValue,
    setDescription, setDescriptionTouched, setDescriptionAutoValue,
    setIsSaving, setError,
    matchDate, matchTime, venue, location, description,
    selectedOrganisationId, selectedTeamId,
    selectedOpponentTeamId, selectedSeasonId, selectedCompetitionId,
  } = form;

  const { derived, effectiveTitle, resolvedClubId } = derivedState;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const effectiveSeasonIdForCreate = String(selectedSeasonId || initialSeasonId || '').trim();
      const effectiveCompetitionIdForCreate = String(selectedCompetitionId || initialCompetitionId || '').trim();

      if (!selectedOrganisationId) throw new Error('Select a federation first.');
      if (!resolvedClubId) throw new Error('Select a club first.');
      if (!selectedTeamId) throw new Error('Select a team first.');
      if (requireOpponent && !selectedOpponentTeamId) throw new Error('Select an opponent first.');
      if (!effectiveSeasonIdForCreate) throw new Error('Select a season first.');
      if (!effectiveCompetitionIdForCreate) throw new Error('Select a competition first.');

      const start = combineDateTime(matchDate, matchTime);
      if (!start) throw new Error('Select a match date and time.');

      const end = addHoursToIsoLike(start, 2);

      const finalTitle = effectiveTitle.trim() || derived.titleDefault || '';
      if (!finalTitle) throw new Error('Enter a title.');

      const finalLocation = (location || derived.locationDefault || '').trim() || undefined;
      const finalDescription = (description || derived.descriptionDefault || '').trim() || undefined;

      const metadataFinal = {
        ...(derived.metadataBase || {}),
        teamreel: {
          ...(derived.metadataBase?.teamreel || {}),
          match_context: {
            ...((derived.metadataBase?.teamreel || {})?.match_context || {}),
            title: finalTitle,
            venue,
            is_home: venue === 'Home',
            start_time: start,
            end_time: end,
            match_date: matchDate || null,
            match_time: matchTime || null,
            location: finalLocation || null,
            description: finalDescription || null,
          },
          vars: {
            ...((derived.metadataBase?.teamreel || {})?.vars || {}),
            match_title: finalTitle,
            match_venue: venue,
            match_date: matchDate || null,
            match_time: matchTime || null,
            match_location: finalLocation || null,
          },
        },
      };

      await onCreate({
        title: finalTitle,
        start_time: start,
        end_time: end,
        location: finalLocation,
        description: finalDescription,
        metadata: metadataFinal,
        venue,
        organisation_id: selectedOrganisationId,
        project_id: selectedTeamId,
        opponent_project_id: selectedOpponentTeamId || undefined,
        season_id: effectiveSeasonIdForCreate,
        period_id: effectiveCompetitionIdForCreate,
      });

      // Reset form
      setTitle('');
      setTitleTouched(false);
      setTitleAutoValue('');
      setMatchDate('');
      setMatchTime('');
      setLocation('');
      setLocationTouched(false);
      setLocationAutoValue('');
      setDescription('');
      setDescriptionTouched(false);
      setDescriptionAutoValue('');
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setIsSaving(false);
    }
  };

  return { handleCreate };
}
