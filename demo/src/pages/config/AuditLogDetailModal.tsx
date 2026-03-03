import React from 'react';
import type { AuditEvent } from '../../types';

interface AuditLogDetailModalProps {
  event: AuditEvent;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ event, onClose }) => (
  <div
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}
    onClick={onClose}
    data-testid="audit-details-modal"
  >
    <div
      style={{
        backgroundColor: 'var(--app-surface)', borderRadius: '8px',
        maxWidth: '800px', width: '90%', maxHeight: '80vh',
        overflow: 'auto', padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-between mb-24">
        <h2 className="m-0 fs-20 fw-600 text-primary">Audit Event Details</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--app-text)', padding: '0 8px' }}
          aria-label="Close"
        >×</button>
      </div>

      <div className="flex-col gap-16">
        <Field label="Event ID" value={event.id} mono />
        <Field label="Timestamp (ISO)" value={new Date(event.timestamp).toISOString()} mono />
        <Field label="Event Type" value={event.event_type} />
        <Field
          label="User"
          value={
            (event.user?.name || 'System') +
            (event.user?.email ? ` (${event.user.email})` : '')
          }
        />
        {event.organisation_id && <Field label="Organisation ID" value={event.organisation_id} mono />}
        {event.project_id && <Field label="Project ID" value={event.project_id} mono />}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div>
            <div className="fs-12 text-muted mb-4">Metadata</div>
            <pre
              className="fs-12 bg-surface-2 p-12 rounded-4 overflow-auto text-primary border"
              style={{ fontFamily: 'monospace', maxHeight: '300px' }}
            >
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="fs-12 text-muted mb-4">{label}</div>
    <div className="fs-14 text-primary" style={mono ? { fontFamily: 'monospace' } : undefined}>{value}</div>
  </div>
);
