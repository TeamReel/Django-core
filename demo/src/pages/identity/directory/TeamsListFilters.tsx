import React from 'react';
import type { OrganisationOption } from '../../work/WorkFilterBar';
import dp from './DirectoryPremium.module.css';

interface ClubFilterOption {
  id: string | number;
  name: string;
  organisation?: string | { id: string; name?: string; slug?: string };
}

interface SportCategoryOption {
  id: string | number;
  name: string;
  sport_icon?: string;
}

interface TeamsListFiltersProps {
  isSuperAdmin: boolean;
  orgLocked: boolean;
  clubLocked: boolean;
  organisations: OrganisationOption[];
  clubs: ClubFilterOption[];
  categories: SportCategoryOption[];
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

export const TeamsListFilters: React.FC<TeamsListFiltersProps> = ({
  isSuperAdmin, orgLocked, clubLocked, organisations, clubs, categories,
  selectedOrgId, selectedClubId, statusFilter, sportFilter,
  userCanEditProject, onOrgChange, onClubChange, onStatusChange, onSportChange,
  onClear, onCreateTeam,
}) => (
  <div className={dp.filterBar}>
    {isSuperAdmin && !orgLocked && (
      <select
        value={selectedOrgId}
        onChange={(e) => onOrgChange(e.target.value)}
        className={dp.filterSelect}
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
        className={dp.filterSelect}
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
      className={dp.filterSelect}
    >
      <option value="all">Status: All</option>
      <option value="active">Status: Active</option>
      <option value="inactive">Status: Inactive</option>
    </select>

    <select
      value={sportFilter}
      onChange={(e) => onSportChange(e.target.value)}
      className={dp.filterSelect}
    >
      <option value="all">Sport: All</option>
      {categories.map((sport: any) => (
        <option key={sport.id} value={sport.id}>{sport.sport_icon} {sport.name}</option>
      ))}
    </select>

    <div className={dp.filterActions}>
      <button type="button" className={dp.filterBtn} onClick={onClear}>
        Clear
      </button>
      {userCanEditProject && (
        <button type="button" className={dp.filterBtnPrimary} onClick={onCreateTeam}>
          Create Team
        </button>
      )}
    </div>
  </div>
);
