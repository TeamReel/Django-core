import React, { useState } from 'react';
import { Button } from '@django-core/design-system';
import { api } from '../../api';
import styles from './OrgEditMemberRoleModal.module.css';

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

  return (
    <div
      className={`flex-center ${styles.overlay}`}
    >
      <div
        className={`bg-surface p-24 rounded-8 text-primary border ${styles.modal}`}
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
          <div className={`mt-12 rounded-6 ${styles.errorBox}`}>
            {error}
          </div>
        ) : null}

        <div className="mt-16">
          <label className={`block fw-600 ${styles.label}`}>Role</label>
          <select
            value={editingMemberRole}
            onChange={(e) => setEditingMemberRole(e.target.value as any)}
            disabled={saving}
            className={`w-full rounded-6 border bg-surface-2 text-primary ${styles.selectInput}`}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className={`gap-8 ${styles.footer}`}>
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
                const updated = await api.patch(`/organisations/${currentOrgSlug}/members/${editingMember.id}/`, { role: editingMemberRole });

                onSaved(updated, editingMemberRole);
              } catch (e) {
                console.error(e);
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
