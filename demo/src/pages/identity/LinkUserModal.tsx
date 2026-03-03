import React from 'react';
import { useLinkUserModal } from './useLinkUserModal';
import { accessRoleOptions, functionalRoleOptions } from './linkUserModalTypes';
import type { LinkUserModalProps } from './linkUserModalTypes';

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
        style={{
          padding: '6px 10px',
          borderRadius: '4px',
          border: '1px solid #dc3545',
          backgroundColor: 'var(--app-surface)',
          color: '#dc3545',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
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

  if (!opened) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)', padding: '24px', borderRadius: '8px',
          width: '560px', maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)', border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-12 text-primary" style={{ marginTop: 0 }}>
          Link {d.userDisplayName}
        </h2>
        <div className="mb-16 text-muted fs-13">
          Link this user to a Federation (organisation) and optionally to a Club/Team.
        </div>

        <form onSubmit={d.onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {d.error && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(220,53,69,0.1)', color: '#dc3545', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '4px', fontSize: '14px' }}>
                {d.error}
              </div>
            )}
            {d.successNote && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(40,167,69,0.1)', color: '#1e7e34', border: '1px solid rgba(40,167,69,0.2)', borderRadius: '4px', fontSize: '14px' }}>
                {d.successNote}
              </div>
            )}

            {/* ── Federation + Role ─────────────────────── */}
            <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Federation</label>
                <select
                  value={d.organisationId}
                  onChange={(e) => d.setOrganisationId(e.target.value)}
                  className="w-full p-8 rounded-4 border text-primary fs-14"
                  style={{ backgroundColor: 'var(--app-input-bg)' }}
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
                <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Federation Role</label>
                <select
                  value={d.orgRole}
                  onChange={(e) => d.setOrgRole(e.target.value as any)}
                  className="w-full p-8 rounded-4 border text-primary fs-14"
                  style={{ backgroundColor: 'var(--app-input-bg)' }}
                  disabled={!d.organisationId}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* ── Club + Team ───────────────────────────── */}
            <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Club</label>
                <select
                  value={d.clubId}
                  onChange={(e) => { d.setClubId(e.target.value); d.setTeamId(''); d.setSeasonId(''); }}
                  className="w-full p-8 rounded-4 border text-primary fs-14"
                  style={{ backgroundColor: 'var(--app-input-bg)' }}
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
                <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Team</label>
                <select
                  value={d.teamId}
                  onChange={(e) => { d.setTeamId(e.target.value); d.setSeasonId(''); }}
                  className="w-full p-8 rounded-4 border text-primary fs-14"
                  style={{ backgroundColor: 'var(--app-input-bg)' }}
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
              <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Access Role (permissions)</label>
              <select
                value={d.accessRole}
                onChange={(e) => d.setAccessRole((e.target.value as any) || 'viewer')}
                className="w-full p-8 rounded-4 border text-primary fs-14"
                style={{ backgroundColor: 'var(--app-input-bg)' }}
                disabled={!d.clubId && !d.teamId}
              >
                {accessRoleOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="text-muted fs-12" style={{ marginTop: '6px', lineHeight: 1.35 }}>
                This controls backend access for the Club/Team (viewer/editor/admin). Team-level functional roles are managed separately and can be multi-valued.
              </div>
            </div>

            {/* ── Functional Roles ──────────────────────── */}
            <div>
              <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Functional Roles (team only)</label>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px 12px', padding: '10px',
                  border: '1px solid var(--app-border)', borderRadius: '6px',
                  backgroundColor: 'var(--app-surface)', opacity: d.teamId ? 1 : 0.6,
                }}
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
              <div className="text-muted fs-12" style={{ marginTop: '6px', lineHeight: 1.35 }}>
                Tip: Team Admins automatically show as &quot;Coach&quot; in the API.
              </div>
            </div>

            {/* ── Season ────────────────────────────────── */}
            <div>
              <label className="block fw-600 fs-13" style={{ marginBottom: '6px' }}>Season (optional)</label>
              <select
                value={d.seasonId}
                onChange={(e) => d.setSeasonId(e.target.value)}
                className="w-full p-8 rounded-4 border text-primary fs-14"
                style={{ backgroundColor: 'var(--app-input-bg)' }}
                disabled={!d.teamId || d.seasonOptions.length === 0}
              >
                <option value="">{!d.teamId ? 'Select a team first…' : '(optional) Select Season…'}</option>
                {d.seasonOptions.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <div className="text-muted fs-12" style={{ marginTop: '6px', lineHeight: 1.35 }}>
                If set, the team membership will be scoped to this season via `period_id`.
              </div>
            </div>

            {/* ── Actions ───────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={d.saving}
                style={{
                  padding: '8px 16px', borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)',
                  cursor: d.saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={d.saving || !d.canSubmit}
                style={{
                  padding: '8px 16px', borderRadius: '4px', border: 'none',
                  backgroundColor: d.saving || !d.canSubmit ? '#cccccc' : '#0066cc',
                  color: 'white',
                  cursor: d.saving || !d.canSubmit ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: 600,
                  opacity: d.saving || !d.canSubmit ? 0.65 : 1,
                }}
              >
                {d.saving ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
