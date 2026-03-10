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
import styles from './UserEditAccessTab.module.css';

export interface OrgSettingsConfig {
  orgRole: 'member' | 'admin';
  setOrgRole: (r: 'member' | 'admin') => void;
  orgMembershipId: string | null;
  inviteOrgRole: 'member' | 'admin';
  setInviteOrgRole: (r: 'member' | 'admin') => void;
  addingToOrg: boolean;
  linkToOrganisation: () => Promise<void>;
  setExtraError: (e: string | null) => void;
}

export interface ClubSettingsConfig {
  selectedClubKey: string;
  setSelectedClubKey: (k: string) => void;
  clubMembershipId: string | null;
  clubAccessRole: 'viewer' | 'editor' | 'admin';
  setClubAccessRole: (r: 'viewer' | 'editor' | 'admin') => void;
}

export interface TeamSettingsConfig {
  selectedTeamKey: string;
  setSelectedTeamKey: (k: string) => void;
  teamMembershipId: string | null;
  teamAccessRole: 'viewer' | 'editor' | 'admin';
  setTeamAccessRole: (r: 'viewer' | 'editor' | 'admin') => void;
  functionalRoles: string[];
  setFunctionalRoles: React.Dispatch<React.SetStateAction<string[]>>;
}

interface UserEditAccessTabProps {
  user: User;
  organisationSlug?: string;
  saving: boolean;
  orgSettings: OrgSettingsConfig;
  clubSettings: ClubSettingsConfig;
  teamSettings: TeamSettingsConfig;
  availableProjects: ProjectChoice[];
}

export function UserEditAccessTab({
  organisationSlug, saving,
  orgSettings: { orgRole, setOrgRole, orgMembershipId, inviteOrgRole, setInviteOrgRole, addingToOrg, linkToOrganisation, setExtraError },
  clubSettings: { selectedClubKey, setSelectedClubKey, clubMembershipId, clubAccessRole, setClubAccessRole },
  teamSettings: { selectedTeamKey, setSelectedTeamKey, teamMembershipId, teamAccessRole, setTeamAccessRole, functionalRoles, setFunctionalRoles },
  availableProjects,
}: UserEditAccessTabProps) {

  return (
    <div className="flex-col gap-16">
      {/* RBAC summary */}
      <div className="rounded-8 p-12 border bg-surface-2">
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
        <div className="fw-800 mb-4">Federation settings</div>
        {organisationSlug ? (
          <div className="p-12 rounded-8 border bg-surface-2">
            <div className="flex-row gap-12 flex-wrap">
              <div className={styles.fedInfoCol}>
                <div className="fs-12 text-muted mb-4">Federation</div>
                <div className="fw-800">{String(organisationSlug)}</div>
              </div>
              {orgMembershipId ? (
                <div className={styles.orgRoleCol}>
                  <label className="block fw-700 mb-4">Org role</label>
                  <div className="flex-row gap-10 flex-wrap">
                    <select value={orgRole} onChange={e => setOrgRole(e.target.value as 'member' | 'admin')} className={`form-input ${styles.orgRoleSelect}`} disabled={saving}>
                      <option value="member">member</option>
                      <option value="admin">admin → Land Admin</option>
                    </select>
                    {orgRole === 'admin' && <RbacBadge label="Land Admin" />}
                  </div>
                </div>
              ) : (
                <div className={styles.inviteCol}>
                  <div className="fs-12 text-muted mb-4">This user is not a direct member of this federation.</div>
                  <div className="flex-row gap-10 flex-wrap">
                    <select value={inviteOrgRole} onChange={e => setInviteOrgRole(e.target.value as 'member' | 'admin')} className={`form-input ${styles.autoWidthSelect}`} disabled={addingToOrg || saving}>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    <button type="button" disabled={addingToOrg || saving} onClick={async () => { try { await linkToOrganisation(); } catch (e) { setExtraError(e instanceof Error ? e.message : 'Failed to add to federation'); } }} className={`btn-modal btn-modal-primary ${styles.addFedButton}`} data-busy={addingToOrg || saving}>
                      console.error(e);
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
      <div className="border-top pt-12">
        <div className="fw-800 mb-8">Club Settings</div>
        <div className="mb-8">
          <label className="block fw-700 mb-4">Choose a club</label>
          <select value={selectedClubKey} onChange={e => setSelectedClubKey(e.target.value)} className="form-input">
            <option value="">(select)</option>
            {availableProjects.filter(p => !p.isTeam).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </div>
        {selectedClubKey && clubMembershipId ? (
          <div className="mb-12">
            <label className="block fw-700 mb-4">TeamReel rol</label>
            <div className="flex-row gap-12 flex-wrap">
              <select value={clubAccessRole} onChange={e => setClubAccessRole(e.target.value as 'viewer' | 'editor' | 'admin')} className={`form-input ${styles.accessRoleSelect}`}>
                <option value="admin">admin → Club Admin</option>
                <option value="editor">editor → Club Admin</option>
                <option value="viewer">viewer → Supporter</option>
              </select>
              <RbacBadge label={getRbacLabel(clubAccessRole, false)} />
            </div>
            <div className="fs-11 mt-4 text-muted">
              {ADMIN_LIKE_ROLES.has(clubAccessRole) ? 'Club Admin — volledige toegang tot alle teams en content van deze club.' : 'Supporter — kan content bekijken, geen bewerkrechten.'}
            </div>
          </div>
        ) : selectedClubKey ? (
          <div className="text-muted fs-12 mb-8">Gebruiker is geen lid van deze club. Ga naar "Add to club/team" om toe te voegen.</div>
        ) : null}
      </div>

      {/* Team settings */}
      <div className="border-top pt-12">
        <div className="fw-800 mb-8">Team Settings</div>
        <div className="mb-8">
          <label className="block fw-700 mb-4">Choose a team</label>
          <select value={selectedTeamKey} onChange={e => setSelectedTeamKey(e.target.value)} className="form-input">
            <option value="">(select)</option>
            {availableProjects.filter(p => p.isTeam).filter(p => !selectedClubKey || p.parentKey === selectedClubKey).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <div className="text-muted fs-12 mt-4">{selectedClubKey ? 'Showing teams for selected club.' : 'Select a club above to filter teams.'}</div>
        </div>
        {selectedTeamKey && teamMembershipId ? (
          <>
            <div className="mb-12">
              <label className="block fw-700 mb-4">TeamReel rol</label>
              <div className="flex-row gap-12 flex-wrap">
                <select value={teamAccessRole} onChange={e => setTeamAccessRole(e.target.value as 'viewer' | 'editor' | 'admin')} className={`form-input ${styles.accessRoleSelect}`}>
                  <option value="admin">admin → Team Admin</option>
                  <option value="editor">editor → Team Admin</option>
                  <option value="viewer">viewer → Team Member</option>
                </select>
                <RbacBadge label={getRbacLabel(teamAccessRole, true)} />
              </div>
              <div className="fs-11 mt-4 text-muted">
                {ADMIN_LIKE_ROLES.has(teamAccessRole) ? 'Team Admin — kan teamleden, content en wedstrijden beheren.' : 'Team Member — kan eigen content uploaden en teamcontent bekijken.'}
              </div>
            </div>
            <div>
              <div className="fw-800 mb-4">Functional roles (team only)</div>
              <div className="grid-cols-2 gap-8 p-10 rounded-8 border bg-surface-2">
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
