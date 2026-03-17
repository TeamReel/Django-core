/**
 * PeriodTypeStep — Period create wizard step 1: type + parent season.
 *
 * - Type: Seizoen (top-level) or Competitie (child of season)
 * - If competitie: select parent season
 * - Context banner shows pre-filled team info
 */
import React from 'react';
import { Calendar, Trophy, ChevronRight, Loader } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { WizardEmptyState } from '../shared/WizardEmptyState';
import styles from '../CreateWizardPeriod.module.css';

// ─── Types ────────────────────────────────────────────────

export type PeriodType = 'season' | 'competition';

export interface SeasonOption {
  id: string;
  name: string;
}

export interface PeriodTypeData {
  periodType: PeriodType;
  setPeriodType: (v: PeriodType) => void;
  selectedSeasonId: string;
  setSelectedSeasonId: (v: string) => void;
  seasonOptions: SeasonOption[];
  seasonsLoading: boolean;
  contextSummary: string;
}

// ─── Component ────────────────────────────────────────────

export function PeriodTypeStep({ data }: { data: PeriodTypeData }) {
  const { next } = useWizard();
  const { selectFlow } = useCreateWizard();

  const canProceed =
    data.periodType === 'season' ||
    (data.periodType === 'competition' && !!data.selectedSeasonId);

  return (
    <div className={styles.periodStepWrap}>
      {data.contextSummary && (
        <div className={styles.periodContextBanner}>
          <Calendar size={14} />
          <span>{data.contextSummary}</span>
        </div>
      )}

      {/* Type toggle */}
      <div className={styles.periodFieldGroup}>
        <label className={styles.periodFieldLabel}>Type *</label>
        <div className={styles.periodTypeToggle}>
          <button
            className={styles.periodTypeBtn}
            data-active={data.periodType === 'season'}
            onClick={() => data.setPeriodType('season')}
            type="button"
          >
            <Calendar size={16} />
            Seizoen
          </button>
          <button
            className={styles.periodTypeBtn}
            data-active={data.periodType === 'competition'}
            onClick={() => data.setPeriodType('competition')}
            type="button"
          >
            <Trophy size={16} />
            Competitie
          </button>
        </div>
      </div>

      {/* Parent season select (only for competition) */}
      {data.periodType === 'competition' && (
        <div className={styles.periodFieldGroup}>
          <label className={styles.periodFieldLabel}>
            Bovenliggend seizoen *
          </label>
          <select
            className={styles.periodSelect}
            value={data.selectedSeasonId}
            onChange={(e) => data.setSelectedSeasonId(e.target.value)}
            disabled={data.seasonsLoading}
          >
            <option value="">
              {data.seasonsLoading ? 'Seizoenen laden…' : 'Selecteer seizoen…'}
            </option>
            {data.seasonOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {!data.seasonsLoading && data.seasonOptions.length === 0 && (
            <WizardEmptyState
              icon={Calendar}
              title="Nog geen seizoenen"
              description="Maak eerst een seizoen aan voordat je een competitie kunt starten."
              actions={[{
                label: 'Seizoen aanmaken',
                onClick: () => {
                  data.setPeriodType('season');
                },
              }]}
            />
          )}
        </div>
      )}

      {/* Next */}
      <button
        className={styles.periodNextBtn}
        disabled={!canProceed}
        onClick={() => next()}
        type="button"
      >
        Details invullen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
