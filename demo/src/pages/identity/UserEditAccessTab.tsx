/**
 * UserEditAccessTab — "Access & roles" tab of the UserEditModal.
 *
 * Displays RBAC summary, federation settings, club settings, team settings,
 * and functional role checkboxes.
 */
import type { User, ProjectChoice } from './userEditTypes';
import {
  FUNCTIONAL_ROLE_OPTIONS,
  ADMIN_LIKE_ROLES,
  getRbacLabel,
  RbacBadge,
} from './userEditTypes';

interface UserEditAccessTabProps {
  user: User;
  organisationSlug?: string;
  saving: boolean;

  // Org
  orgRole: 'member' | 'admin';
  setOrgRole: (r: 'member' | 'admin') => void;
  orgMembershipId: string | null;
  inviteOrgRole: 'member' | 'admin';
  setInviteOrgRole: (r: 'member' | 'admin') => void;
  addingToOrg: boolean;
  linkToOrganisation: () => Promise<void>;
  setExtraError: (e: string | null) => void;

  // Club
  selectedClubKey: string;
  setSelectedClubKey: (k: string) => void;
  clubMembershipId: string | null;
  clubAccessRole: 'viewer' | 'editor' | 'admin';
  setClubAccessRole: (r: 'viewer' | 'editor' | 'admin') => void;

  // Team
  selectedTeamKey: string;
  setSelectedTeamKey: (k: string) => void;
  teamMembershipId: string | null;
  teamAccessRole: 'viewer' | 'editor' | 'admin';
  setTeamAccessRole: (r: 'viewer' | 'editor' | 'admin') => void;
  functionalRoles: string[];
  setFunctionalRoles: React.Dispatch<React.SetStateAction<string[]>>;

  availableProjects: ProjectChoice[];
}

