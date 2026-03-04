import React, { useMemo, useState } from 'react';
import styles from './SeasonPickerModal.module.css';

type Season = {
  id: string;
  name?: string;
  label?: string;
  title?: string;
  slug?: string;
};

type Mode = 'assign' | 'unassign';

type Props = {
  open: boolean;
  mode: Mode;
  seasons: Season[];
  member: any | null;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onConfirm: (seasonId: string) => Promise<void>;
};

function getMemberProjectMemberships(member: any): any[] {
  return (member?.project_memberships || member?.projectMemberships || []) as any[];
}

function getPmTeamId(pm: any): string {
  return String(pm?.project_id ?? pm?.project ?? '').trim();
}

function getPmPeriodId(pm: any): string {
  return String(pm?.period_id ?? pm?.period ?? '').trim();
}

function seasonLabel(season: Season): string {
  return String(season?.name ?? season?.label ?? season?.title ?? season?.slug ?? season?.id);
}

export default function SeasonPickerModal({ open, mode, seasons, member, projectId, projectName, onClose, onConfirm }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableSeasons = useMemo(() => {
    const pms = getMemberProjectMemberships(member);
    const assignedSeasonIds = new Set(
      pms
        .filter((pm) => getPmTeamId(pm) === String(projectId))
        .map((pm) => getPmPeriodId(pm))
        .filter(Boolean),
    );

    if (mode === 'assign') {
      return (seasons || []).filter((s) => !assignedSeasonIds.has(String(s.id)));
    }
    return (seasons || []).filter((s) => assignedSeasonIds.has(String(s.id)));
  }, [member, mode, projectId, seasons]);

  if (!open) return null;

  const title = mode === 'assign' ? 'Assign to season' : 'Unassign from season';
  const email = String(member?.email || member?.user?.email || '');
  const teamLabel = String(projectName || '').trim();

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>{title}</div>
            {email ? <div className={styles.headerSubtext}>{email}</div> : null}
            {teamLabel ? <div className={styles.headerSubtext}>Team: {teamLabel}</div> : null}
          </div>
          <button
            type="button"
            className={`app-action-button ${styles.closeButton}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className={styles.body}>
          {availableSeasons.length ? (
            <label className={styles.seasonLabel}>
              <div className={styles.seasonLabelText}>Season</div>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className={styles.seasonSelect}
              >
                <option value="">Select…</option>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {teamLabel ? `${teamLabel} · ${seasonLabel(s)}` : seasonLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className={styles.noSeasonsText}>
              {mode === 'assign' ? 'No assignable seasons for this user.' : 'No season assignments found for this user.'}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={`app-action-button ${styles.cancelButton}`}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`app-action-button ${styles.submitButton}`}
            data-mode={mode}
            onClick={async () => {
              const sid = String(selectedSeasonId || '').trim();
              if (!sid) return;
              try {
                setSubmitting(true);
                await onConfirm(sid);
                setSelectedSeasonId('');
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !String(selectedSeasonId || '').trim()}
          >
            {mode === 'assign' ? 'Assign' : 'Unassign'}
          </button>
        </div>
      </div>
    </div>
  );
}
