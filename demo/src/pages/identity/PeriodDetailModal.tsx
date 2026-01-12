import React from 'react';

export interface PeriodLike {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  organisation?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  parent_period?: { id: string; name: string } | null;
  children_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  matches_total_count?: number;
}

interface PeriodDetailModalProps {
  opened: boolean;
  onClose: () => void;
  period: PeriodLike | null;
}

export default function PeriodDetailModal({ opened, onClose, period }: PeriodDetailModalProps) {
  if (!opened || !period) return null;

  const data = (period as any).data ?? (period as any).metadata ?? {};
  const type = String((data as any)?.type ?? '');

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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Period Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--app-text)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Name</div>
            <div style={{ fontWeight: 600 }}>{period.name}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Start</div>
              <div>{period.start_date || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>End</div>
              <div>{period.end_date || '—'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Children</div>
              <div>{(period.children_count ?? 0).toString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Matches (direct)</div>
              <div>{(period.matches_count ?? 0).toString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Matches (total)</div>
              <div>{(period.matches_total_count ?? period.matches_count ?? 0).toString()}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Type</div>
            <div>{type || '—'}</div>
          </div>

          {period.description ? (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Description</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{period.description}</div>
            </div>
          ) : null}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
