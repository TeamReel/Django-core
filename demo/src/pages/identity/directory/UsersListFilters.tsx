/**
 * UsersListFilters — filter bar for the UsersList page.
 *
 * Receives all filter state + handlers from the parent via props.
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import React from 'react';
import { Button } from '@django-core/design-system';
import type { OrganisationOption, ProjectOption } from './usersListTypes';

interface UsersListFiltersProps {
  isSuperAdmin: boolean;
  orgLocked: boolean;
  clubLocked: boolean;
  teamLocked: boolean;
  selectedOrgId: string;
  selectedClubId: string;
  selectedTeamId: string;
  statusFilter: string;
  roleFilter: string;
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  availableRoles: string[];
  onOrgChange: (orgId: string) => void;
  onClubChange: (clubId: string) => void;
  onTeamChange: (teamId: string) => void;
  onStatusChange: (status: string) => void;
  onRoleChange: (role: string) => void;
  onClearFilters: () => void;
  onAddMember: () => void;
}

export const UsersListFilters: React.FC<UsersListFiltersProps> = ({
  isSuperAdmin,
  orgLocked,
  clubLocked,
  teamLocked,
  selectedOrgId,
  selectedClubId,
  selectedTeamId,
  statusFilter,
  roleFilter,
  organisations,
  clubs,
  teams,
  availableRoles,
  onOrgChange,
  onClubChange,
  onTeamChange,
  onStatusChange,
  onRoleChange,
  onClearFilters,
  onAddMember,
}) => (
  <div className="flex-row gap-12 mb-16 flex-wrap">
    {isSuperAdmin && !orgLocked && (
      <select
        value={selectedOrgId}
        onChange={(e) => onOrgChange(e.target.value)}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        <option value="">Federation: All</option>
        {[...organisations]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
      </select>
    )}

    {!clubLocked && (
      <select
        value={selectedClubId}
        onChange={(e) => onClubChange(e.target.value)}
        disabled={clubLocked}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        {!clubLocked && <option value="">Club: All</option>}
        {clubs
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
    )}

    {!teamLocked && (
      <select
        value={selectedTeamId}
        onChange={(e) => onTeamChange(e.target.value)}
        disabled={teamLocked}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        {!teamLocked && <option value="">Team: All</option>}
        {teams
          .filter((t) => {
            if (selectedClubId) {
              const parent =
                t.parent_id ||
                (typeof t.parent_project === 'object'
                  ? t.parent_project?.id
                  : t.parent_project);
              return String(parent) === String(selectedClubId);
            }
            return true;
          })
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>
    )}

    <select
      value={statusFilter}
      onChange={(e) => onStatusChange(e.target.value)}
      className="py-8 px-12 border rounded-4 fs-14 bg-surface"
    >
      <option value="all">Status: All</option>
      <option value="active">Status: Active</option>
      <option value="inactive">Status: Inactive</option>
    </select>

    <select
      value={roleFilter}
      onChange={(e) => onRoleChange(e.target.value)}
      className="py-8 px-12 border rounded-4 fs-14 bg-surface"
    >
      <option value="">Role: All</option>
      {availableRoles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>

    <div className="ml-auto flex-row gap-12">
      <Button variant="secondary" size="md" onClick={onClearFilters}>
        Clear
      </Button>
      <Button variant="primary" onClick={onAddMember}>
        Add Member
      </Button>
    </div>
  </div>
);
