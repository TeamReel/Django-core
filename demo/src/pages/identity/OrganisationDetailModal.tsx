import { Badge } from '@django-core/design-system';
import type { Organisation } from '../../types';

interface OrganisationDetailModalProps {
  opened: boolean;
  onClose: () => void;
  organisation: Organisation | null;
}

export default function OrganisationDetailModal({ opened, onClose, organisation }: OrganisationDetailModalProps) {
  if (!opened || !organisation) return null;

  return (
    <div className="flex-center" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000
    }}>
      <div className="bg-surface p-24 rounded-8 overflow-auto text-primary border" style={{
        width: '600px',
        maxWidth: '90%',
        maxHeight: '80vh',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <h2 className="text-primary" style={{ marginTop: 0, marginBottom: '20px' }}>Organisation Details</h2>

        <div className="flex-col gap-20">
          {/* Organisation Information */}
          <div>
            <h3 className="fs-16 fw-600 mb-16 text-primary">Organisation Information</h3>
            <div className="flex-col gap-12">
              <div>
                <label className="block fs-12 text-muted mb-4">Name</label>
                <div className="fw-500 text-primary">{organisation.name}</div>
              </div>

              <div>
                <label className="block fs-12 text-muted mb-4">Slug</label>
                <div className="fw-500 text-primary">{organisation.slug}</div>
              </div>

              {organisation.description && (
                <div>
                  <label className="block fs-12 text-muted mb-4">Description</label>
                  <div className="fw-500 text-primary">{organisation.description}</div>
                </div>
              )}

              <div>
                <label className="block fs-12 text-muted mb-4">Status</label>
                <Badge variant={organisation.is_active ? 'success' : 'error'}>
                  {organisation.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {typeof organisation.credit_balance === 'number' && (
                <div>
                  <label className="block fs-12 text-muted mb-4">Credits</label>
                  <div className="fw-500 text-primary">{organisation.credit_balance}</div>
                </div>
              )}

              {typeof organisation.member_count === 'number' && (
                <div>
                  <label className="block fs-12 text-muted mb-4">Members</label>
                  <div className="fw-500 text-primary">{organisation.member_count}</div>
                </div>
              )}

              {typeof organisation.project_count === 'number' && (
                <div>
                  <label className="block fs-12 text-muted mb-4">Projects</label>
                  <div className="fw-500 text-primary">{organisation.project_count}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-24" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="py-8 px-16 rounded-4 border bg-surface-2 text-primary cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
