/**
 * MemberConfirmStep — Member add wizard: summary + submit + post-create.
 *
 * Shows a summary of who is being added, with what role.
 * Submit triggers the cascade: create user (if new) → org membership → club → team.
 * Post-create: "Nog een lid" / "Terug naar team" / "Nog iets anders".
 */
import React, { useState } from 'react';
import { CheckCircle, UserPlus, ArrowLeft, Plus, Loader } from 'lucide-react';
import { useCreateWizard } from '../CreateWizardContext';
import styles from '../CreateWizardMember.module.css';

// ─── Types ────────────────────────────────────────────────

export interface MemberConfirmData {
  /** User display name */
  memberName: string;
  memberEmail: string;
  /** Is this a new user or existing? */
  isNewUser: boolean;
  /** Role label */
  roleLabel: string;
  position: string;
  shirtNumber: string;
  /** Context */
  teamName: string;
  clubName: string;
  /** Submit handler */
  handleSubmit: () => Promise<void>;
  isSaving: boolean;
  error: string | null;
  /** Reset for "nog een lid" */
  resetForm: () => void;
}

// ─── Component ────────────────────────────────────────────

export function MemberConfirmStep({ data }: { data: MemberConfirmData }) {
  const { resetAll, clearFlow } = useCreateWizard();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      await data.handleSubmit();
      setSuccess(true);
    } catch {
      // error is handled via data.error
    }
  };

  // ── Post-create success ─────────────────────────────
  if (success) {
    return (
      <div className={styles.memberConfirmSuccess}>
        <CheckCircle size={48} className={styles.memberConfirmSuccessIcon} />
        <h3 className={styles.memberConfirmSuccessTitle}>
          {data.memberName} toegevoegd!
        </h3>
        <p className={styles.memberConfirmSuccessSubtitle}>
          {data.isNewUser ? 'Account aangemaakt en ' : ''}
          Toegevoegd aan {data.teamName || data.clubName || 'het team'}.
        </p>

        <div className={styles.memberConfirmActions}>
          <button
            className={styles.memberConfirmActionBtn}
            data-variant="primary"
            onClick={() => {
              setSuccess(false);
              data.resetForm();
            }}
            type="button"
          >
            <UserPlus size={18} />
            Nog een lid toevoegen
          </button>

          <button
            className={styles.memberConfirmActionBtn}
            data-variant="secondary"
            onClick={() => clearFlow()}
            type="button"
          >
            <Plus size={18} />
            Nog iets anders aanmaken
          </button>
        </div>
      </div>
    );
  }

  // ── Summary + submit ────────────────────────────────
  return (
    <div className={styles.memberStepWrap}>
      <div className={styles.memberSummaryCard}>
        <div className={styles.memberSummaryRow}>
          <span className={styles.memberSummaryLabel}>Naam</span>
          <span className={styles.memberSummaryValue}>{data.memberName}</span>
        </div>
        <div className={styles.memberSummaryRow}>
          <span className={styles.memberSummaryLabel}>Email</span>
          <span className={styles.memberSummaryValue}>{data.memberEmail}</span>
        </div>
        <div className={styles.memberSummaryRow}>
          <span className={styles.memberSummaryLabel}>Type</span>
          <span className={styles.memberSummaryValue}>
            {data.isNewUser ? 'Nieuw account' : 'Bestaand lid'}
          </span>
        </div>
        <div className={styles.memberSummaryRow}>
          <span className={styles.memberSummaryLabel}>Rol</span>
          <span className={styles.memberSummaryValue}>{data.roleLabel}</span>
        </div>
        {data.position && (
          <div className={styles.memberSummaryRow}>
            <span className={styles.memberSummaryLabel}>Positie</span>
            <span className={styles.memberSummaryValue}>{data.position}</span>
          </div>
        )}
        {data.shirtNumber && (
          <div className={styles.memberSummaryRow}>
            <span className={styles.memberSummaryLabel}>Rugnummer</span>
            <span className={styles.memberSummaryValue}>#{data.shirtNumber}</span>
          </div>
        )}
        {(data.teamName || data.clubName) && (
          <div className={styles.memberSummaryRow}>
            <span className={styles.memberSummaryLabel}>Team</span>
            <span className={styles.memberSummaryValue}>
              {data.teamName || data.clubName}
            </span>
          </div>
        )}
      </div>

      {data.error && (
        <div className={styles.memberError}>{data.error}</div>
      )}

      <button
        className={styles.memberNextBtn}
        disabled={data.isSaving}
        onClick={handleSubmit}
        type="button"
      >
        {data.isSaving ? (
          <>
            <Loader size={18} className={styles.memberSpinner} />
            Toevoegen…
          </>
        ) : (
          <>
            <UserPlus size={18} />
            Lid toevoegen
          </>
        )}
      </button>
    </div>
  );
}
