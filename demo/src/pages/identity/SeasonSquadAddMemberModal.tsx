import React from 'react';
import type { SeasonSquadAddMemberModalProps, SeasonSquadAddMemberPayload } from './seasonSquadAddMember.types';
import { useSeasonSquadAddMemberData } from './useSeasonSquadAddMemberData';

// Re-export payload type so existing imports keep working.
export type { SeasonSquadAddMemberPayload };

const inputStyle = { padding: '8px 10px' };
const inputClass = 'rounded-6 border bg-surface-2 text-primary';

export default function SeasonSquadAddMemberModal(props: SeasonSquadAddMemberModalProps) {
  const { opened, onClose } = props;
  const d = useSeasonSquadAddMemberData(props);

  if (!opened) return null;

  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      }}
    >
      <div
        className="p-24 rounded-8 border bg-surface text-primary"
        style={{ width: '720px', maxWidth: '95%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        {/* Header */}
        <div className="flex-between gap-12">
          <h2 className="mb-12 text-primary" style={{ marginTop: 0 }}>Add User to Squad</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={d.saving}
            className="rounded-4 border bg-surface-2 text-primary"
            style={{ padding: '6px 10px', cursor: d.saving ? 'not-allowed' : 'pointer', height: 'fit-content' }}
          >
            Close
          </button>
        </div>

        {/* Form */}
        <form onSubmit={d.handleSubmit}>
          <div className="grid" style={{ gridTemplateColumns: '160px 1fr', gap: '10px 16px' }}>

            {/* Federation */}
            <label className="fw-600" htmlFor="squad-add-org">Federation</label>
            <select
              id="squad-add-org"
              value={d.selectedOrganisationId}
              onChange={(e) => d.applyOrganisationSelection(e.target.value)}
              disabled={d.saving || d.loadingOrganisations}
              className={inputClass} style={inputStyle}
            >
              <option value="">Select federation…</option>
              {d.sortedOrganisations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>

            {/* Club */}
            <label className="fw-600" htmlFor="squad-add-club">Club</label>
            <select
              id="squad-add-club"
              value={d.selectedClubId}
              onChange={(e) => d.applyClubSelection(e.target.value)}
              disabled={d.saving || d.loadingClubs}
              className={inputClass} style={inputStyle}
            >
              <option value="">Select club…</option>
              {d.filteredClubs.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
              ))}
            </select>

            {/* Team */}
            <label className="fw-600" htmlFor="squad-add-team">Team</label>
            <select
              id="squad-add-team"
              value={d.selectedTeamId}
              onChange={(e) => d.applyTeamSelection(e.target.value)}
              disabled={d.saving || d.loadingTeams}
              className={inputClass} style={inputStyle}
            >
              <option value="">Select team…</option>
              {d.filteredTeams.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
              ))}
            </select>

            {/* User search */}
            <label className="fw-600" htmlFor="squad-add-search">Search user</label>
            <input
              id="squad-add-search"
              value={d.userSearch}
              onChange={(e) => d.setUserSearch(e.target.value)}
              disabled={d.saving || (!d.selectedOrganisationId && !d.selectedClubId && !d.selectedTeamId)}
              placeholder="Filter users (optional)…"
              className={inputClass} style={inputStyle}
            />

            {/* User select */}
            <label className="fw-600" htmlFor="squad-add-user">User</label>
            <select
              id="squad-add-user"
              value={d.selectedUserId}
              onChange={(e) => d.setSelectedUserId(e.target.value)}
              disabled={d.saving || d.loadingUsers || (!d.selectedOrganisationId && !d.selectedClubId && !d.selectedTeamId)}
              className={inputClass} style={inputStyle}
            >
              <option value="">
                {d.loadingUsers
                  ? 'Loading users…'
                  : !d.selectedOrganisationId && !d.selectedClubId && !d.selectedTeamId
                    ? 'Select a federation first…'
                    : d.filteredUserOptions.length
                      ? 'Select user…'
                      : 'No users found…'}
              </option>
              {d.filteredUserOptions.map((u) => {
                const name = u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || String(u.id);
                const label = u.email ? `${name} (${u.email})` : name;
                return <option key={String(u.id)} value={String(u.id)}>{label}</option>;
              })}
            </select>

            {/* Position */}
            <label className="fw-600" htmlFor="squad-add-position">Position (optional)</label>
            <input
              id="squad-add-position"
              value={d.position}
              onChange={(e) => d.setPosition(e.target.value)}
              disabled={d.saving}
              placeholder="e.g. Keeper"
              className={inputClass} style={inputStyle}
            />

            {/* Shirt # */}
            <label className="fw-600" htmlFor="squad-add-shirt">Shirt # (optional)</label>
            <input
              id="squad-add-shirt"
              value={d.shirtNumber}
              onChange={(e) => d.setShirtNumber(e.target.value)}
              disabled={d.saving}
              placeholder="10"
              className={inputClass} style={inputStyle}
            />
          </div>

          {/* Error */}
          {d.error && <div className="mt-12" style={{ color: 'var(--app-danger, #d32f2f)' }}>{d.error}</div>}

          {/* Validation hint */}
          {!d.canSubmit && !d.saving && (
            <div className="fs-13" style={{ marginTop: '10px', color: 'var(--app-text-muted, #6b7280)' }}>
              {d.missingTeam && d.missingUser
                ? 'Select a team and a user to enable "Add to squad".'
                : d.missingTeam
                  ? 'Select a team to enable "Add to squad".'
                  : d.missingUser
                    ? 'Select a user to enable "Add to squad".'
                    : null}
            </div>
          )}

          {/* Submit */}
          <div className="mt-16 gap-10" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={!d.canSubmit}
              className="py-8 px-12 rounded-6 fw-600"
              style={{
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb', color: '#fff',
                cursor: !d.canSubmit ? 'not-allowed' : 'pointer',
                opacity: !d.canSubmit ? 0.7 : 1,
              }}
            >
              {d.saving ? 'Adding…' : 'Add to squad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
