import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
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
  member: Record<string, unknown> | null;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onConfirm: (seasonId: string) => Promise<void>;
};

function getMemberProjectMemberships(member: Record<string, unknown> | null): Record<string, unknown>[] {
  return (member?.project_memberships || member?.projectMemberships || []) as Record<string, unknown>[];
}

function getPmTeamId(pm: Record<string, unknown>): string {
  return String(pm?.project_id ?? pm?.project ?? '').trim();
}

function getPmPeriodId(pm: Record<string, unknown>): string {
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
  const email = String(member?.email || (member?.user as Record<string, unknown>)?.email || '');
  const teamLabel = String(projectName || '').trim();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      subtitle={[email, teamLabel ? `Team: ${teamLabel}` : ''].filter(Boolean).join(' · ') || undefined}
      size="sm"
      footer={
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
      }
    >
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
    </Modal>
  );
}
