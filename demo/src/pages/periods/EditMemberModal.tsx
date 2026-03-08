import React from 'react';
import s from './ProjectSeasonDetailPage.module.css';
import { getFunctionalRolesFromMembership, type AccessRoleOption } from './seasonDetailUtils';
import { getCsrfToken } from '../../utils/csrf';

interface EditMemberModalProps {
  member: any;
  editAccessRole: 'admin' | 'viewer';
  accessRoleOptions: AccessRoleOption[];
  apiBaseUrl: string;
  projectId: string;
  onAccessRoleChange: (role: 'admin' | 'viewer') => void;
  onMemberChange: React.Dispatch<React.SetStateAction<any>>;
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
  const handleSave = async () => {
    try {
      const membershipId = String(member.id || '').trim();
      if (!membershipId) {
        alert('No membership ID found');
        return;
      }

      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(membershipId);

      if (!isValidUuid) {
        alert(`Cannot save: Invalid membership ID format (${membershipId}). This member may need to be re-added to the squad.`);
        return;
      }

      const functionalRoles = getFunctionalRolesFromMembership(member);

      if (!projectId) {
        alert('Project ID not found');
        return;
      }

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({
            role: editAccessRole,
            metadata: {
              ...(member?.metadata || {}),
              functional_roles: functionalRoles,
            },
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error('[Error] Save failed:', text);
        throw new Error(text || 'Failed to update member');
      }

      const responseData = await res.json();

      onSaved(membershipId, editAccessRole, functionalRoles);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose} role="button" tabIndex={0}>
      <div className={s.editMemberModal} onClick={(e) => e.stopPropagation()} role="button" tabIndex={0}>
        <h2 className={s.editMemberTitle}>Edit Member Roles</h2>

        <div style={{ marginBottom: 'var(--space-6)' }}>
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
        <div style={{ marginBottom: 'var(--space-6)' }}>
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

        <div style={{ marginBottom: 'var(--space-6)' }}>
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
                      onMemberChange((prev: any) => {
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
                    style={{ cursor: 'pointer' }}
                  />
                  <span className={s.roleLabel}>{role}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className={s.modalActions}>
          <button onClick={onClose} className={s.btnCancel}>
            Cancel
          </button>
          <button onClick={handleSave} className={s.btnSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
