import React, { useState } from 'react';
import { Button } from '@django-core/design-system';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/api';
import styles from './OrgEditMemberRoleModal.module.css';
import { logger } from '@/utils/logger';

interface OrgMemberLike {
  id?: string | number;
  email?: string;
  user?: { email?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface OrgEditMemberRoleModalProps {
  opened: boolean;
  onClose: () => void;
  editingMember: OrgMemberLike | null;
  currentOrgSlug: string | undefined;
  onSaved: (updated: OrgMemberLike, role: string) => void;
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

  if (!editingMember) return null;

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Edit Member"
      subtitle={String(editingMember?.user?.email || editingMember?.email || '')}
      size="sm"
      footer={
        <div className={styles.footer}>
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

                onSaved(updated as OrgMemberLike, editingMemberRole);
              } catch (e) {
                logger.error('Failed to update member role', e);
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
      }
    >
      {error ? (
        <div className={`mt-12 rounded-6 ${styles.errorBox}`}>
          {error}
        </div>
      ) : null}

      <div className="mt-16">
        <label className={`block fw-600 ${styles.label}`}>Role</label>
        <select
          value={editingMemberRole}
          onChange={(e) => setEditingMemberRole(e.target.value as 'admin' | 'member')}
          disabled={saving}
          className={`w-full rounded-6 border bg-surface-2 text-primary ${styles.selectInput}`}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </Modal>
  );
}