export function UserEditAccessTab({
  organisationSlug, saving,
  orgRole, setOrgRole, orgMembershipId,
  inviteOrgRole, setInviteOrgRole, addingToOrg, linkToOrganisation, setExtraError,
  selectedClubKey, setSelectedClubKey, clubMembershipId, clubAccessRole, setClubAccessRole,
  selectedTeamKey, setSelectedTeamKey, teamMembershipId, teamAccessRole, setTeamAccessRole,
  functionalRoles, setFunctionalRoles, availableProjects,
}: UserEditAccessTabProps) {
  const selectStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' };
  const btnPrimary = (disabled: boolean): React.CSSProperties => ({
    padding: '10px 12px', borderRadius: '6px', border: '1px solid #007bff', backgroundColor: 'var(--app-primary)',
    color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 800,
  });

  return (
    <div className="flex-col gap-16">
      {/* RBAC summary */}
      <div className="rounded-8" style={{ padding: '12px 14px', border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
        <div className="fs-12 text-muted mb-8 fw-700">Huidige TeamReel rollen</div>
        <div className="flex-row gap-8 flex-wrap">
          {orgMembershipId && orgRole === 'admin' && <RbacBadge label="Land Admin" />}
          {selectedClubKey && clubMembershipId && <RbacBadge label={getRbacLabel(clubAccessRole, false)} />}
          {selectedTeamKey && teamMembershipId && <RbacBadge label={getRbacLabel(teamAccessRole, true)} />}
          {!orgMembershipId && !clubMembershipId && !teamMembershipId && (
            <span className="fs-12 text-muted">Geen actieve rollen gevonden. Selecteer een club of team hieronder.</span>
          )}
        </div>
      </div>

      {/* Federation settings */}
      <div>
        <div className="fw-800" style={{ marginBottom: '6px' }}>Federation settings</div>
        {organisationSlug ? (
          <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
            <div className="flex-row gap-12 flex-wrap">
              <div style={{ flex: '1 1 260px' }}>
                <div className="fs-12 text-muted mb-4">Federation</div>
                <div className="fw-800">{String(organisationSlug)}</div>
              </div>
              {orgMembershipId ? (
                <div style={{ flex: '1 1 220px' }}>
                  <label className="block fw-700" style={{ marginBottom: '6px' }}>Org role</label>
                  <div className="flex-row gap-10 flex-wrap">
                    <select value={orgRole} onChange={e => setOrgRole(e.target.value as any)} style={{ ...selectStyle, flex: '1 1 140px', width: 'auto' }} disabled={saving}>
                      <option value="member">member</option>
                      <option value="admin">admin → Land Admin</option>
                    </select>
                    {orgRole === 'admin' && <RbacBadge label="Land Admin" />}
                  </div>
                </div>
              ) : (
                <div style={{ flex: '1 1 360px' }}>
                  <div className="fs-12 text-muted" style={{ marginBottom: '6px' }}>This user is not a direct member of this federation.</div>
                  <div className="flex-row gap-10 flex-wrap">
                    <select value={inviteOrgRole} onChange={e => setInviteOrgRole(e.target.value as any)} style={{ ...selectStyle, width: 'auto' }} disabled={addingToOrg || saving}>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    <button type="button" disabled={addingToOrg || saving} onClick={async () => { try { await linkToOrganisation(); } catch (e) { setExtraError(e instanceof Error ? e.message : 'Failed to add to federation'); } }} style={btnPrimary(addingToOrg || saving)}>
                      {addingToOrg ? 'Adding…' : 'Add to federation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted fs-12">Tip: open this modal from a federation context to edit federation membership.</div>
        )}
      </div>

      {/* Club settings */}
      <div className="border-top" style={{ paddingTop: '12px' }}>
        <div className="fw-800" style={{ marginBottom: '10px' }}>Club Settings</div>
        <div style={{ marginBottom: '10px' }}>
          <label className="block fw-700" style={{ marginBottom: '6px' }}>Choose a club</label>
          <select value={selectedClubKey} onChange={e => setSelectedClubKey(e.target.value)} style={selectStyle}>
            <option value="">(select)</option>
            {availableProjects.filter(p => !p.isTeam).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </div>
        {selectedClubKey && clubMembershipId ? (
          <div className="mb-12">
            <label className="block fw-700" style={{ marginBottom: '6px' }}>TeamReel rol</label>
            <div className="flex-row gap-12 flex-wrap">
              <select value={clubAccessRole} onChange={e => setClubAccessRole(e.target.value as any)} style={{ ...selectStyle, flex: '1 1 200px', width: 'auto' }}>
                <option value="admin">admin → Club Admin</option>
                <option value="editor">editor → Club Admin</option>
                <option value="viewer">viewer → Supporter</option>
              </select>
              <RbacBadge label={getRbacLabel(clubAccessRole, false)} />
            </div>
            <div className="fs-11" style={{ marginTop: '6px', color: 'var(--app-muted-text)' }}>
              {ADMIN_LIKE_ROLES.has(clubAccessRole) ? 'Club Admin — volledige toegang tot alle teams en content van deze club.' : 'Supporter — kan content bekijken, geen bewerkrechten.'}
            </div>
          </div>
        ) : selectedClubKey ? (
          <div className="text-muted fs-12" style={{ marginBottom: '10px' }}>Gebruiker is geen lid van deze club. Ga naar "Add to club/team" om toe te voegen.</div>
        ) : null}
      </div>

      {/* Team settings */}
      <div className="border-top" style={{ paddingTop: '12px' }}>
        <div className="fw-800" style={{ marginBottom: '10px' }}>Team Settings</div>
        <div style={{ marginBottom: '10px' }}>
          <label className="block fw-700" style={{ marginBottom: '6px' }}>Choose a team</label>
          <select value={selectedTeamKey} onChange={e => setSelectedTeamKey(e.target.value)} style={selectStyle}>
            <option value="">(select)</option>
            {availableProjects.filter(p => p.isTeam).filter(p => !selectedClubKey || p.parentKey === selectedClubKey).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <div className="text-muted fs-12" style={{ marginTop: '6px' }}>{selectedClubKey ? 'Showing teams for selected club.' : 'Select a club above to filter teams.'}</div>
        </div>
        {selectedTeamKey && teamMembershipId ? (
          <>
            <div className="mb-12">
              <label className="block fw-700" style={{ marginBottom: '6px' }}>TeamReel rol</label>
              <div className="flex-row gap-12 flex-wrap">
                <select value={teamAccessRole} onChange={e => setTeamAccessRole(e.target.value as any)} style={{ ...selectStyle, flex: '1 1 200px', width: 'auto' }}>
                  <option value="admin">admin → Team Admin</option>
                  <option value="editor">editor → Team Admin</option>
                  <option value="viewer">viewer → Team Member</option>
                </select>
                <RbacBadge label={getRbacLabel(teamAccessRole, true)} />
              </div>
              <div className="fs-11" style={{ marginTop: '6px', color: 'var(--app-muted-text)' }}>
                {ADMIN_LIKE_ROLES.has(teamAccessRole) ? 'Team Admin — kan teamleden, content en wedstrijden beheren.' : 'Team Member — kan eigen content uploaden en teamcontent bekijken.'}
              </div>
            </div>
            <div>
              <div className="fw-800" style={{ marginBottom: '6px' }}>Functional roles (team only)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px', padding: '10px', borderRadius: '8px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)' }}>
                {FUNCTIONAL_ROLE_OPTIONS.map(opt => {
                  const checked = functionalRoles.includes(opt.value);
                  return (
                    <label key={opt.value} className="flex-row gap-8 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const nextChecked = e.currentTarget.checked;
                        setFunctionalRoles(prev => {
                          const normalized = (Array.isArray(prev) ? prev : []).map(r => String(r || '').trim()).filter(Boolean);
                          const set = new Set(normalized);
                          if (nextChecked) set.add(opt.value); else set.delete(opt.value);
                          return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                        });
                      }} />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        ) : selectedTeamKey ? (
          <div className="text-muted fs-12">Gebruiker is geen lid van dit team. Ga naar "Add to club/team" om toe te voegen.</div>
        ) : null}
      </div>
    </div>
  );
}
