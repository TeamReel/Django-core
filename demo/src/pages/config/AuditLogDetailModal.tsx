import React from 'react';
import type { AuditEvent } from '../../types';
import { Modal } from '../../components/ui';

interface AuditLogDetailModalProps {
  event: AuditEvent | null;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ event, onClose }) => (
  <Modal
    isOpen={!!event}
    onClose={onClose}
    title="Audit Event Details"
    size="lg"
  >
    {event && (
      <div className="flex-col gap-16" data-testid="audit-details-modal">
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
    )}
  </Modal>
);

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="fs-12 text-muted mb-4">{label}</div>
    <div className="fs-14 text-primary" style={mono ? { fontFamily: 'monospace' } : undefined}>{value}</div>
  </div>
);
