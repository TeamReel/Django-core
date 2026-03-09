import React, { useState, useEffect } from 'react';
import { organisationsApi, ApiError } from '../../api';
import type { Organisation as SharedOrganisation } from '../../types';
import styles from './AssignUserToOrgModal.module.css';

type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
}

interface AssignUserToOrgModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  organisations: OrganisationOption[];
  onSuccess: () => void;
}

export default function AssignUserToOrgModal({ opened, onClose, user, organisations, onSuccess }: AssignUserToOrgModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
      if (opened) {
          setSelectedOrgId('');
          setRole('member');
          setError(null);
      }
  }, [opened]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !user) return;

    const selectedOrg = organisations.find(o => o.id === selectedOrgId);
if (!selectedOrg?.slug) return;

    try {
      setLoading(true);
      setError(null);

      await organisationsApi.addMember(selectedOrg.slug, {
        email: user.email,
        role: role,
      } as any);

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      console.error('Assign user error:', err);
      if (err instanceof ApiError) {
        const body = err.body as any;
        setError(body?.email?.[0] || body?.detail || 'Failed to assign user to organisation');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to assign user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!opened) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          Assign {user?.first_name} {user?.last_name} to Organisation
        </h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formBody}>
            {error && (
              <div className={styles.errorAlert}>
                {error}
              </div>
            )}

            <div>
              <label className={styles.fieldLabel}>
                Organisation
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className={styles.selectInput}
                required
              >
                <option value="">Select Organisation...</option>
                {organisations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.fieldLabel}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                className={styles.selectInput}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={styles.cancelBtn}
                data-loading={loading || undefined}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedOrgId}
                className={styles.submitBtn}
                data-disabled={loading || !selectedOrgId || undefined}
              >
                {loading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
