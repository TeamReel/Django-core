import { Badge } from '@django-core/design-system';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role?: string;
}

interface UserDetailModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserDetailModal({ opened, onClose, user }: UserDetailModalProps) {
  if (!opened || !user) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--app-surface)',
        padding: '24px',
        borderRadius: '8px',
        width: '600px',
        maxWidth: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>User Details</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Information */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Full Name</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{user.first_name} {user.last_name}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Email</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{user.email}</div>
              </div>

              {user.role && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>System Role</label>
                  <Badge variant={user.role === 'superadmin' ? 'primary' : 'default'}>
                    {user.role}
                  </Badge>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Status</label>
                <Badge variant={user.is_active ? 'success' : 'error'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
