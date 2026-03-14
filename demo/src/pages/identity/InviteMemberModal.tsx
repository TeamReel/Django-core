import React, { useState } from 'react';
import {
  Button,
  Input,
  Modal,
} from '@django-core/design-system';
import { organisationsApi, ApiError } from '@/api';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
import styles from './InviteMemberModal.module.css';

interface InviteMemberModalProps {
  opened: boolean;
  onClose: () => void;
  orgSlug: string;
  onInviteSuccess: () => void;
}

export default function InviteMemberModal({ opened, onClose, orgSlug, onInviteSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);

      await organisationsApi.addMember(orgSlug, {
        email: email,
        role: role,
      });

      onInviteSuccess();
      onClose();
      setEmail('');
      setRole('member');
    } catch (err) {
      logger.error('Invite error', err);
      if (err instanceof ApiError) {
        const body = err.body as { email?: string[]; detail?: string } | undefined;
        setError(body?.email?.[0] || body?.detail || 'Failed to invite member');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!opened) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.heading}>Add Member</h2>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Email Address</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              type="email"
            />
          </div>

          <div className={styles.formFieldLarge}>
            <label className={styles.fieldLabel}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className={styles.selectInput}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className={styles.buttonRow}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
