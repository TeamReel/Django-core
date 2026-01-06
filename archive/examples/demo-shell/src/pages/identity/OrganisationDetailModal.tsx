import { Badge } from '@django-core/design-system';

interface Organisation {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
  credit_balance?: number;
  member_count?: number;
  project_count?: number;
}

interface OrganisationDetailModalProps {
  opened: boolean;
  onClose: () => void;
  organisation: Organisation | null;
}

export default function OrganisationDetailModal({ opened, onClose, organisation }: OrganisationDetailModalProps) {
  if (!opened || !organisation) return null;

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
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>Organisation Details</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Organisation Information */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>Organisation Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Name</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.name}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Slug</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.slug}</div>
              </div>

              {organisation.description && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Description</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.description}</div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Status</label>
                <Badge variant={organisation.is_active ? 'success' : 'error'}>
                  {organisation.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {typeof organisation.credit_balance === 'number' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Credits</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.credit_balance}</div>
                </div>
              )}

              {typeof organisation.member_count === 'number' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Members</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.member_count}</div>
                </div>
              )}

              {typeof organisation.project_count === 'number' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Projects</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{organisation.project_count}</div>
                </div>
              )}
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
