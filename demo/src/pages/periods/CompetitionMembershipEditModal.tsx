import React, { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import styles from './CompetitionMembershipEditModal.module.css';
import { useEscapeKey } from '@/hooks/useEscapeKey';

/** Minimal membership shape for the edit modal. */
interface MembershipLike {
  role?: string;
  user?: { name?: string; first_name?: string; last_name?: string; email?: string };
  functional_roles?: unknown;
  functionalRoles?: unknown;
  metadata?: Record<string, unknown>;
}

export function CompetitionMembershipEditModal({
  opened,
  onClose,
  membership,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  membership: MembershipLike | null;
  onSave: (payload: { role: string; functional_roles: string[] }) => Promise<void>;
}) {
  const [role, setRole] = useState('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(opened ? onClose : undefined);

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

  const readFunctionalRolesFromMembership = (m: MembershipLike): string[] => {
    const direct = m?.functional_roles ?? m?.functionalRoles;
    if (Array.isArray(direct)) {
      return direct.map((r) => String(r || '').trim()).filter(Boolean);
    }

    const meta = m?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  useEffect(() => {
    if (!opened || !membership) return;
    setRole(String(membership?.role || 'viewer'));
    setFunctionalRoles(readFunctionalRolesFromMembership(membership));
    setError(null);
  }, [opened, membership]);

  if (!opened || !membership) return null;

  const user = membership.user || {};
  const displayName =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Member';

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">Edit user role</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={`text-muted fs-13 ${styles.displayName}`}>{displayName}</div>

        <div className="flex-col gap-10 mt-16">
          <div className={`flex-col ${styles.fieldGroup}`}>
            <label className="fw-600" htmlFor="competition-membership-role">
              Access role
            </label>
            <select
              id="competition-membership-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={styles.selectInput}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className={`flex-col ${styles.fieldGroup}`}>
            <div className="fw-600">Functional roles</div>
            <div className={styles.rolesGrid}>
              {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
                const checked = functionalRoles.includes(opt.value);
                return (
                  <label key={opt.value} className={styles.roleLabel}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextChecked = e.currentTarget.checked;
                        setFunctionalRoles((prev) => {
                          const normalized = (Array.isArray(prev) ? prev : [])
                            .map((r) => String(r || '').trim())
                            .filter(Boolean);
                          const set = new Set(normalized);
                          if (nextChecked) set.add(opt.value);
                          else set.delete(opt.value);
                          return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                        });
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.actions}>
            <button
              onClick={onClose}
              disabled={saving}
              className={styles.cancelButton}
              data-saving={saving}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await onSave({ role, functional_roles: functionalRoles });
                  onClose();
                } catch (e) {
                  logger.error('Failed to save', e);
                  setError(e instanceof Error ? e.message : 'Opslaan mislukt');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className={styles.saveButton}
              data-saving={saving}
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
