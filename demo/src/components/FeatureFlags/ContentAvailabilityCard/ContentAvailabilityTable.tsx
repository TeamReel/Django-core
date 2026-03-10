/**
 * ContentAvailabilityTable - Table displaying availability flags
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import type { AvailabilityRow } from './types';
import styles from '../ContentAvailabilityCard.module.css';

interface ContentAvailabilityTableProps {
  scopeType: 'ORGANISATION' | 'PROJECT';
  filteredRows: AvailabilityRow[];
  selectedIds: Set<string>;
  allSelected: boolean;
  updatingKey: string | null;
  onSelectAll: () => void;
  onSelectOne: (id: string) => void;
  onToggle: (row: AvailabilityRow) => void;
  onReset: (row: AvailabilityRow) => void;
}

export function ContentAvailabilityTable({
  scopeType,
  filteredRows,
  selectedIds,
  allSelected,
  updatingKey,
  onSelectAll,
  onSelectOne,
  onToggle,
  onReset,
}: ContentAvailabilityTableProps) {
  if (filteredRows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No templates match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="dir-table">
        <thead>
          <tr>
            <th className={`dir-th ${styles.colCheckbox}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="cursor-pointer"
              />
            </th>
            <th className={`dir-th ${styles.colType}`}>Type</th>
            <th className={`dir-th ${styles.colSubtype}`}>Subtype</th>
            <th className={`dir-th ${styles.colStyle}`}>Style</th>
            <th className={`dir-th ${styles.colNarrow}`}>Global</th>
            {scopeType === 'PROJECT' ? (
              <>
                <th className={`dir-th ${styles.colNarrow}`}>Org</th>
                <th className={`dir-th ${styles.colNarrow}`}>Project</th>
              </>
            ) : (
              <th className={`dir-th ${styles.colNarrow}`}>Org</th>
            )}
            <th className={`dir-th ${styles.colNarrow}`}>Effective</th>
            <th className={`dir-th ${styles.colActions}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <ContentAvailabilityRow
              key={row.id}
              row={row}
              scopeType={scopeType}
              isSelected={selectedIds.has(row.id)}
              isUpdating={updatingKey === row.key}
              onSelect={() => onSelectOne(row.id)}
              onToggle={() => onToggle(row)}
              onReset={() => onReset(row)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ContentAvailabilityRowProps {
  row: AvailabilityRow;
  scopeType: 'ORGANISATION' | 'PROJECT';
  isSelected: boolean;
  isUpdating: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onReset: () => void;
}

function ContentAvailabilityRow({
  row,
  scopeType,
  isSelected,
  isUpdating,
  onSelect,
  onToggle,
  onReset,
}: ContentAvailabilityRowProps) {
  const orgDisplay = row.orgValue;
  const projectDisplay = row.projectValue;

  return (
    <tr>
      <td className="dir-td">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="cursor-pointer"
        />
      </td>
      <td className="dir-td">{row.type}</td>
      <td className="dir-td">{row.subtype}</td>
      <td className="dir-td">{row.style}</td>
      <td className="dir-td">
        <Badge variant={row.globalValue ? 'success' : row.globalValue === false ? 'default' : 'default'} className={`fs-11 ${styles.badgeCompact}`}>
          {row.globalValue === null ? 'On' : row.globalValue ? 'On' : 'Off'}
        </Badge>
      </td>
      <td className="dir-td">
        {orgDisplay === null ? (
          <span className={`fs-11 ${styles.inheritText}`}>Inherit</span>
        ) : (
          <Badge variant={orgDisplay ? 'success' : 'default'} className={`fs-11 ${styles.badgeCompact}`}>
            {orgDisplay ? 'On' : 'Off'}
          </Badge>
        )}
      </td>
      {scopeType === 'PROJECT' && (
        <td className="dir-td">
          {projectDisplay === null || projectDisplay === undefined ? (
            <span className={`fs-11 ${styles.inheritText}`}>Inherit</span>
          ) : (
            <Badge variant={projectDisplay ? 'success' : 'default'} className={`fs-11 ${styles.badgeCompact}`}>
              {projectDisplay ? 'On' : 'Off'}
            </Badge>
          )}
        </td>
      )}
      <td className="dir-td">
        <Badge variant={row.effectiveValue ? 'success' : 'default'} className={`fs-11 ${styles.badgeCompact}`}>
          {row.effectiveValue ? 'On' : 'Off'}
        </Badge>
      </td>
      <td className="dir-td">
        <div className="flex-row gap-4">
          <button
            className={`action-btn${row.effectiveValue ? '' : ' action-btn-primary'}`}
            disabled={isUpdating || (row.disableEnable && !row.effectiveValue)}
            title={row.disableEnable && !row.effectiveValue ? row.disabledReason : undefined}
            onClick={onToggle}
          >
            {isUpdating ? '...' : row.effectiveValue ? 'Disable' : 'Enable'}
          </button>
          {row.overrideId && (
            <button
              className="action-btn"
              onClick={onReset}
              disabled={isUpdating}
              title="Reset"
            >
              Reset
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
