import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
} from '@django-core/design-system';

interface Organisation {
    id: string;
    name: string;
    slug: string;
}

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
  organisations: Organisation[];
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
    if (!selectedOrg) return;

    try {
      setLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${selectedOrg.slug}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          role: role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.email?.[0] || data.detail || 'Failed to assign user to organisation');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Assign user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setLoading(false);
    }
  };

  if (!opened) return null;

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title={`Assign ${user?.first_name} ${user?.last_name} to Organisation`}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '8px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Organisation</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
              required
            >
              <option value="">Select Organisation...</option>
              {organisations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedOrgId}>
              {loading ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
