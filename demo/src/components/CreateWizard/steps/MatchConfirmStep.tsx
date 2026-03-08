/**
 * MatchConfirmStep — Match create wizard step 2: review + submit.
 *
 * Shows a summary of all fields, the auto-generated title,
 * and a submit button. After success shows post-create options.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Eye, Plus, Loader } from 'lucide-react';
import { useCreateWizard } from '../CreateWizardContext';
import styles from '../CreateWizard.module.css';

export interface MatchConfirmData {
  // Summary fields
  effectiveTitle: string;
  teamName: string;
  opponentName: string;
  seasonName: string;
  competitionName: string;
  matchDate: string;
  matchTime: string;
  venue: 'Home' | 'Away';
  location: string;

  // Submit
  handleCreate: (e: React.FormEvent) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

export interface MatchConfirmStepProps {
  data: MatchConfirmData;
  /** Called when user wants to generate content for the newly created match */
  onGenerateContent?: (matchId: string) => void;
}

export function MatchConfirmStep({ data, onGenerateContent }: MatchConfirmStepProps) {
  const navigate = useNavigate();
  const { resetAll } = useCreateWizard();
  const [created, setCreated] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Wrap in a fake FormEvent for the existing handler
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    try {
      await data.handleCreate(fakeEvent);
      setCreated(true);
    } catch {
      // error state is handled by data.error
    }
  };

  // ── Post-create state ──
  if (created) {
    return (
      <div className={styles.matchConfirmSuccess}>
        <CheckCircle size={48} className={styles.matchConfirmSuccessIcon} />
        <h3 className={styles.matchConfirmSuccessTitle}>Wedstrijd aangemaakt!</h3>
        <p className={styles.matchConfirmSuccessSubtitle}>{data.effectiveTitle}</p>

        <div className={styles.matchConfirmActions}>
          <button
            type="button"
            className={styles.matchConfirmActionBtn}
            data-variant="primary"
            onClick={() => {
              // Dispatch event to open content flow with this match
              window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', {
                detail: { flow: 'content' },
              }));
            }}
          >
            <Zap size={18} /> Content genereren
          </button>
          <button
            type="button"
            className={styles.matchConfirmActionBtn}
            data-variant="secondary"
            onClick={() => {
              resetAll();
            }}
          >
            <Plus size={18} /> Nog een match
          </button>
        </div>
      </div>
    );
  }

  // ── Review state ──
  const summaryRows = [
    { label: 'Wedstrijd', value: data.effectiveTitle },
    { label: 'Team', value: data.teamName },
    { label: 'Tegenstander', value: data.opponentName },
    { label: 'Competitie', value: [data.seasonName, data.competitionName].filter(Boolean).join(' › ') },
    { label: 'Datum', value: data.matchDate ? formatDateNL(data.matchDate) : '—' },
    { label: 'Tijd', value: data.matchTime || '—' },
    { label: 'Locatie', value: data.venue === 'Home' ? `Thuis${data.location ? ` · ${data.location}` : ''}` : `Uit${data.location ? ` · ${data.location}` : ''}` },
  ];

  return (
    <div className={styles.matchStepWrap}>
      <div className={styles.matchSummaryCard}>
        {summaryRows.map((row) => (
          <div key={row.label} className={styles.matchSummaryRow}>
            <span className={styles.matchSummaryLabel}>{row.label}</span>
            <span className={styles.matchSummaryValue}>{row.value || '—'}</span>
          </div>
        ))}
      </div>

      {data.error && (
        <div className={styles.matchError}>{data.error}</div>
      )}

      <button
        type="button"
        className={styles.matchNextBtn}
        disabled={data.isSaving}
        onClick={handleSubmit}
      >
        {data.isSaving ? (
          <><Loader size={18} className={styles.matchSpinner} /> Aanmaken…</>
        ) : (
          'Wedstrijd aanmaken'
        )}
      </button>
    </div>
  );
}

// ── Helper ──
function formatDateNL(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
