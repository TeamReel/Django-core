/**
 * Shared filter bar for all directory list pages.
 *
 * Renders the: Federation / Club / Team / Season / Competition / Status / Sport /
 * Variant dropdowns + Clear & Create buttons — all driven by the state from
 * `useDirectoryFilters`.
 */

import React from 'react';
import { Button } from '@django-core/design-system';
import { filterSelectStyle, getTeamParentId } from '../utils/directoryHelpers';
import type { DirectoryFiltersState } from '../hooks/useDirectoryFilters';
import type { ProjectOption } from '../pages/work/WorkFilterBar';
import type { SeasonOption } from '../utils/directoryHelpers';
import type { Sport } from '../hooks/useSports';

export interface DirectoryFilterBarProps {
  filters: DirectoryFiltersState;
  createButtonLabel: string;
  onCreateClick: () => void;
  /** Show season dropdown (Competitions + Matches). */
  showSeasonFilter?: boolean;
  /** Show competition dropdown (Matches only). */
  showCompetitionFilter?: boolean;
  /** Show sport variant dropdown. */
  showVariantFilter?: boolean;
  /** Extra elements (e.g. Load More / Load All buttons). */
  extraActions?: React.ReactNode;
}

export const DirectoryFilterBar: React.FC<DirectoryFilterBarProps> = ({
  filters,
  createButtonLabel,
  onCreateClick,
  showSeasonFilter = false,
  showCompetitionFilter = false,
  showVariantFilter = false,
  extraActions,
}) => {
  const {
    isSuperAdmin,
    orgLocked,
    clubLocked,
    teamLocked,
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    variantFilter,
    selectedSeasonName,
    seasonOptions,
    selectedCompetitionId,
    competitions,
    categories,
    getVariantsForCategory,
    setSelectedOrgId,
    setSelectedClubId,
    setSelectedTeamId,
    setStatusFilter,
    setSportFilter,
    setVariantFilter,
    setSelectedSeasonName,
    setSelectedCompetitionId,
    clearAll,
  } = filters;

  // Variant options — derived from selected sport category
  const variantOptions = React.useMemo(() => {
    if (!showVariantFilter || sportFilter === 'all') return [];
    return getVariantsForCategory(sportFilter) || [];
  }, [showVariantFilter, sportFilter, getVariantsForCategory]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      {/* Federation */}
      {isSuperAdmin && !orgLocked && (
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="">Federation: All</option>
          {[...organisations]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
        </select>
      )}

      {/* Club */}
      {!clubLocked && (
        <select
          value={selectedClubId}
          onChange={(e) => setSelectedClubId(e.target.value)}
          disabled={clubLocked}
          style={filterSelectStyle}
        >
          <option value="">Club: All</option>
          {clubs
            .filter((c: ProjectOption) => {
              if (!selectedOrgId) return true;
              const cOrg =
                typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
              return String(cOrg) === String(selectedOrgId);
            })
            .sort((a: ProjectOption, b: ProjectOption) => String(a.name).localeCompare(String(b.name)))
            .map((c: ProjectOption) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
        </select>
      )}

      {/* Team */}
      {!teamLocked && (
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          disabled={teamLocked}
          style={filterSelectStyle}
        >
          <option value="">Team: All</option>
          {teams
            .filter((t: ProjectOption) => {
              if (!selectedClubId) return true;
              const tParent = getTeamParentId(t);
              return String(tParent) === String(selectedClubId);
            })
            .sort((a: ProjectOption, b: ProjectOption) => String(a.name).localeCompare(String(b.name)))
            .map((t: ProjectOption) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
        </select>
      )}

      {/* Season (Competitions + Matches) */}
      {showSeasonFilter && (
        <select
          value={selectedSeasonName}
          onChange={(e) => setSelectedSeasonName(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="">Season: All</option>
          {seasonOptions.map((opt: SeasonOption) => (
            <option key={opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      )}

      {/* Competition (Matches only) */}
      {showCompetitionFilter && (
        <select
          value={selectedCompetitionId}
          onChange={(e) => setSelectedCompetitionId(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="">Competition: All</option>
          {competitions
            .sort((a, b) =>
              String(a?.name || '').localeCompare(String(b?.name || '')),
            )
            .map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
        </select>
      )}

      {/* Status */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={filterSelectStyle}
      >
        <option value="all">Status: All</option>
        <option value="active">Status: Active</option>
        <option value="inactive">Status: Inactive</option>
      </select>

      {/* Sport */}
      <select
        value={sportFilter}
        onChange={(e) => {
          setSportFilter(e.target.value);
          if (showVariantFilter) setVariantFilter('all');
        }}
        style={filterSelectStyle}
      >
        <option value="all">Sport: All</option>
        {categories.map((sport: Sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.sport_icon} {sport.name}
          </option>
        ))}
      </select>

      {/* Sport Variant */}
      {showVariantFilter && variantOptions.length > 0 && (
        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">Variant: All</option>
          {variantOptions.map((v: Sport) => (
            <option key={v.id} value={v.id}>
              {v.sport_icon} {v.name}
            </option>
          ))}
        </select>
      )}

      {/* Actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
        {extraActions}
        <Button variant="secondary" size="md" onClick={clearAll}>
          Clear
        </Button>
        <Button variant="primary" size="md" onClick={onCreateClick}>
          {createButtonLabel}
        </Button>
      </div>
    </div>
  );
};
