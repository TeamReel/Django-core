/**
 * ContentAvailabilityFilters - Filter controls for content availability
 */
import React from 'react';
import { Button } from '@django-core/design-system';
import styles from '../ContentAvailabilityCard.module.css';

interface ContentAvailabilityFiltersProps {
  filterType: string;
  setFilterType: (v: string) => void;
  filterSubtype: string;
  setFilterSubtype: (v: string) => void;
  filterStyle: string;
  setFilterStyle: (v: string) => void;
  uniqueTypes: string[];
  uniqueSubtypes: string[];
  uniqueStyles: string[];
  selectedIds: Set<string>;
  bulkUpdating: boolean;
  onBulkUpdate: (enabled: boolean) => void;
  onClear: () => void;
}

export function ContentAvailabilityFilters({
  filterType,
  setFilterType,
  filterSubtype,
  setFilterSubtype,
  filterStyle,
  setFilterStyle,
  uniqueTypes,
  uniqueSubtypes,
  uniqueStyles,
  selectedIds,
  bulkUpdating,
  onBulkUpdate,
  onClear,
}: ContentAvailabilityFiltersProps) {
  const someSelected = selectedIds.size > 0;

  return (
    <div className="flex-row flex-wrap gap-12 mb-16 px-16">
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        <option value="all">Type: All</option>
        {uniqueTypes.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <select
        value={filterSubtype}
        onChange={(e) => setFilterSubtype(e.target.value)}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        <option value="all">Subtype: All</option>
        {uniqueSubtypes.map((subtype) => (
          <option key={subtype} value={subtype}>{subtype}</option>
        ))}
      </select>
      <select
        value={filterStyle}
        onChange={(e) => setFilterStyle(e.target.value)}
        className="py-8 px-12 border rounded-4 fs-14 bg-surface"
      >
        <option value="all">Style: All</option>
        {uniqueStyles.map((style) => (
          <option key={style} value={style}>{style}</option>
        ))}
      </select>
      <div className="ml-auto flex-row gap-8">
        {someSelected && (
          <>
            <span className={`fs-13 ${styles.selectedCount}`}>
              {selectedIds.size} selected
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={bulkUpdating}
              onClick={() => onBulkUpdate(true)}
            >
              {bulkUpdating ? '...' : 'Enable'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkUpdating}
              onClick={() => onBulkUpdate(false)}
            >
              {bulkUpdating ? '...' : 'Disable'}
            </Button>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
