import React from 'react';
import { Badge } from '@django-core/design-system';
import { Modal } from '../../components/ui';
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
  if (!membership) return null;
  const user = membership.user || membership.user_detail || membership;
  const name = getUserDisplayName(membership);
  const email = user?.email || membership?.email || '—';
  const role = membership?.role || membership?.project_memberships?.[0]?.role;
  const position = membership?.metadata?.position || '—';
  const shirtNumber = membership?.metadata?.shirt_number ?? '';

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="User membership"
      size="sm"
      footer={
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--app-border)',
            backgroundColor: 'var(--app-surface-2)',
            color: 'var(--app-text)',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
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
    </Modal>
  );
}
