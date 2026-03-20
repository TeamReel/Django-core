import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
import s from './ProjectSeasonDetailPage.module.css';
import { getFunctionalRolesFromMembership, type AccessRoleOption } from './seasonDetailUtils';
import { projectsApi } from '@/api';
import { useEscapeKey } from '@/hooks/useEscapeKey';

/** Minimal member/membership shape for the edit modal */
interface EditableMember {
  id?: string;
  user?: { name?: string; first_name?: string; last_name?: string; email?: string };
  role?: string;
  functional_roles?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EditMemberModalProps {
  member: EditableMember;
  editAccessRole: 'admin' | 'viewer';
  accessRoleOptions: AccessRoleOption[];
  apiBaseUrl: string;
  projectId: string;
  onAccessRoleChange: (role: 'admin' | 'viewer') => void;
  onMemberChange: React.Dispatch<React.SetStateAction<EditableMember | null>>;
  onSaved: (membershipId: string, role: string, functionalRoles: string[]) => void;
  onClose: () => void;
}

/**
 * Modal for editing a squad member's access role and functional roles.
 * Extracted from ProjectSeasonDetailPage.
 */
const EditMemberModal: React.FC<EditMemberModalProps> = ({
  member,
  editAccessRole,
  accessRoleOptions,
  apiBaseUrl,
  projectId,
  onAccessRoleChange,
  onMemberChange,
  onSaved,
  onClose,
}) => {
  useEscapeKey(onClose);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setSaveError(null);
      const membershipId = String(member.id || '').trim();
      if (!membershipId) {
        setSaveError('No membership ID found');
        return;
      }

      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(membershipId);

      if (!isValidUuid) {
        setSaveError(`Cannot save: Invalid membership ID format (${membershipId}). This member may need to be re-added to the squad.`);
        return;
      }

      const functionalRoles = getFunctionalRolesFromMembership(member);

      if (!projectId) {
        setSaveError('Project ID not found');
        return;
      }

      const res = await projectsApi.updateMember(projectId, membershipId, {
        role: editAccessRole,
        metadata: {
          ...(member?.metadata || {}),
          functional_roles: functionalRoles,
        },
      } as Record<string, unknown>);

      onSaved(membershipId, editAccessRole, functionalRoles);
    } catch (err: unknown) {
      logger.error('Failed to update member', err);
      setSaveError(getErrorMessage(err));
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose} role="presentation">
      <div className={s.editMemberModal} onClick={(e) => e.stopPropagation()} role="dialog">
        <h2 className={s.editMemberTitle}>Edit Member Roles</h2>

        <div className={s.marginBottomSpace6}>
          <div className={s.memberInfoRow}>
            <strong className={s.memberInfoLabel}>Name:</strong>{' '}
            {member.user?.name ||
              `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() ||
              member.user?.email ||
              '—'}
          </div>
          <div className={s.memberInfoRow}>
            <strong className={s.memberInfoLabel}>Email:</strong> {member.user?.email || '—'}
          </div>
        </div>

        {/* Access Role Section */}
        <div className={s.marginBottomSpace6}>
          <label className={s.fieldLabel}>Access Role</label>
          <div className={s.radioGroup}>
            {accessRoleOptions.map((opt) => {
              const isSelected = editAccessRole === opt.value;
              return (
                <label
                  key={opt.value}
                  className={s.radioCard}
                  style={{
                    border: isSelected ? '2px solid var(--color-blue-500)' : '1px solid var(--color-neutral-500)',
                    backgroundColor: isSelected ? 'var(--color-neutral-800)' : 'var(--color-neutral-600)',
                  }}
                >
                  <input
                    type="radio"
                    name="accessRole"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => onAccessRoleChange(opt.value)}
                    className={s.radioInput}
                  />
                  <div>
                    <div className={s.radioCardTitle}>
                      {opt.icon} {opt.label}
                    </div>
                    <div className={s.radioCardDesc}>{opt.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className={s.marginBottomSpace6}>
          <label className={s.fieldLabel}>Functional Roles</label>
          <div className={s.roleGrid}>
            {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map((role) => {
              const currentRoles = getFunctionalRolesFromMembership(member);
              const isChecked = currentRoles.includes(role);

              return (
                <label
                  key={role}
                  className={s.checkboxCard}
                  style={{
                    backgroundColor: isChecked ? 'var(--color-blue-800)' : 'var(--color-neutral-600)',
                    borderColor: isChecked ? 'var(--color-blue-500)' : 'var(--color-neutral-500)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onMemberChange((prev: EditableMember | null) => {
                        if (!prev) return prev;
                        const currentRoles = getFunctionalRolesFromMembership(prev);
                        let newRoles: string[];

                        if (checked) {
                          newRoles = [...currentRoles, role];
                        } else {
                          newRoles = currentRoles.filter((r: string) => r !== role);
                        }

                        return {
                          ...prev,
                          functional_roles: newRoles,
                        };
                      });
                    }}
                    className={s.cursorPointer}
                  />
                  <span className={s.roleLabel}>{role}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className={s.modalActions}>
          {saveError && <div style={{ color: 'var(--app-error, #ef4444)', fontSize: 'var(--text-sm)', marginBottom: 8, width: '100%' }}>{saveError}</div>}
          <button onClick={onClose} className={s.btnCancel}>
            Annuleren
          </button>
          <button onClick={handleSave} className={s.btnSave}>
            Wijzigingen opslaan
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
