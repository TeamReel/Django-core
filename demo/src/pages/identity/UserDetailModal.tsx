import { Badge } from '@django-core/design-system';
import type { User } from '@/types/api/user';
import styles from './UserDetailModal.module.css';

interface UserDetailModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserDetailModal({ opened, onClose, user }: UserDetailModalProps) {
  if (!opened || !user) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>User Details</h2>

        <div className={styles.content}>
          {/* User Information */}
          <div>
            <h3 className={styles.sectionTitle}>Profile Information</h3>
            <div className={styles.fields}>
              <div>
                <label className={styles.fieldLabel}>Full Name</label>
                <div className={styles.fieldValue}>{user.first_name} {user.last_name}</div>
              </div>

              <div>
                <label className={styles.fieldLabel}>Email</label>
                <div className={styles.fieldValue}>{user.email}</div>
              </div>

              {user.role && (
                <div>
                  <label className={styles.fieldLabel}>System Role</label>
                  <Badge variant={String(user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                    {user.role}
                  </Badge>
                </div>
              )}

              <div>
                <label className={styles.fieldLabel}>Status</label>
                <Badge variant={user.is_active ? 'success' : 'error'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
