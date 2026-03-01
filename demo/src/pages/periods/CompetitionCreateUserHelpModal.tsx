import React from 'react';

export function CompetitionCreateUserHelpModal({
  opened,
  onClose,
  onManageUsers,
}: {
  opened: boolean;
  onClose: () => void;
  onManageUsers: () => void;
}) {
  if (!opened) return null;
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
          <h2 className="m-0 fs-16 fw-700">Create / add user</h2>
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

        <div className="mt-12 text-muted fs-13" style={{ lineHeight: 1.4 }}>
          Users are managed at the team/club level. Add a user there, then they will appear here when assigned to this competition.
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
          <button
            type="button"
            onClick={() => {
              onManageUsers();
              onClose();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-primary, #1976d2)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
}
