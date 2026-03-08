/**
 * PeriodDetailsStep — Period create wizard step 2: name, dates, sport.
 *
 * - Name (with smart default suggestion)
 * - Start date + End date
 * - Sport variant select (optional)
 */
import React from 'react';
import { Type, Calendar, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface SportVariantOption {
  id: string;
  name: string;
  sport_icon?: string;
  category_name?: string | null;
}

export interface PeriodDetailsData {
  name: string;
  setName: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedSportId: string;
  setSelectedSportId: (v: string) => void;
  sportVariants: SportVariantOption[];
  sportsLoading: boolean;
  periodTypeLabel: string;
  nameSuggestion: string;
}

// ─── Component ────────────────────────────────────────────

export function PeriodDetailsStep({ data }: { data: PeriodDetailsData }) {
  const { next } = useWizard();

  const canProceed = data.name.trim() && data.startDate && data.endDate;

  return (
    <div className={styles.periodStepWrap}>
      <p className={styles.periodStepHint}>
        Vul de details in voor het {data.periodTypeLabel.toLowerCase()}.
      </p>

      {/* Name */}
      <div className={styles.periodFieldGroup}>
        <label className={styles.periodFieldLabel}>
          <Type size={14} />
          Naam *
        </label>
        <input
          className={styles.periodInput}
          type="text"
          placeholder={data.nameSuggestion || `${data.periodTypeLabel} naam…`}
          value={data.name}
          onChange={(e) => data.setName(e.target.value)}
          autoFocus
        />
        {data.nameSuggestion && !data.name && (
          <button
            className={styles.periodSuggestionBtn}
            onClick={() => data.setName(data.nameSuggestion)}
            type="button"
          >
            Suggestie: {data.nameSuggestion}
          </button>
        )}
      </div>

      {/* Dates row */}
      <div className={styles.periodFieldRow}>
        <div className={styles.periodFieldGroup}>
          <label className={styles.periodFieldLabel}>
            <Calendar size={14} />
            Startdatum *
          </label>
          <input
            className={styles.periodInput}
            type="date"
            value={data.startDate}
            onChange={(e) => data.setStartDate(e.target.value)}
          />
        </div>
        <div className={styles.periodFieldGroup}>
          <label className={styles.periodFieldLabel}>
            <Calendar size={14} />
            Einddatum *
          </label>
          <input
            className={styles.periodInput}
            type="date"
            value={data.endDate}
            onChange={(e) => data.setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Sport variant (optional) */}
      {data.sportVariants.length > 0 && (
        <div className={styles.periodFieldGroup}>
          <label className={styles.periodFieldLabel}>
            Sport variant (optioneel)
          </label>
          <select
            className={styles.periodSelect}
            value={data.selectedSportId}
            onChange={(e) => data.setSelectedSportId(e.target.value)}
            disabled={data.sportsLoading}
          >
            <option value="">Selecteer sport…</option>
            {data.sportVariants.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sport_icon ? `${s.sport_icon} ` : ''}{s.name}
                {s.category_name ? ` (${s.category_name})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Next */}
      <button
        className={styles.periodNextBtn}
        disabled={!canProceed}
        onClick={() => next()}
        type="button"
      >
        Bevestigen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
