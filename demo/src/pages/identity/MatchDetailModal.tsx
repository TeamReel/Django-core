interface MatchActivity {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  activity_type?: string;
}

interface MatchDetailModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchActivity | null;
}

export default function MatchDetailModal({ opened, onClose, match }: MatchDetailModalProps) {
  if (!opened || !match) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '560px',
          maxWidth: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Match</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
          <div style={{ fontWeight: 600 }}>Title</div>
          <div>{match.title}</div>

          <div style={{ fontWeight: 600 }}>Start</div>
          <div>{match.start_time || '-'}</div>

          <div style={{ fontWeight: 600 }}>End</div>
          <div>{match.end_time || '-'}</div>

          <div style={{ fontWeight: 600 }}>Location</div>
          <div>{match.location || '-'}</div>

          <div style={{ fontWeight: 600 }}>Description</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{match.description || '-'}</div>
        </div>
      </div>
    </div>
  );
}
