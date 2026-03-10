import React from 'react';
import type { UsageEvent } from './usageEvents.types';
import styles from './UsageEventDetailModal.module.css';

interface UsageEventDetailModalProps {
  event: UsageEvent;
  onClose: () => void;
}

export const UsageEventDetailModal: React.FC<UsageEventDetailModalProps> = ({ event, onClose }) => (
  <div
    className={`flex-center ${styles.overlay}`}
    onClick={onClose}
  >
    <div
      className={`bg-surface rounded-8 max-w-800 overflow-auto p-24 ${styles.modal}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`flex-between ${styles.header}`}>
        <h2 className="m-0 fs-18 fw-600 text-primary">Usage Event Details</h2>
        <button
          onClick={onClose}
          className={`fs-24 border-none bg-transparent cursor-pointer text-primary ${styles.closeButton}`}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-col gap-16">
        <DetailField label="Event ID" value={event.id} mono />
        <DetailField
          label="Timestamp (ISO)"
          value={new Date(event.timestamp).toISOString()}
          mono
        />
        <DetailField label="Event Type" value={event.event_type} />
        <DetailField
          label="User"
          value={
            (event.user_full_name || event.user_email || event.user || 'System') +
            (event.user_email ? ` (${event.user_email})` : '')
          }
        />
        {event.organization_name && (
          <DetailField label="Organization" value={event.organization_name} />
        )}
        {event.project_name && (
          <DetailField label="Project" value={event.project_name} />
        )}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div>
            <div className="fs-12 text-muted mb-4">Metadata</div>
            <pre
              className={`fs-12 bg-surface-2 p-12 rounded-4 overflow-auto text-primary border ${styles.jsonCode}`}
            >
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  </div>
);

/** DRY helper for repeated label + value field pattern. */
const DetailField: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div>
    <div className="fs-12 text-muted mb-4">{label}</div>
    <div
      className="fs-14 text-primary"
      style={mono ? { fontFamily: 'monospace' } : undefined}
    >
      {value}
    </div>
  </div>
);
