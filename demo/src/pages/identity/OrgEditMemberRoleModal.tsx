import React, { useState } from 'react';
import { Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

export interface OrgEditMemberRoleModalProps {
  opened: boolean;
  onClose: () => void;
  editingMember: any;
  currentOrgSlug: string | undefined;
  onSaved: (updated: any, role: string) => void;
}

export function OrgEditMemberRoleModal({
  opened,
  onClose,
  editingMember,
  currentOrgSlug,
  onSaved,
}: OrgEditMemberRoleModalProps) {
  const [editingMemberRole, setEditingMemberRole] = useState<'admin' | 'member'>('member');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!opened || !editingMember) return null;

  const getApiV1BaseUrl = () => {
    const raw = getApiBaseUrl();
    return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
  };

  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 'var(--z-toast)',
      }}
    >
      <div
        className="bg-surface p-24 rounded-8 text-primary border"
        style={{
          width: '520px',
          maxWidth: '95%',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0">Edit Member</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </Button>
        </div>

        <div className="mt-12 fs-14 text-muted">
          {String(editingMember?.user?.email || editingMember?.email || '')}
        </div>

        {error ? (
          <div className="mt-12 rounded-6" style={{ padding: 'var(--space-3) var(--space-3)', backgroundColor: 'var(--color-red-100)', color: 'var(--color-red-500)' }}>
            {error}
          </div>
        ) : null}

        <div className="mt-16">
          <label className="block fw-600" style={{ marginBottom: 'var(--space-2)' }}>Role</label>
          <select
            value={editingMemberRole}
            onChange={(e) => setEditingMemberRole(e.target.value as any)}
            disabled={saving}
            className="w-full rounded-6 border bg-surface-2 text-primary"
            style={{
              padding: 'var(--space-2) var(--space-3)',
            }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="gap-8" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!editingMember?.id) return;
              try {
                setSaving(true);
                setError(null);
                const apiV1BaseUrl = getApiV1BaseUrl();
                const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/${editingMember.id}/`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || '',
                  },
                  credentials: 'include',
                  body: JSON.stringify({ role: editingMemberRole }),
                });

                if (!res.ok) {
                  const detail = await res.text().catch(() => '');
                  throw new Error(detail || 'Failed to update member');
                }

                const updated = await res.json().catch(() => null);
                onSaved(updated, editingMemberRole);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to update member');
              } finally {
                setSaving(false);
              }
            }}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
