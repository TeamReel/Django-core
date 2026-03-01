import React from 'react';
import { Badge } from '@django-core/design-system';
import { getUserDisplayName, roleLabel } from './competitionDetailUtils';

export function CompetitionMembershipDetailModal({
  opened,
  onClose,
  membership,
}: {
  opened: boolean;
  onClose: () => void;
  membership: any | null;
}) {
  if (!opened || !membership) return null;
  const user = membership.user || membership.user_detail || membership;
  const name = getUserDisplayName(membership);
  const email = user?.email || membership?.email || '—';
  const role = membership?.role || membership?.project_memberships?.[0]?.role;
  const position = membership?.metadata?.position || '—';
  const shirtNumber = membership?.metadata?.shirt_number ?? '';

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
          padding: '20px',
          borderRadius: '8px',
          width: '560px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">User membership</h2>
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

        <div className="mt-12" style={{ display: 'grid', gap: '8px' }}>
          <div>
            <div className="text-muted fs-12">Name</div>
            <div className="fw-600">{name}</div>
          </div>
          <div>
            <div className="text-muted fs-12">Email</div>
            <div className="fw-600">{email}</div>
          </div>
          <div>
            <div className="text-muted fs-12">Role</div>
            <div className="fw-600">
              <Badge variant="default">{roleLabel(role)}</Badge>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div className="text-muted fs-12">Position</div>
              <div className="fw-600">{position}</div>
            </div>
            <div>
              <div className="text-muted fs-12">#</div>
              <div className="fw-600">{shirtNumber || '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px',
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
  );
}
