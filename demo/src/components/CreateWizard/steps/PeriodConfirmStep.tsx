/**
 * PeriodConfirmStep — Period create wizard step 3: summary + submit.
 *
 * Post-create actions:
 * - "Match plannen" → switch to MatchCreateFlow with period pre-filled
 * - "Nog een competitie" → reset, keep season as parent
 * - "Terug" → close
 */
import React, { useState } from 'react';
import { CheckCircle, Calendar, CalendarDays, Plus, Loader } from 'lucide-react';
import { useCreateWizard } from '../CreateWizardContext';
import styles from '../CreateWizardPeriod.module.css';

// ─── Types ────────────────────────────────────────────────

export interface PeriodConfirmData {
  name: string;
  periodTypeLabel: string;
  teamName: string;
  seasonName: string;
  startDate: string;
  endDate: string;
  sportName: string;
  handleSubmit: () => Promise<void>;
  isSaving: boolean;
  error: string | null;
  resetForm: () => void;
}

// ─── Helpers ──────────────────────────────────────────────

function formatDateNL(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Component ────────────────────────────────────────────

export function PeriodConfirmStep({ data }: { data: PeriodConfirmData }) {
  const { resetAll, clearFlow, selectFlow } = useCreateWizard();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      await data.handleSubmit();
      setSuccess(true);
    } catch {
      // error handled via data.error
    }
  };

  // ── Post-create success ───────────────────────────────
  if (success) {
    return (
      <div className={styles.periodConfirmSuccess}>
        <CheckCircle size={48} className={styles.periodConfirmSuccessIcon} />
        <h3 className={styles.periodConfirmSuccessTitle}>
          {data.periodTypeLabel} &ldquo;{data.name}&rdquo; aangemaakt!
        </h3>
        <p className={styles.periodConfirmSuccessSubtitle}>
          {data.teamName ? `Toegevoegd aan ${data.teamName}.` : 'Succesvol aangemaakt.'}
        </p>

        <div className={styles.periodConfirmActions}>
          <button
            className={styles.periodConfirmActionBtn}
            data-variant="primary"
            onClick={() => selectFlow('match')}
            type="button"
          >
            <Calendar size={18} />
            Match plannen
          </button>

          <button
            className={styles.periodConfirmActionBtn}
            data-variant="secondary"
            onClick={() => {
              setSuccess(false);
              data.resetForm();
            }}
            type="button"
          >
            <Plus size={18} />
            Nog een {data.periodTypeLabel === 'Seizoen' ? 'seizoen' : 'competitie'} aanmaken
          </button>
        </div>
      </div>
    );
  }

  // ── Summary + submit ──────────────────────────────────
  return (
    <div className={styles.periodStepWrap}>
      <div className={styles.periodSummaryCard}>
        <div className={styles.periodSummaryRow}>
          <span className={styles.periodSummaryLabel}>Type</span>
          <span className={styles.periodSummaryValue}>{data.periodTypeLabel}</span>
        </div>
        <div className={styles.periodSummaryRow}>
          <span className={styles.periodSummaryLabel}>Naam</span>
          <span className={styles.periodSummaryValue}>{data.name}</span>
        </div>
        {data.teamName && (
          <div className={styles.periodSummaryRow}>
            <span className={styles.periodSummaryLabel}>Team</span>
            <span className={styles.periodSummaryValue}>{data.teamName}</span>
          </div>
        )}
        {data.seasonName && (
          <div className={styles.periodSummaryRow}>
            <span className={styles.periodSummaryLabel}>Seizoen</span>
            <span className={styles.periodSummaryValue}>{data.seasonName}</span>
          </div>
        )}
        <div className={styles.periodSummaryRow}>
          <span className={styles.periodSummaryLabel}>Periode</span>
          <span className={styles.periodSummaryValue}>
            {formatDateNL(data.startDate)} — {formatDateNL(data.endDate)}
          </span>
        </div>
        {data.sportName && (
          <div className={styles.periodSummaryRow}>
            <span className={styles.periodSummaryLabel}>Sport</span>
            <span className={styles.periodSummaryValue}>{data.sportName}</span>
          </div>
        )}
      </div>

      {data.error && (
        <div className={styles.periodError}>{data.error}</div>
      )}

      <button
        className={styles.periodNextBtn}
        disabled={data.isSaving}
        onClick={handleSubmit}
        type="button"
      >
        {data.isSaving ? (
          <>
            <Loader size={18} className={styles.periodSpinner} />
            Aanmaken…
          </>
        ) : (
          <>
            <CalendarDays size={18} />
            {data.periodTypeLabel} aanmaken
          </>
        )}
      </button>
    </div>
  );
}
