import { Badge } from '@django-core/design-system';
import type { Organisation } from '../../types';
import styles from './OrganisationDetailModal.module.css';

interface OrganisationDetailModalProps {
  opened: boolean;
  onClose: () => void;
  organisation: Organisation | null;
}

export default function OrganisationDetailModal({ opened, onClose, organisation }: OrganisationDetailModalProps) {
  if (!opened || !organisation) return null;

  return (
    <div className={`flex-center ${styles.modalBackdrop}`}>
      <div className={`bg-surface p-24 rounded-8 overflow-auto text-primary border ${styles.modalContent}`}>
        <h2 className={`text-primary ${styles.modalTitle}`}>Organisation Details</h2>

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

        <div className={`mt-24 ${styles.modalFooter}`}>
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
