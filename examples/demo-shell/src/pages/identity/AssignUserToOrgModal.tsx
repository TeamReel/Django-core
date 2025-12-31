import React, { useState, useEffect } from 'react';

interface Organisation {
    id: string | number;
    name: string;
    slug?: string;
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
        width: '500px',
        maxWidth: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>
          Assign {user?.first_name} {user?.last_name} to Organisation
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                color: '#dc3545',
                border: '1px solid rgba(220, 53, 69, 0.2)',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 500,
                color: 'var(--app-text)',
                fontSize: '14px'
              }}>
                Organisation
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
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
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 500,
                color: 'var(--app-text)',
                fontSize: '14px'
              }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  fontSize: '14px'
                }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedOrgId}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: loading || !selectedOrgId ? '#cccccc' : '#0066cc',
                  color: 'white',
                  cursor: loading || !selectedOrgId ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: loading || !selectedOrgId ? 0.6 : 1
                }}
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
