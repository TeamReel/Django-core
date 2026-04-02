/**
 * UserEditModal — Orchestrator (3-tab modal: Personal, Access & Roles, Add to Club/Team).
 *
 * State + data: useUserEditData
 * Types + RBAC: userEditTypes
 * Access tab: UserEditAccessTab
 */
import { type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/utils/logger';
import type { UserEditModalProps } from './userEditTypes';
import { useUserEditData } from './useUserEditData';
import { UserEditAccessTab } from './UserEditAccessTab';
import styles from './UserEditModal.module.css';

export default function UserEditModal({
  opened, onClose, user, onSave, onSaved, organisationSlug, scopeProjectKey,
}: UserEditModalProps) {
  const d = useUserEditData({ opened, user, organisationSlug, scopeProjectKey, onSaved });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    d.setSaving(true);
    d.setExtraError(null);
    try {
      await onSave(d.formData);
      await d.updateOrgRoleIfNeeded();
      await d.updateClubRole();
      await d.updateTeamRole();
      await onSaved?.();
    } catch (error) {
      logger.error('Failed to save user', error);
      d.setExtraError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      d.setSaving(false);
    }
  };

  if (!opened || !user) return null;

  const isBusy = d.saving || d.addingToOrg || d.addingToProject;

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Edit user"
      subtitle={user.email}
      size="lg"
      preventClose={isBusy}
      footer={
        <div className={`flex-row gap-12 ${styles.justifyEnd}`}>
          <button type="button" onClick={onClose} disabled={isBusy} className="btn-modal btn-modal-secondary">Annuleren</button>
          <button type="submit" form="user-edit-form" disabled={isBusy} className="btn-modal btn-modal-primary">
            {d.saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
          </button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex-row gap-8 mb-12 flex-wrap">
        <button type="button" onClick={() => d.setActiveTab('personal')} className={`tab-pill ${d.activeTab === 'personal' ? 'tab-pill-active' : ''}`}>Personal</button>
        <button type="button" onClick={() => d.setActiveTab('access')} className={`tab-pill ${d.activeTab === 'access' ? 'tab-pill-active' : ''}`}>Access & roles</button>
        <button type="button" onClick={() => d.setActiveTab('link')} className={`tab-pill ${d.activeTab === 'link' ? 'tab-pill-active' : ''}`}>Add to club/team</button>
      </div>

      <form id="user-edit-form" onSubmit={handleSubmit} className={`flex-col flex-1 ${styles.formBody}`}>
        <div className={`overflow-y-auto flex-1 ${styles.scrollArea}`}>

            {/* ── Personal tab ── */}
            {d.activeTab === 'personal' ? (
              <div className="flex-col gap-12">
                <div className="fw-800 mb-4">Personal settings</div>

                {/* Avatar */}
                <div className="flex-row gap-16">
                  <div className={`rounded-full overflow-hidden border bg-surface-2 flex-center ${styles.avatar}`}>
                    {d.avatarPreview || user?.avatar_url ? (
                      <img src={d.avatarPreview || user?.avatar_url} alt="Avatar" className={`w-full h-full ${styles.avatarImg}`} loading="lazy" />
                    ) : (
                      <span className="fs-24 text-muted">
                        {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-col gap-6">
                    <button type="button" onClick={() => d.avatarInputRef.current?.click()} disabled={d.avatarUploading} className="p-6 px-12 rounded-6 border bg-surface-2 text-primary fs-13 fw-600 cursor-pointer">
                      {d.avatarUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                    <input ref={d.avatarInputRef as React.LegacyRef<HTMLInputElement>} type="file" accept="image/*" className="hidden" onChange={d.handleAvatarSelect} />
                    <span className="fs-11 text-muted">JPG, PNG — max 5 MB</span>
                  </div>
                </div>

                {/* Name fields */}
                <div className="flex-row gap-16">
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">First name</label>
                    <input type="text" value={d.formData.first_name || ''} onChange={e => d.setFormData({ ...d.formData, first_name: e.target.value })} className="form-input" />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">Last name</label>
                    <input type="text" value={d.formData.last_name || ''} onChange={e => d.setFormData({ ...d.formData, last_name: e.target.value })} className="form-input" />
                  </div>
                </div>

                <div>
                  <label className="block mb-4 fw-600">Email</label>
                  <input type="email" value={d.formData.email || ''} onChange={e => d.setFormData({ ...d.formData, email: e.target.value })} required className="form-input" />
                </div>

                <div>
                  <label className="flex-row gap-10 cursor-pointer">
                    <input type="checkbox" checked={d.formData.is_active || false} onChange={e => d.setFormData({ ...d.formData, is_active: e.currentTarget.checked })} />
                    <span className="fw-700">Active</span>
                  </label>
                </div>
              </div>
            ) : null}

            {/* ── Access & Roles tab ── */}
            {d.activeTab === 'access' ? (
              <UserEditAccessTab
                user={user}
                organisationSlug={organisationSlug}
                saving={d.saving}
                orgSettings={{
                  orgRole: d.orgRole, setOrgRole: d.setOrgRole, orgMembershipId: d.orgMembershipId,
                  inviteOrgRole: d.inviteOrgRole, setInviteOrgRole: d.setInviteOrgRole,
                  addingToOrg: d.addingToOrg, linkToOrganisation: d.linkToOrganisation, setExtraError: d.setExtraError,
                }}
                clubSettings={{
                  selectedClubKey: d.selectedClubKey, setSelectedClubKey: d.setSelectedClubKey,
                  clubMembershipId: d.clubMembershipId, clubAccessRole: d.clubAccessRole, setClubAccessRole: d.setClubAccessRole,
                }}
                teamSettings={{
                  selectedTeamKey: d.selectedTeamKey, setSelectedTeamKey: d.setSelectedTeamKey,
                  teamMembershipId: d.teamMembershipId, teamAccessRole: d.teamAccessRole, setTeamAccessRole: d.setTeamAccessRole,
                  functionalRoles: d.functionalRoles, setFunctionalRoles: d.setFunctionalRoles,
                }}
                availableProjects={d.availableProjects}
              />
            ) : null}

            {/* ── Link tab ── */}
            {d.activeTab === 'link' ? (
              <div className="flex-col gap-12">
                <div className="fw-800">Add user to organisation</div>
                {!organisationSlug && <div className="text-muted fs-12">Open this from a federation context so we can list clubs/teams.</div>}

                {d.orgProjectsError && (
                  <div className="callout-error">{d.orgProjectsError}</div>
                )}

                {/* Federation section */}
                {!d.orgMembershipId ? (
                  <div className="p-12 rounded-8 border bg-surface-2">
                    <div className="fw-800 mb-8">Add to Federation</div>
                    <div className="flex-row gap-10 flex-wrap">
                      <div className="flex-1">
                        <label className="block fw-700 mb-4">Role</label>
                        <select value={d.inviteOrgRole} onChange={e => d.setInviteOrgRole(e.target.value as 'member' | 'admin')} className="form-input" disabled={d.addingToOrg || d.saving}>
                          <option value="member">member</option><option value="admin">admin</option>
                        </select>
                      </div>
                      <div className="mt-24">
                        <button type="button" disabled={d.addingToOrg || d.saving} onClick={async () => { try { await d.linkToOrganisation(); } catch (e) { logger.error('Failed to add to federation', e); d.setExtraError(e instanceof Error ? e.message : 'Failed to add to federation'); } }} className="btn-modal btn-modal-primary">
                          {d.addingToOrg ? 'Adding…' : 'Add to Federation'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="callout-success">
                    <div className="fs-12 fw-700">✓ Member of {organisationSlug}</div>
                  </div>
                )}

                {/* Club / Team section */}
                <div className="p-12 rounded-8 border bg-surface-2">
                  <div className="fw-800 mb-8">Add to Club / Team</div>

                  <div className="mb-8">
                    <label className="block fw-700 mb-4">1. Select Club</label>
                    <select value={d.linkClubKey} onChange={e => { d.setLinkClubKey(e.target.value); d.setLinkTeamKey(''); }} disabled={d.orgProjectsLoading || !organisationSlug || d.addingToProject} className="form-input">
                      <option value="">(Select Club)</option>
                      {d.orgProjects.filter(p => !p.isTeam).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="mb-8">
                    <label className="block fw-700 mb-4">2. Select Team (optional)</label>
                    <select value={d.linkTeamKey} onChange={e => d.setLinkTeamKey(e.target.value)} disabled={!d.linkClubKey || d.addingToProject} className="form-input">
                      <option value="">(Select Team)</option>
                      {d.orgProjects.filter(p => p.isTeam).filter(p => !d.linkClubKey || p.parentKey === d.linkClubKey).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="flex-row gap-10 mt-16 flex-wrap">
                    <div className="flex-1">
                      <label className="block fw-700 mb-4">Initial Role</label>
                      <select value={d.linkAccessRole} onChange={e => d.setLinkAccessRole(e.target.value as 'viewer' | 'editor' | 'admin')} disabled={d.addingToProject} className="form-input">
                        <option value="viewer">viewer</option><option value="editor">editor</option><option value="admin">admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`flex-row gap-10 mt-8 ${styles.justifyEnd}`}>
                  <button type="button" disabled={d.addingToProject || !d.linkClubKey} onClick={() => d.performLinkToProject(d.linkClubKey, d.linkAccessRole, 'club')} className="btn-modal btn-modal-primary">
                    {d.addingToProject && !d.linkTeamKey ? 'Adding...' : 'Add to Club'}
                  </button>
                  <button type="button" disabled={d.addingToProject || !d.linkTeamKey} onClick={() => d.performLinkToProject(d.linkTeamKey, d.linkAccessRole, 'team')} className={`btn-modal btn-modal-primary ${styles.addTeamBtn}`}>
                    {d.addingToProject && d.linkTeamKey ? 'Adding...' : 'Add to Team'}
                  </button>
                </div>
              </div>
            ) : null}

            {d.extraError && (
              <div className="callout-error mt-12">{d.extraError}</div>
            )}
          </div>
        </form>
      </Modal>
  );
}
