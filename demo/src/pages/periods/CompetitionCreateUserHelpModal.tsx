import React from 'react';
import styles from './CompetitionCreateUserHelpModal.module.css';

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
      className={styles.backdrop}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">Create / add user</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={`mt-12 text-muted fs-13 ${styles.description}`}>
          Users are managed at the team/club level. Add a user there, then they will appear here when assigned to this competition.
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.btnSecondary}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onManageUsers();
              onClose();
            }}
            className={styles.btnPrimary}
          >
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
}
