/**
 * ContentAvailabilityCard - Manage content template availability by type/subtype/style
 *
 * Scope-aware: Organisation or Project (Club)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import {
  createScopeOverride,
  deleteOrgOverride,
  fetchFlags,
  updateOrgOverride,
  type ApiFeatureFlag,
  type ScopeType,
} from '../../utils/featureFlagsApi';
import {
  TYPE_LABELS,
  SUBTYPE_LABELS,
  getDisplayLabel,
  titleCase,
} from './contentAvailabilityHelpers';
import styles from './ContentAvailabilityCard.module.css';

interface ContentAvailabilityCardProps {
  scopeType: 'ORGANISATION' | 'PROJECT';
  organisationId: string;
  projectId?: string | null;
  scopeName: string;
}

export default function ContentAvailabilityCard({
  scopeType,
  organisationId,
  projectId,
  scopeName,
}: ContentAvailabilityCardProps) {
  const [flags, setFlags] = useState<ApiFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubtype, setFilterSubtype] = useState<string>('all');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchAvailabilityFlags = useCallback(async () => {
    const scopedFlags = await fetchFlags(organisationId, scopeType === 'PROJECT' ? projectId || undefined : undefined);
    setFlags(scopedFlags.filter((flag) => String(flag.key || '').startsWith('content__')));
  }, [organisationId, projectId, scopeType]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAvailabilityFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content availability');
    } finally {
      setLoading(false);
    }
  }, [fetchAvailabilityFlags]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Parse flag key into type/subtype/style components
  const parseFlagKey = (key: string): { type: string; subtype: string; style: string } | null => {
    // Format: content__type or content__type__subtype or content__type__subtype__style__X
    const parts = key.replace(/^content__/, '').split('__');
    if (parts.length === 0 || !parts[0]) return null;

    const type = parts[0];
    let subtype = '';
    let style = '';

    if (parts.length >= 2 && parts[1] !== 'style') {
      subtype = parts[1];
    }

    const styleIdx = parts.indexOf('style');
    if (styleIdx !== -1 && parts[styleIdx + 1]) {
      style = parts[styleIdx + 1];
    }

    return { type, subtype, style };
  };

  const rows = useMemo(() => {
    // Generate rows from FLAGS (not templates) to show all levels including type-only and subtype-only
    const rowList: Array<{
      id: string;
      key: string;
      type: string;
      subtype: string;
      style: string;
      globalValue: boolean | null;
      orgValue: boolean | null;
      projectValue: boolean | null | undefined;
      effectiveValue: boolean;
      disableEnable: boolean;
      disabledReason: string;
      overrideId: string | null;
    }> = [];

    flags.forEach((flag) => {
      const parsed = parseFlagKey(flag.key);
      if (!parsed) return;

      const globalValue = flag?.global_value ?? null;
      const orgValue = flag?.org_value ?? null;
      const projectValue = flag?.project_value ?? null;
      const effectiveValue = flag?.enabled ?? true;

      const isGlobalDisabled = globalValue === false;
      const isOrgDisabled = orgValue === false;

      const disableEnable = scopeType === 'PROJECT'
        ? (isGlobalDisabled || isOrgDisabled)
        : isGlobalDisabled;

      let disabledReason = '';
      if (disableEnable) {
        disabledReason = isGlobalDisabled
          ? 'Cannot enable: Global setting is disabled.'
          : 'Cannot enable: Organisation setting is disabled.';
      }

      rowList.push({
        id: flag.key,
        key: flag.key,
        type: getDisplayLabel(parsed.type, TYPE_LABELS),
        subtype: parsed.subtype ? getDisplayLabel(parsed.subtype, SUBTYPE_LABELS) : '—',
        style: parsed.style ? titleCase(parsed.style) : '—',
        globalValue,
        orgValue,
        projectValue,
        effectiveValue,
        disableEnable,
        disabledReason,
        overrideId:
          scopeType === 'PROJECT'
            ? flag?.project_override_id || null
            : flag?.org_override_id || null,
      });
    });

    // Sort: type, then subtype, then style
    return rowList.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.subtype !== b.subtype) {
        if (a.subtype === '—') return -1;
        if (b.subtype === '—') return 1;
        return a.subtype.localeCompare(b.subtype);
      }
      if (a.style === '—') return -1;
      if (b.style === '—') return 1;
      return a.style.localeCompare(b.style);
    });
  }, [flags, scopeType]);

  // Extract unique values for filter dropdowns
  const uniqueTypes = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.type))).sort(),
    [rows]
  );
  const uniqueSubtypes = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.subtype))).sort(),
    [rows]
  );
  const uniqueStyles = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.style).filter((s) => s !== '—'))).sort(),
    [rows]
  );

  // Apply filters
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterType !== 'all' && row.type !== filterType) return false;
      if (filterSubtype !== 'all' && row.subtype !== filterSubtype) return false;
      if (filterStyle !== 'all' && (row.style === '—' || row.style !== filterStyle)) return false;
      return true;
    });
  }, [rows, filterType, filterSubtype, filterStyle]);

  // Multi-select helpers
  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkUpdate = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const toUpdate = filteredRows.filter((r) => selectedIds.has(r.id));
      for (const row of toUpdate) {
        // Check hierarchy: can't enable if parent is disabled
        if (enabled && row.disableEnable) {
          console.warn(`Skipping ${row.key}: ${row.disabledReason}`);
          continue;
        }
        if (row.overrideId) {
          await updateOrgOverride(row.overrideId, enabled);
        } else {
          await createScopeOverride(
            scopeType as ScopeType,
            scopeType === 'PROJECT' ? String(projectId) : String(organisationId),
            row.key,
            enabled
          );
        }
      }
      await fetchAvailabilityFlags();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk update failed:', err);
      alert('Bulk update failed. Check console for details.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleToggle = async (row: typeof rows[number]) => {
    if (updatingKey) return;

    const nextValue = !row.effectiveValue;
    if (nextValue && row.disableEnable) {
      alert(row.disabledReason);
      return;
    }

    setUpdatingKey(row.key);
    try {
      if (row.overrideId) {
        await updateOrgOverride(row.overrideId, nextValue);
      } else {
        await createScopeOverride(scopeType as ScopeType, scopeType === 'PROJECT' ? String(projectId) : String(organisationId), row.key, nextValue);
      }
      await fetchAvailabilityFlags();
    } catch (err) {
      console.error('Failed to update availability flag:', err);
      alert('Failed to update availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleReset = async (row: typeof rows[number]) => {
    if (!row.overrideId) return;
    setUpdatingKey(row.key);
    try {
      await deleteOrgOverride(row.overrideId);
      await fetchAvailabilityFlags();
    } catch (err) {
      console.error('Failed to reset availability flag:', err);
      alert('Failed to reset availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">Loading content availability…</div>
      </Card>
    );
  }

  return (
    <Card>
      <Alert variant="info" className="mb-4">
        <strong>Content Availability:</strong> Control which template types are available for <strong>{scopeName}</strong>.
        Higher-level disabled settings override lower-level ones.
      </Alert>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Filters */}
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
                onClick={() => handleBulkUpdate(true)}
              >
                {bulkUpdating ? '...' : 'Enable'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkUpdating}
                onClick={() => handleBulkUpdate(false)}
              >
                {bulkUpdating ? '...' : 'Disable'}
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilterType('all');
              setFilterSubtype('all');
              setFilterStyle('all');
              setSelectedIds(new Set());
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No templates match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="dir-table">
            <thead>
              <tr>
                <th className={`dir-th ${styles.colCheckbox}`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
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
              {filteredRows.map((row) => {
                const isUpdating = updatingKey === row.key;
                const orgDisplay = row.orgValue;
                const projectDisplay = row.projectValue;
                const isSelected = selectedIds.has(row.id);

                return (
                  <tr key={row.id}>
                    <td className="dir-td">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(row.id)}
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
                          onClick={() => handleToggle(row)}
                        >
                          {isUpdating ? '...' : row.effectiveValue ? 'Disable' : 'Enable'}
                        </button>
                        {row.overrideId && (
                          <button
                            className="action-btn"
                            onClick={() => handleReset(row)}
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
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
