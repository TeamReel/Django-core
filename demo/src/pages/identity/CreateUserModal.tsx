import React, { useState } from 'react';
import {
  Button,
  Input,
} from '@django-core/design-system';
import { Modal } from '@/components/ui/Modal';
import { useContextSwitcher } from '@django-core/context-switcher';
import { api, ApiError } from '@/api';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
import styles from './CreateUserModal.module.css';

interface CreateUserModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ opened, onClose, onSuccess }: CreateUserModalProps) {
  const { context } = useContextSwitcher();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    try {
      setLoading(true);
      setError(null);

      // Build path with optional org query param
      let path = '/admin/users/';
      if (context.organisation) {
          path += `?organisation_id=${context.organisation.id}`;
      }

      await api.post(path, {
        ...formData,
        // Backend expects password_confirm (DRF validation).
        password_confirm: formData.password_confirm || formData.password,
      });

      onSuccess();
      onClose();
      setFormData({ email: '', first_name: '', last_name: '', password: '', password_confirm: '' });
    } catch (err) {
      logger.error('Create user error', err);
      if (err instanceof ApiError) {
        const body = err.body as { email?: string[]; password?: string[]; password_confirm?: string[]; detail?: string };
        setError(
          body?.email?.[0] ||
            body?.password?.[0] ||
            body?.password_confirm?.[0] ||
            body?.detail ||
            'Failed to create user'
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Create New User"
      size="md"
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" loading={loading}>
            Create User
          </Button>
        </div>
      }
    >
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <form id="create-user-form" onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <div className={styles.nameField}>
              <label className={styles.label}>First Name</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                placeholder="John"
              />
          </div>
          <div className={styles.nameField}>
              <label className={styles.label}>Last Name</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="Doe"
              />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email Address</label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="user@example.com"
            required
            type="email"
          />
        </div>

        <div className={styles.fieldGroupLarge}>
          <label className={styles.label}>Password</label>
          <Input
            value={formData.password}
            onChange={(e) => {
              const nextPassword = e.target.value;
              setFormData({
                ...formData,
                password: nextPassword,
                // Keep confirm in sync by default (no extra field in UI).
                password_confirm: nextPassword,
              });
            }}
            placeholder="********"
            required
            type="password"
          />
        </div>
      </form>
    </Modal>
  );
}
