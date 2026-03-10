/**
 * ContentAvailabilityCard hooks
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@/utils/logger';
import {
  createScopeOverride,
  deleteOrgOverride,
  fetchFlags,
  updateOrgOverride,
  type ApiFeatureFlag,
  type ScopeType,
} from '../../../utils/featureFlagsApi';
import {
  TYPE_LABELS,
  SUBTYPE_LABELS,
  getDisplayLabel,
  titleCase,
} from '../contentAvailabilityHelpers';
import type { ContentAvailabilityCardProps, AvailabilityRow } from './types';

export function useContentAvailabilityData({
  scopeType,
  organisationId,
  projectId,
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
      logger.error('Failed to load content availability', err);
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

  const rows = useMemo((): AvailabilityRow[] => {
    const rowList: AvailabilityRow[] = [];

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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterType !== 'all' && row.type !== filterType) return false;
      if (filterSubtype !== 'all' && row.subtype !== filterSubtype) return false;
      if (filterStyle !== 'all' && (row.style === '—' || row.style !== filterStyle)) return false;
      return true;
    });
  }, [rows, filterType, filterSubtype, filterStyle]);

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
        if (enabled && row.disableEnable) {
          logger.warn(`Skipping ${row.key}: ${row.disabledReason}`);
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
      logger.error('Bulk update failed', err);
      alert('Bulk update failed. Check console for details.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleToggle = async (row: AvailabilityRow) => {
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
      logger.error('Failed to update availability flag', err);
      alert('Failed to update availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleReset = async (row: AvailabilityRow) => {
    if (!row.overrideId) return;
    setUpdatingKey(row.key);
    try {
      await deleteOrgOverride(row.overrideId);
      await fetchAvailabilityFlags();
    } catch (err) {
      logger.error('Failed to reset availability flag', err);
      alert('Failed to reset availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterSubtype('all');
    setFilterStyle('all');
    setSelectedIds(new Set());
  };

  return {
    loading,
    error,
    updatingKey,
    filterType,
    setFilterType,
    filterSubtype,
    setFilterSubtype,
    filterStyle,
    setFilterStyle,
    selectedIds,
    bulkUpdating,
    uniqueTypes,
    uniqueSubtypes,
    uniqueStyles,
    filteredRows,
    allSelected,
    someSelected,
    handleSelectAll,
    handleSelectOne,
    handleBulkUpdate,
    handleToggle,
    handleReset,
    clearFilters,
  };
}
