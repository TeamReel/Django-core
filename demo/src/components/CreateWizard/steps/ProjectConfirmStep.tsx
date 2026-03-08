/**
 * ProjectConfirmStep — Project create wizard step 3: summary + submit.
 *
 * Shows summary, submits project, then offers post-create actions:
 * - "Leden toevoegen" → switch to MemberAddFlow
 * - "Seizoen aanmaken" → switch to PeriodCreateFlow
 * - "Nog een team/club" → reset form
 */
import React, { useState } from 'react';
import { CheckCircle, UserPlus, CalendarDays, Plus, Loader } from 'lucide-react';
import { useCreateWizard } from '../CreateWizardContext';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface ProjectConfirmData {
  name: string;
  description: string;
  projectTypeLabel: string;
  organisationName: string;
  clubName: string;
  handleSubmit: () => Promise<void>;
  isSaving: boolean;
  error: string | null;
  resetForm: () => void;
}

// ─── Component ────────────────────────────────────────────

export function ProjectConfirmStep({ data }: { data: ProjectConfirmData }) {
  const { resetAll, clearFlow, selectFlow, setPrefill, prefill } = useCreateWizard();
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
      <div className={styles.projectConfirmSuccess}>
        <CheckCircle size={48} className={styles.projectConfirmSuccessIcon} />
        <h3 className={styles.projectConfirmSuccessTitle}>
          {data.projectTypeLabel} &ldquo;{data.name}&rdquo; aangemaakt!
        </h3>
        <p className={styles.projectConfirmSuccessSubtitle}>
          {data.projectTypeLabel === 'Club'
            ? 'Er is automatisch een eerste team aangemaakt.'
            : `Toegevoegd aan ${data.clubName || 'de club'}.`}
        </p>

        <div className={styles.projectConfirmActions}>
          <button
            className={styles.projectConfirmActionBtn}
            data-variant="primary"
            onClick={() => {
              // Switch to member flow - prefill stays
              selectFlow('member');
            }}
            type="button"
          >
            <UserPlus size={18} />
            Leden toevoegen
          </button>

          <button
            className={styles.projectConfirmActionBtn}
            data-variant="secondary"
            onClick={() => {
              selectFlow('season');
            }}
            type="button"
          >
            <CalendarDays size={18} />
            Seizoen aanmaken
          </button>

          <button
            className={styles.projectConfirmActionBtn}
            data-variant="secondary"
            onClick={() => {
              setSuccess(false);
              data.resetForm();
            }}
            type="button"
          >
            <Plus size={18} />
            Nog een {data.projectTypeLabel.toLowerCase()} aanmaken
          </button>
        </div>
      </div>
    );
  }

  // ── Summary + submit ──────────────────────────────────
  return (
    <div className={styles.projectStepWrap}>
      <div className={styles.projectSummaryCard}>
        <div className={styles.projectSummaryRow}>
          <span className={styles.projectSummaryLabel}>Type</span>
          <span className={styles.projectSummaryValue}>{data.projectTypeLabel}</span>
        </div>
        <div className={styles.projectSummaryRow}>
          <span className={styles.projectSummaryLabel}>Naam</span>
          <span className={styles.projectSummaryValue}>{data.name}</span>
        </div>
        {data.organisationName && (
          <div className={styles.projectSummaryRow}>
            <span className={styles.projectSummaryLabel}>Federatie</span>
            <span className={styles.projectSummaryValue}>{data.organisationName}</span>
          </div>
        )}
        {data.clubName && (
          <div className={styles.projectSummaryRow}>
            <span className={styles.projectSummaryLabel}>Club</span>
            <span className={styles.projectSummaryValue}>{data.clubName}</span>
          </div>
        )}
        {data.description && (
          <div className={styles.projectSummaryRow}>
            <span className={styles.projectSummaryLabel}>Beschrijving</span>
            <span className={styles.projectSummaryValue}>{data.description}</span>
          </div>
        )}
      </div>

      {data.error && (
        <div className={styles.projectError}>{data.error}</div>
      )}

      <button
        className={styles.projectNextBtn}
        disabled={data.isSaving}
        onClick={handleSubmit}
        type="button"
      >
        {data.isSaving ? (
          <>
            <Loader size={18} className={styles.projectSpinner} />
            Aanmaken…
          </>
        ) : (
          <>
            <Plus size={18} />
            {data.projectTypeLabel} aanmaken
          </>
        )}
      </button>
    </div>
  );
}
