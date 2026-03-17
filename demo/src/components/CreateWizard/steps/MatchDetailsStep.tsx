/**
 * MatchDetailsStep — Match create wizard step 1: core match details.
 *
 * Fields: Opponent (cascading select), Date, Time, Venue, Location.
 * Context fields (org/club/team/season/competition) are shown as a
 * read-only summary banner — those come from CreateWizardProvider prefill.
 *
 * Uses useMatchCreateData via the parent MatchCreateFlow.
 */
import React from 'react';
import { MapPin, Calendar, Clock, Trophy, Shield, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizardMatch.module.css';

export interface MatchDetailsData {
  // Season & Competition
  seasonOptions: { id: string | number; name: string }[];
  selectedSeasonId: string;
  setSelectedSeasonId: (v: string) => void;
  loadingSeasons: boolean;
  competitionOptions: { id: string | number; name: string }[];
  selectedCompetitionId: string;
  setSelectedCompetitionId: (v: string) => void;
  loadingCompetitions: boolean;

  // Opponent
  selectedOpponentOrganisationId: string;
  setSelectedOpponentOrganisationId: (v: string) => void;
  selectedOpponentClubId: string;
  setSelectedOpponentClubId: (v: string) => void;
  selectedOpponentTeamId: string;
  setSelectedOpponentTeamId: (v: string) => void;
  loadingOpponentTeams: boolean;
  loadingOpponentClubs: boolean;
  sortedOrganisations: { id: string; name: string }[];
  filteredOpponentClubs: { id: string | number; name: string }[];
  opponentTeamOptions: { id: string | number; name: string }[];

  // Match details
  matchDate: string;
  setMatchDate: (v: string) => void;
  matchTime: string;
  setMatchTime: (v: string) => void;
  venue: 'Home' | 'Away';
  setVenue: (v: 'Home' | 'Away') => void;
  location: string;
  setLocation: (v: string) => void;
  setLocationTouched: (v: boolean) => void;

  // Context summary
  contextSummary: string;
}

export interface MatchDetailsStepProps {
  data: MatchDetailsData;
}

export function MatchDetailsStep({ data }: MatchDetailsStepProps) {
  const { next } = useWizard();

  const canAdvance = !!data.selectedCompetitionId && !!data.selectedOpponentTeamId && !!data.matchDate && !!data.matchTime;

  const handleNext = () => {
    if (canAdvance) next();
  };

  return (
    <div className={styles.matchStepWrap}>
      {/* Context banner */}
      {data.contextSummary && (
        <div className={styles.contextHint}>
          {data.contextSummary}
        </div>
      )}

      {/* Season */}
      <div className={styles.matchFieldGroup}>
        <label className={styles.matchFieldLabel}>
          <Calendar size={15} /> Seizoen
        </label>
        <select
          className={styles.matchSelect}
          value={data.selectedSeasonId}
          onChange={(e) => {
            data.setSelectedSeasonId(e.target.value);
            data.setSelectedCompetitionId('');
          }}
          disabled={data.loadingSeasons}
        >
          <option value="">{data.loadingSeasons ? 'Laden…' : 'Kies seizoen…'}</option>
          {data.seasonOptions.map((s) => (
            <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Competition */}
      <div className={styles.matchFieldGroup}>
        <label className={styles.matchFieldLabel}>
          <Trophy size={15} /> Competitie
        </label>
        <select
          className={styles.matchSelect}
          value={data.selectedCompetitionId}
          onChange={(e) => data.setSelectedCompetitionId(e.target.value)}
          disabled={data.loadingCompetitions || !data.selectedSeasonId}
          required
        >
          <option value="">{data.loadingCompetitions ? 'Laden…' : 'Kies competitie…'}</option>
          {data.competitionOptions.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Opponent selection */}
      <div className={styles.matchFieldGroup}>
        <label className={styles.matchFieldLabel}>
          <Shield size={15} /> Tegenstander
        </label>

        {/* Opponent federation (optional) */}
        <select
          className={styles.matchSelect}
          value={data.selectedOpponentOrganisationId}
          onChange={(e) => {
            data.setSelectedOpponentOrganisationId(e.target.value);
            data.setSelectedOpponentClubId('');
            data.setSelectedOpponentTeamId('');
          }}
        >
          <option value="">Bond (optioneel)…</option>
          {data.sortedOrganisations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        {/* Opponent club (optional, filtered by org) */}
        {data.selectedOpponentOrganisationId && (
          <select
            className={styles.matchSelect}
            value={data.selectedOpponentClubId}
            onChange={(e) => {
              data.setSelectedOpponentClubId(e.target.value);
              data.setSelectedOpponentTeamId('');
            }}
            disabled={data.loadingOpponentClubs}
          >
            <option value="">{data.loadingOpponentClubs ? 'Laden…' : 'Club (optioneel)…'}</option>
            {data.filteredOpponentClubs.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Opponent team */}
        <select
          className={styles.matchSelect}
          value={data.selectedOpponentTeamId}
          onChange={(e) => data.setSelectedOpponentTeamId(e.target.value)}
          disabled={data.loadingOpponentTeams || !data.selectedOpponentOrganisationId}
          required
        >
          <option value="">{data.loadingOpponentTeams ? 'Laden…' : 'Kies tegenstander…'}</option>
          {data.opponentTeamOptions.map((t) => (
            <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Date & Time */}
      <div className={styles.matchFieldRow}>
        <div className={styles.matchFieldGroup}>
          <label className={styles.matchFieldLabel}>
            <Calendar size={15} /> Datum
          </label>
          <input
            type="date"
            className={styles.matchInput}
            value={data.matchDate}
            onChange={(e) => data.setMatchDate(e.target.value)}
            required
          />
        </div>
        <div className={styles.matchFieldGroup}>
          <label className={styles.matchFieldLabel}>
            <Clock size={15} /> Tijd
          </label>
          <input
            type="time"
            className={styles.matchInput}
            value={data.matchTime}
            onChange={(e) => data.setMatchTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Venue toggle */}
      <div className={styles.matchFieldGroup}>
        <label className={styles.matchFieldLabel}>Thuis / Uit</label>
        <div className={styles.matchVenueToggle}>
          <button
            type="button"
            className={styles.matchVenueBtn}
            data-active={data.venue === 'Home'}
            onClick={() => data.setVenue('Home')}
          >
            Thuis
          </button>
          <button
            type="button"
            className={styles.matchVenueBtn}
            data-active={data.venue === 'Away'}
            onClick={() => data.setVenue('Away')}
          >
            Uit
          </button>
        </div>
      </div>

      {/* Location */}
      <div className={styles.matchFieldGroup}>
        <label className={styles.matchFieldLabel}>
          <MapPin size={15} /> Locatie
        </label>
        <input
          type="text"
          className={styles.matchInput}
          value={data.location}
          onChange={(e) => {
            data.setLocationTouched(true);
            data.setLocation(e.target.value);
          }}
          placeholder="Bijv. Sportpark De Toekomst"
        />
      </div>

      {/* Next button */}
      <button
        type="button"
        className={styles.matchNextBtn}
        disabled={!canAdvance}
        onClick={handleNext}
      >
        Bevestigen <ChevronRight size={18} />
      </button>
    </div>
  );
}
