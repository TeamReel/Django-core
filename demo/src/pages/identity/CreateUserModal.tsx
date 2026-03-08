import React, { useState } from 'react';
import {
  Button,
  Input,
  Modal,
} from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { getApiBaseUrl } from '../../utils/apiBase';
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
      const apiBaseUrl = getApiBaseUrl();

      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      // Append organisation_id if available in context
      let url = `${apiBaseUrl}/api/v1/admin/users/`;
      if (context.organisation) {
          url += `?organisation_id=${context.organisation.id}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          // Backend expects password_confirm (DRF validation).
          password_confirm: formData.password_confirm || formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.email?.[0] ||
            data.password?.[0] ||
            data.password_confirm?.[0] ||
            data.detail ||
            'Failed to create user'
        );
      }

      onSuccess();
      onClose();
      setFormData({ email: '', first_name: '', last_name: '', password: '', password_confirm: '' });
    } catch (err) {
      console.error(err);
      console.error('Create user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!opened) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Create New User</h2>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
