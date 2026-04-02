/**
 * MemberRoleEditModal — unified member role editor.
 *
 * Replaces MembershipEditModal, EditMemberModal and CompetitionMembershipEditModal.
 */
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/utils/logger';
import styles from './MemberRoleEditModal.module.css';

/** Minimal member shape accepted by this modal. */
export interface MemberRoleEditMember {
  user?: { name?: string; first_name?: string; last_name?: string; email?: string };
  role?: string;
  functional_roles?: unknown;
  functionalRoles?: unknown;
  metadata?: Record<string, unknown>;
}

export interface FunctionalRoleOption {
  value: string;
  label: string;
}

export interface MemberRoleEditModalProps {
  opened: boolean;
  onClose: () => void;
  member: MemberRoleEditMember | null;
  functionalRoleOptions?: FunctionalRoleOption[];
  onSave: (payload: { role: string; functional_roles: string[] }) => Promise<void>;
}

/** Default 7-role set used by most contexts. */
export const DEFAULT_FUNCTIONAL_ROLES: FunctionalRoleOption[] = [
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'keeper', label: 'Keeper' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'verzorger', label: 'Verzorger' },
  { value: 'supporter', label: 'Supporter' },
  { value: 'manager', label: 'Manager' },
];

/** Read functional roles from various possible shapes. */
export function readFunctionalRoles(m: MemberRoleEditMember | null | undefined): string[] {
  if (!m) return [];
  const direct = m.functional_roles ?? m.functionalRoles;
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map((r: unknown) => String(r || '').trim()).filter(Boolean);
  }
  const meta = m.metadata || {};
  if (Array.isArray(meta.functional_roles) && (meta.functional_roles as unknown[]).length > 0) {
    return (meta.functional_roles as unknown[]).map((r: unknown) => String(r || '').trim()).filter(Boolean);
  }
  const legacy = String((meta as Record<string, unknown>)?.team_role ?? (meta as Record<string, unknown>)?.character_role ?? '').trim();
  return legacy ? [legacy] : [];
}

export function MemberRoleEditModal({
  opened,
  onClose,
  member,
  functionalRoleOptions = DEFAULT_FUNCTIONAL_ROLES,
  onSave,
}: MemberRoleEditModalProps) {
  const [role, setRole] = useState('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !member) return;
    setRole(String(member.role || 'viewer'));
    setFunctionalRoles(readFunctionalRoles(member));
    setError(null);
  }, [opened, member]);

  if (!member) return null;

  const user = member.user || {};
  const displayName =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Member';

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ role, functional_roles: functionalRoles });
      onClose();
    } catch (e) {
      logger.error('Failed to save membership', e);
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Lid bewerken"
      subtitle={displayName}
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <button
            onClick={onClose}
            disabled={saving}
            className={styles.cancelButton}
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <div className="flex-col gap-10">
        <div className="flex-col gap-6">
          <label className="fw-600" htmlFor="member-role-select">Toegangsrol</label>
          <select
            id="member-role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={styles.roleSelect}
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="flex-col gap-6">
          <div className="fw-600">Functionele rollen</div>
          <div className={`grid p-10 rounded-6 border bg-surface-2 ${styles.rolesGrid}`}>
            {functionalRoleOptions.map((opt) => {
              const checked = functionalRoles.includes(opt.value);
              return (
                <label key={opt.value} className="flex-row gap-8 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.currentTarget.checked;
                      setFunctionalRoles((prev) => {
                        const set = new Set(prev.map((r) => r.trim()).filter(Boolean));
                        if (next) set.add(opt.value);
                        else set.delete(opt.value);
                        return Array.from(set).sort();
                      });
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error && <div className="text-danger">{error}</div>}
      </div>
    </Modal>
  );
}

export default MemberRoleEditModal;
