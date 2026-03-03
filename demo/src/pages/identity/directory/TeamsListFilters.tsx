import React from 'react';
import { Button } from '@django-core/design-system';
import type { OrganisationOption } from '../../work/WorkFilterBar';

interface TeamsListFiltersProps {
  isSuperAdmin: boolean;
  orgLocked: boolean;
  clubLocked: boolean;
  organisations: OrganisationOption[];
  clubs: any[];
  categories: any[];
  selectedOrgId: string;
  selectedClubId: string;
  statusFilter: string;
  sportFilter: string;
  userCanEditProject: boolean;
  onOrgChange: (id: string) => void;
  onClubChange: (id: string) => void;
  onStatusChange: (v: string) => void;
  onSportChange: (v: string) => void;
  onClear: () => void;
  onCreateTeam: () => void;
}

const selectStyle = {
  border: '1px solid var(--app-border)',
  backgroundColor: 'var(--app-surface)',
};

export const TeamsListFilters: React.FC<TeamsListFiltersProps> = ({
  isSuperAdmin, orgLocked, clubLocked, organisations, clubs, categories,
  selectedOrgId, selectedClubId, statusFilter, sportFilter,
  userCanEditProject, onOrgChange, onClubChange, onStatusChange, onSportChange,
  onClear, onCreateTeam,
}) => (
  <div className="flex-row gap-12 mb-16 flex-wrap">
    {isSuperAdmin && !orgLocked && (
      <select
        value={selectedOrgId}
        onChange={(e) => onOrgChange(e.target.value)}
        className="p-8 px-12 rounded-4 fs-14"
        style={selectStyle}
      >
        <option value="">Federation: All</option>
        {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
    )}

    {!clubLocked && (
      <select
        value={selectedClubId}
        onChange={(e) => onClubChange(e.target.value)}
        disabled={clubLocked}
        className="p-8 px-12 rounded-4 fs-14"
        style={selectStyle}
      >
        <option value="">Club: All</option>
        {clubs
          .filter((c) => {
            if (!selectedOrgId) return true;
            const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
            return String(cOrg) === String(selectedOrgId);
          })
          .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
          .map((c: any) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
      </select>
    )}

    <select
      value={statusFilter}
      onChange={(e) => onStatusChange(e.target.value)}
      className="p-8 px-12 rounded-4 fs-14"
      style={selectStyle}
    >
      <option value="all">Status: All</option>
      <option value="active">Status: Active</option>
      <option value="inactive">Status: Inactive</option>
    </select>

    <select
      value={sportFilter}
      onChange={(e) => onSportChange(e.target.value)}
      className="p-8 px-12 rounded-4 fs-14"
      style={selectStyle}
    >
      <option value="all">Sport: All</option>
      {categories.map((sport: any) => (
        <option key={sport.id} value={sport.id}>{sport.sport_icon} {sport.name}</option>
      ))}
    </select>

    <div className="ml-auto flex-row gap-8">
      <Button variant="secondary" size="md" onClick={onClear}>
        Clear
      </Button>
      {userCanEditProject && (
        <Button variant="primary" size="md" onClick={onCreateTeam}>
          Create Team
        </Button>
      )}
    </div>
  </div>
);
