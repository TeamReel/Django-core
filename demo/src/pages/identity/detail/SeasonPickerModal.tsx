import React, { useMemo, useState } from 'react';

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
  onClose: () => void;
  onConfirm: (seasonId: string) => Promise<void>;
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  width: 'min(560px, 96vw)',
  background: '#0f172a',
  color: 'white',
  borderRadius: 12,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
};

const headerStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const bodyStyle: React.CSSProperties = {
  padding: 16,
  display: 'grid',
  gap: 12,
};

const footerStyle: React.CSSProperties = {
  padding: 16,
  borderTop: '1px solid rgba(255,255,255,0.10)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
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

export default function SeasonPickerModal({ open, mode, seasons, member, projectId, onClose, onConfirm }: Props) {
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

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontWeight: 700 }}>{title}</div>
            {email ? <div style={{ fontSize: 12, opacity: 0.85 }}>{email}</div> : null}
          </div>
          <button
            type="button"
            className="app-action-button"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div style={bodyStyle}>
          {availableSeasons.length ? (
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Season</div>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                }}
              >
                <option value="">Select…</option>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {seasonLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {mode === 'assign' ? 'No assignable seasons for this user.' : 'No season assignments found for this user.'}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            className="app-action-button"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="app-action-button"
            style={{ background: mode === 'assign' ? '#16a34a' : '#334155', border: '1px solid rgba(255,255,255,0.12)' }}
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
