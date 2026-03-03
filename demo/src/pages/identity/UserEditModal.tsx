/**
 * UserEditModal — Orchestrator (3-tab modal: Personal, Access & Roles, Add to Club/Team).
 *
 * State + data: useUserEditData
 * Types + RBAC: userEditTypes
 * Access tab: UserEditAccessTab
 */
import { type FormEvent } from 'react';
import type { UserEditModalProps } from './userEditTypes';
import { useUserEditData } from './useUserEditData';
import { UserEditAccessTab } from './UserEditAccessTab';

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
      console.error(error);
      d.setExtraError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      d.setSaving(false);
    }
  };

  if (!opened || !user) return null;

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: '999px',
    border: active ? '1px solid #007bff' : '1px solid var(--app-border)',
    backgroundColor: active ? 'rgba(0, 123, 255, 0.12)' : 'var(--app-surface-2)',
    color: 'var(--app-text)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
  });

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)',
  };

  const btnPrimary = (disabled: boolean, bg = '#007bff'): React.CSSProperties => ({
    padding: '10px 16px', borderRadius: '6px', border: `1px solid ${bg}`,
    backgroundColor: bg, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 800,
  });

  const isBusy = d.saving || d.addingToOrg || d.addingToProject;

  return (
    <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
      <div className="flex-col rounded-8" style={{ backgroundColor: 'var(--app-surface)', width: '860px', maxWidth: '90%', maxHeight: '90vh', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: 'var(--app-text)', border: '1px solid var(--app-border)' }}>

        {/* Header + tabs */}
        <div className="border-bottom" style={{ padding: '16px 18px' }}>
          <div className="flex-between gap-12">
            <div>
              <div className="fs-16 fw-800">Edit user</div>
              <div className="fs-12 text-muted" style={{ marginTop: '2px' }}>{user.email}</div>
            </div>
            <button type="button" onClick={onClose} style={{ border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }} aria-label="Close">✕</button>
          </div>
          <div className="flex-row gap-8 mt-12 flex-wrap">
            <button type="button" onClick={() => d.setActiveTab('personal')} style={tabBtnStyle(d.activeTab === 'personal')}>Personal</button>
            <button type="button" onClick={() => d.setActiveTab('access')} style={tabBtnStyle(d.activeTab === 'access')}>Access & roles</button>
            <button type="button" onClick={() => d.setActiveTab('link')} style={tabBtnStyle(d.activeTab === 'link')}>Add to club/team</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-col flex-1" style={{ minHeight: 0 }}>
          <div className="overflow-y-auto flex-1" style={{ padding: '18px', minHeight: 0 }}>

            {/* ── Personal tab ── */}
            {d.activeTab === 'personal' ? (
              <div className="flex-col" style={{ gap: '14px' }}>
                <div className="fw-800" style={{ marginBottom: '2px' }}>Personal settings</div>

                {/* Avatar */}
                <div className="flex-row gap-16">
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--app-border)', flexShrink: 0, background: 'var(--app-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {d.avatarPreview || (user as any)?.avatar_url ? (
                      <img src={d.avatarPreview || (user as any)?.avatar_url} alt="Avatar" className="w-full h-full" style={{ objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px', color: 'var(--app-muted-text)' }}>
                        {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-col gap-6">
                    <button type="button" onClick={() => d.avatarInputRef.current?.click()} disabled={d.avatarUploading} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', color: 'var(--app-text)', cursor: d.avatarUploading ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      {d.avatarUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                    <input ref={d.avatarInputRef} type="file" accept="image/*" className="hidden" onChange={d.handleAvatarSelect} />
                    <span className="fs-11 text-muted">JPG, PNG — max 5 MB</span>
                  </div>
                </div>

                {/* Name fields */}
                <div className="flex-row gap-16">
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">First name</label>
                    <input type="text" value={d.formData.first_name || ''} onChange={e => d.setFormData({ ...d.formData, first_name: e.target.value })} style={selectStyle} />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">Last name</label>
                    <input type="text" value={d.formData.last_name || ''} onChange={e => d.setFormData({ ...d.formData, last_name: e.target.value })} style={selectStyle} />
                  </div>
                </div>

                <div>
                  <label className="block mb-4 fw-600">Email</label>
                  <input type="email" value={d.formData.email || ''} onChange={e => d.setFormData({ ...d.formData, email: e.target.value })} required style={selectStyle} />
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
                orgRole={d.orgRole} setOrgRole={d.setOrgRole} orgMembershipId={d.orgMembershipId}
                inviteOrgRole={d.inviteOrgRole} setInviteOrgRole={d.setInviteOrgRole}
                addingToOrg={d.addingToOrg} linkToOrganisation={d.linkToOrganisation} setExtraError={d.setExtraError}
                selectedClubKey={d.selectedClubKey} setSelectedClubKey={d.setSelectedClubKey}
                clubMembershipId={d.clubMembershipId} clubAccessRole={d.clubAccessRole} setClubAccessRole={d.setClubAccessRole}
                selectedTeamKey={d.selectedTeamKey} setSelectedTeamKey={d.setSelectedTeamKey}
                teamMembershipId={d.teamMembershipId} teamAccessRole={d.teamAccessRole} setTeamAccessRole={d.setTeamAccessRole}
                functionalRoles={d.functionalRoles} setFunctionalRoles={d.setFunctionalRoles}
                availableProjects={d.availableProjects}
              />
            ) : null}

            {/* ── Link tab ── */}
            {d.activeTab === 'link' ? (
              <div className="flex-col gap-12">
                <div className="fw-800">Add user to organisation</div>
                {!organisationSlug && <div className="text-muted fs-12">Open this from a federation context so we can list clubs/teams.</div>}

                {d.orgProjectsError && (
                  <div style={{ padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>{d.orgProjectsError}</div>
                )}

                {/* Federation section */}
                {!d.orgMembershipId ? (
                  <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                    <div style={{ marginBottom: '10px' }} className="fw-800">Add to Federation</div>
                    <div className="flex-row gap-10 flex-wrap">
                      <div style={{ flex: '1 1 auto' }}>
                        <label className="block fw-700" style={{ marginBottom: '6px' }}>Role</label>
                        <select value={d.inviteOrgRole} onChange={e => d.setInviteOrgRole(e.target.value as any)} style={selectStyle} disabled={d.addingToOrg || d.saving}>
                          <option value="member">member</option><option value="admin">admin</option>
                        </select>
                      </div>
                      <div style={{ flex: '0 0 auto', marginTop: '22px' }}>
                        <button type="button" disabled={d.addingToOrg || d.saving} onClick={async () => { try { await d.linkToOrganisation(); } catch (e) { d.setExtraError(e instanceof Error ? e.message : 'Failed to add to federation'); } }} style={btnPrimary(d.addingToOrg || d.saving)}>
                          {d.addingToOrg ? 'Adding…' : 'Add to Federation'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'rgba(40, 167, 69, 0.1)', color: 'var(--app-text)' }}>
                    <div className="fs-12 fw-700">✓ Member of {organisationSlug}</div>
                  </div>
                )}

                {/* Club / Team section */}
                <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                  <div style={{ marginBottom: '10px' }} className="fw-800">Add to Club / Team</div>

                  <div style={{ marginBottom: '10px' }}>
                    <label className="block fw-700" style={{ marginBottom: '6px' }}>1. Select Club</label>
                    <select value={d.linkClubKey} onChange={e => { d.setLinkClubKey(e.target.value); d.setLinkTeamKey(''); }} disabled={d.orgProjectsLoading || !organisationSlug || d.addingToProject} style={selectStyle}>
                      <option value="">(Select Club)</option>
                      {d.orgProjects.filter(p => !p.isTeam).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label className="block fw-700" style={{ marginBottom: '6px' }}>2. Select Team (optional)</label>
                    <select value={d.linkTeamKey} onChange={e => d.setLinkTeamKey(e.target.value)} disabled={!d.linkClubKey || d.addingToProject} style={selectStyle}>
                      <option value="">(Select Team)</option>
                      {d.orgProjects.filter(p => p.isTeam).filter(p => !d.linkClubKey || p.parentKey === d.linkClubKey).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="flex-row gap-10 mt-16 flex-wrap">
                    <div style={{ flex: '1 1 auto' }}>
                      <label className="block fw-700" style={{ marginBottom: '6px' }}>Initial Role</label>
                      <select value={d.linkAccessRole} onChange={e => d.setLinkAccessRole(e.target.value as any)} disabled={d.addingToProject} style={selectStyle}>
                        <option value="viewer">viewer</option><option value="editor">editor</option><option value="admin">admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }} className="mt-8">
                  <button type="button" disabled={d.addingToProject || !d.linkClubKey} onClick={() => d.performLinkToProject(d.linkClubKey, d.linkAccessRole, 'club')} style={btnPrimary(d.addingToProject || !d.linkClubKey)}>
                    {d.addingToProject && !d.linkTeamKey ? 'Adding...' : 'Add to Club'}
                  </button>
                  <button type="button" disabled={d.addingToProject || !d.linkTeamKey} onClick={() => d.performLinkToProject(d.linkTeamKey, d.linkAccessRole, 'team')} style={btnPrimary(d.addingToProject || !d.linkTeamKey, '#17a2b8')}>
                    {d.addingToProject && d.linkTeamKey ? 'Adding...' : 'Add to Team'}
                  </button>
                </div>
              </div>
            ) : null}

            {d.extraError && (
              <div style={{ marginTop: '14px', padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>{d.extraError}</div>
            )}
          </div>

          {/* Footer */}
          <div className="border-top" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} disabled={isBusy} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 800 }}>Cancel</button>
            <button type="submit" disabled={isBusy} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #007bff', backgroundColor: '#007bff', color: '#fff', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.7 : 1, fontWeight: 800 }}>
              {d.saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
