import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLinkUserModal } from './useLinkUserModal';
import { accessRoleOptions, functionalRoleOptions } from './linkUserModalTypes';
import type { LinkUserModalProps } from './linkUserModalTypes';
import styles from './LinkUserModal.module.css';

/* ── tiny DRY helper for the 3 unlink buttons ────────────── */
function UnlinkButton({
  label,
  saving,
  onClick,
}: {
  label: string;
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={saving}
        onClick={onClick}
        className="btn-danger-sm"
        style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        {label}
      </button>
    </div>
  );
}

/* ── main modal ───────────────────────────────────────────── */
export default function LinkUserModal(props: LinkUserModalProps) {
  const { opened, onClose } = props;
  const d = useLinkUserModal(props);

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title={<>Link {d.userDisplayName}</>}
      subtitle="Link this user to a Federation (organisation) and optionally to a Club/Team."
      size="md"
      footer={
        <div className="flex-row justify-end gap-12">
          <button
            type="button"
            onClick={onClose}
            disabled={d.saving}
            className="btn-modal btn-modal-secondary fs-14"
            style={{ cursor: d.saving ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="link-user-form"
            disabled={d.saving || !d.canSubmit}
            className="btn-modal btn-modal-primary fs-14"
            style={{
              cursor: d.saving || !d.canSubmit ? 'not-allowed' : 'pointer',
              opacity: d.saving || !d.canSubmit ? 0.65 : 1,
            }}
          >
            {d.saving ? 'Linking…' : 'Link'}
          </button>
        </div>
      }
    >

      <form id="link-user-form" onSubmit={d.onSubmit}>
          <div className="flex-col gap-12">
            {d.error && (
              <div className="callout-error fs-14">
                {d.error}
              </div>
            )}
            {d.successNote && (
              <div className="callout-success fs-14">
                {d.successNote}
              </div>
            )}

            {/* ── Federation + Role ─────────────────────── */}
            <div className="grid-cols-2 gap-12">
              <div>
                <label className="form-label-upper">Federation</label>
                <select
                  value={d.organisationId}
                  onChange={(e) => d.setOrganisationId(e.target.value)}
                  className="form-input fs-14"
                >
                  <option value="">(optional) Select Federation…</option>
                  {(props.organisations || []).map((org) => (
                    <option key={String(org.id)} value={String(org.id)} disabled={d.existingOrgIds.has(String(org.id))}>
                      {org.name}{d.existingOrgIds.has(String(org.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {d.organisationId && d.existingOrgIds.has(String(d.organisationId)) && (
                  <UnlinkButton label="Unlink Federation" saving={d.saving} onClick={() => d.handleUnlink('federation')} />
                )}
              </div>
              <div>
                <label className="form-label-upper">Federation Role</label>
                <select
                  value={d.orgRole}
                  onChange={(e) => d.setOrgRole(e.target.value as 'admin' | 'member')}
                  className="form-input fs-14"
                  disabled={!d.organisationId}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* ── Club + Team ───────────────────────────── */}
            <div className="grid-cols-2 gap-12">
              <div>
                <label className="form-label-upper">Club</label>
                <select
                  value={d.clubId}
                  onChange={(e) => { d.setClubId(e.target.value); d.setTeamId(''); d.setSeasonId(''); }}
                  className="form-input fs-14"
                >
                  <option value="">(optional) Select Club…</option>
                  {d.filteredClubs.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}{d.existingProjectIds.has(String(c.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {d.clubId && d.existingProjectIds.has(String(d.clubId)) && (
                  <UnlinkButton label="Unlink Club" saving={d.saving} onClick={() => d.handleUnlink('club', String(d.clubId))} />
                )}
              </div>
              <div>
                <label className="form-label-upper">Team</label>
                <select
                  value={d.teamId}
                  onChange={(e) => { d.setTeamId(e.target.value); d.setSeasonId(''); }}
                  className="form-input fs-14"
                >
                  <option value="">(optional) Select Team…</option>
                  {d.filteredTeams.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}{d.existingProjectIds.has(String(t.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {d.teamId && d.existingProjectIds.has(String(d.teamId)) && (
                  <UnlinkButton label="Unlink Team" saving={d.saving} onClick={() => d.handleUnlink('team', String(d.teamId))} />
                )}
              </div>
            </div>

            {/* ── Access Role ───────────────────────────── */}
            <div>
              <label className="form-label-upper">Access Role (permissions)</label>
              <select
                value={d.accessRole}
                onChange={(e) => d.setAccessRole((e.target.value as 'viewer' | 'editor' | 'admin') || 'viewer')}
                className="form-input fs-14"
                disabled={!d.clubId && !d.teamId}
              >
                {accessRoleOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="text-muted fs-12 mt-4 leading-snug">
                This controls backend access for the Club/Team (viewer/editor/admin). Team-level functional roles are managed separately and can be multi-valued.
              </div>
            </div>

            {/* ── Functional Roles ──────────────────────── */}
            <div>
              <label className="form-label-upper">Functional Roles (team only)</label>
              <div
                className={`${styles.functionalRolesGrid} ${d.teamId ? '' : styles.functionalRolesGridDisabled}`}
              >
                {functionalRoleOptions.map((opt) => {
                  const checked = d.functionalRoles.includes(opt.value);
                  return (
                    <label key={opt.value} className="flex-row gap-8 fs-13">
                      <input
                        type="checkbox"
                        disabled={!d.teamId}
                        checked={checked}
                        onChange={(e) => {
                          const nextChecked = e.target.checked;
                          d.setFunctionalRoles((prev) => {
                            const set = new Set(prev);
                            if (nextChecked) set.add(opt.value);
                            else set.delete(opt.value);
                            return Array.from(set);
                          });
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
              <div className="text-muted fs-12 mt-4 leading-snug">
                Tip: Team Admins automatically show as &quot;Coach&quot; in the API.
              </div>
            </div>

            {/* ── Season ────────────────────────────── */}
            <div>
              <label className="form-label-upper">Season (optional)</label>
              <select
                value={d.seasonId}
                onChange={(e) => d.setSeasonId(e.target.value)}
                className="form-input fs-14"
                disabled={!d.teamId || d.seasonOptions.length === 0}
              >
                <option value="">{!d.teamId ? 'Select a team first…' : '(optional) Select Season…'}</option>
                {d.seasonOptions.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <div className="text-muted fs-12 mt-4 leading-snug">
                If set, the team membership will be scoped to this season via `period_id`.
              </div>
            </div>

            {/* ── Actions ───────────────────────────── */}
          </div>
        </form>
    </Modal>
  );
}
