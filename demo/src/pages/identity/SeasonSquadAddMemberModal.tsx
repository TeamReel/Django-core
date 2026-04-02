import React from 'react';
import { Modal } from '@/components/ui/Modal';
import type { SeasonSquadAddMemberModalProps, SeasonSquadAddMemberPayload } from './seasonSquadAddMember.types';
import { useSeasonSquadAddMemberData } from './useSeasonSquadAddMemberData';
import styles from './SeasonSquadAddMemberModal.module.css';

// Re-export payload type so existing imports keep working.
export type { SeasonSquadAddMemberPayload };

const inputClass = 'rounded-6 border bg-surface-2 text-primary';

export default function SeasonSquadAddMemberModal(props: SeasonSquadAddMemberModalProps) {
  const { opened, onClose } = props;
  const d = useSeasonSquadAddMemberData(props);

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Add User to Squad"
      size="md"
      preventClose={d.saving}
      footer={
        <div className={`mt-16 gap-10 ${styles.submitRow}`}>
          <button
            type="submit"
            form="squad-add-form"
            disabled={!d.canSubmit}
            className={`py-8 px-12 rounded-6 fw-600 ${styles.submitButton}`}
            data-disabled={!d.canSubmit ? "true" : undefined}
          >
            {d.saving ? 'Adding…' : 'Add to squad'}
          </button>
        </div>
      }
    >
      {/* Form */}
      <form id="squad-add-form" onSubmit={d.handleSubmit}>
        <div className={`grid ${styles.formGrid}`}>

          {/* Federation */}
          <label className="fw-600" htmlFor="squad-add-org">Federation</label>
          <select
            id="squad-add-org"
            value={d.selectedOrganisationId}
            onChange={(e) => d.applyOrganisationSelection(e.target.value)}
            disabled={d.saving || d.loadingOrganisations}
            className={`${inputClass} ${styles.formInput}`}
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
            className={`${inputClass} ${styles.formInput}`}
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
            className={`${inputClass} ${styles.formInput}`}
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
            className={`${inputClass} ${styles.formInput}`}
          />

          {/* User select */}
          <label className="fw-600" htmlFor="squad-add-user">User</label>
          <select
            id="squad-add-user"
            value={d.selectedUserId}
            onChange={(e) => d.setSelectedUserId(e.target.value)}
            disabled={d.saving || d.loadingUsers || (!d.selectedOrganisationId && !d.selectedClubId && !d.selectedTeamId)}
            className={`${inputClass} ${styles.formInput}`}
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
            className={`${inputClass} ${styles.formInput}`}
          />

          {/* Shirt # */}
          <label className="fw-600" htmlFor="squad-add-shirt">Shirt # (optional)</label>
          <input
            id="squad-add-shirt"
            value={d.shirtNumber}
            onChange={(e) => d.setShirtNumber(e.target.value)}
            disabled={d.saving}
            placeholder="10"
            className={`${inputClass} ${styles.formInput}`}
          />
        </div>

        {/* Error */}
        {d.error && <div className={`mt-12 ${styles.errorText}`}>{d.error}</div>}

        {/* Validation hint */}
        {!d.canSubmit && !d.saving && (
          <div className={`fs-13 ${styles.validationHint}`}>
            {d.missingTeam && d.missingUser
              ? 'Select a team and a user to enable "Add to squad".'
              : d.missingTeam
                ? 'Select a team to enable "Add to squad".'
                : d.missingUser
                  ? 'Select a user to enable "Add to squad".'
                  : null}
          </div>
        )}
      </form>
    </Modal>
  );
}
