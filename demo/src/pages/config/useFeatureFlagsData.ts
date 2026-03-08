/**
 * useFeatureFlagsData — All state, effects, and handlers for FeatureFlagsPage
 *
 * Manages: 16 useState, 2 useEffect (redirect + load), toggle/bulk/sync handlers,
 * filter derivations, selection helpers.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import {
  fetchFlagsForScope,
  updateGlobalFlag,
  seedDefaultFlags,
  syncFlags,
  type ApiFeatureFlag,
} from '../../utils/featureFlagsApi';
import {
  getAllFlagsWithResolution,
  setGlobalFlag,
  type FeatureFlag,
} from '../../utils/featureFlagStorage';

// ── Helpers ──

const debugLog = (...args: unknown[]) => {
};

const isThemeFlagKey = (key: string): boolean => {
  const normalized = String(key || '').toLowerCase();
  return normalized.includes('dark_mode') || normalized.includes('dark_theme');
};

// ── Hook ──

export function useFeatureFlagsData() {
  const navigate = useNavigate();
  const { context, organisations } = useContextSwitcher();
  const { user } = useAuth();

  const [flags, setFlags] = useState<(FeatureFlag | ApiFeatureFlag)[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [useApi, setUseApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [autoSeeded, setAutoSeeded] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubtype, setFilterSubtype] = useState<string>('all');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const isSuperadmin = Boolean((user as any)?.is_superuser) || String((user as any)?.role || '').toLowerCase() === 'superadmin';

  // Breadcrumb context switcher setup (side-effect only)
  useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  // Redirect non-superadmins to their org settings page
  useEffect(() => {
    if (context.isLoading) return;

    if (isSuperadmin) {
      setInitialLoadDone(true);
      setLoading(false);
      return;
    }

    if (currentOrgId) {
      const orgSlug = organisations.find(o => String(o.id) === currentOrgId)?.slug || currentOrgId;
      navigate(`/organisations/${orgSlug}?tab=settings`);
    } else {
      setApiError('Feature flags management requires superadmin access. Please contact your administrator.');
      setLoading(false);
    }
  }, [context.isLoading, currentOrgId, isSuperadmin, organisations, navigate, user]);

  // Reload flags when context changes (GLOBAL-only, no org context)
  useEffect(() => {
    if (!isSuperadmin || !initialLoadDone) return;

    const loadFlags = async () => {
      if (useApi) {
        try {
          setApiError(null);
          setLoading(true);
          debugLog('[FeatureFlagsPage] Fetching GLOBAL flags from API');
          let apiFlags = await fetchFlagsForScope('GLOBAL');
          const normalized = apiFlags.map((flag: any) => ({
            ...flag,
            global_id: flag.global_id || flag.id,
          }));
          setFlags(normalized);

          // Auto-seed once if none found
          if (!autoSeeded && normalized.filter((flag) => String(flag.key || '').startsWith('content__')).length === 0) {
            const result = await seedDefaultFlags();
            setAutoSeeded(true);
            if (result.total === 0) {
              setSeedMessage('No active templates found. Create or activate templates first, then seed again.');
            } else if (result.created === 0 && result.failed === 0) {
              setSeedMessage(`All ${result.total} flags already exist.`);
            } else if (result.created === 0 && result.failed > 0) {
              setSeedMessage('Seeding failed. Check API validation for content flag keys.');
            } else {
              setSeedMessage(`Seeded ${result.created} of ${result.total} content flags.`);
            }
            apiFlags = await fetchFlagsForScope('GLOBAL');
            const normalizedAfterSeed = apiFlags.map((flag: any) => ({
              ...flag,
              global_id: flag.global_id || flag.id,
            }));
            setFlags(normalizedAfterSeed);
          }
        } catch (err: unknown) {
          console.error(err);
          console.warn('API failed:', err);

          if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
            setApiError('Permission denied. Please ensure you are logged in with the correct permissions.');
            setFlags([]);
            return;
          }

          debugLog('Falling back to local storage due to non-auth error');
          setUseApi(false);
          const resolvedFlags = getAllFlagsWithResolution(null);
          setFlags(resolvedFlags);
        } finally {
          setLoading(false);
        }
      } else {
        const resolvedFlags = getAllFlagsWithResolution(null);
        debugLog('[FeatureFlagsPage] Loaded GLOBAL flags from storage. Count:', resolvedFlags.length);
        setFlags(resolvedFlags);
        setLoading(false);
      }
    };

    loadFlags();

    const handleStorageChange = (e: Event) => {
      debugLog('[FeatureFlagsPage] Storage event received:', e.type);
      setTimeout(() => { loadFlags(); }, 0);
    };

    window.addEventListener('featureFlagsChanged', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('featureFlagsChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [useApi, isSuperadmin, initialLoadDone]);

  // ── Toggle single flag ──

  const handleToggleFlag = async (flag: FeatureFlag | ApiFeatureFlag) => {
    if (updating) {
      debugLog('[FeatureFlagsPage] Already updating, ignoring click');
      return;
    }

    const currentState = flag.enabled;
    const newState = !currentState;

    debugLog('[FeatureFlagsPage] handleToggleFlag called (GLOBAL mode):', {
      flagKey: flag.key,
      currentState,
      newState,
      useApi
    });

    if (useApi) {
      setUpdating(true);
      const apiFlag = flag as ApiFeatureFlag;
      try {
        const globalId = apiFlag.global_id || (apiFlag as any).id;
        debugLog('[FeatureFlagsPage] API: Updating global flag:', globalId, newState);
        await updateGlobalFlag(String(globalId), newState);

        debugLog('[FeatureFlagsPage] Reloading GLOBAL flags after update');
        const apiFlags = await fetchFlagsForScope('GLOBAL');
        const normalized = apiFlags.map((f: any) => ({
          ...f,
          global_id: f.global_id || f.id,
        }));
        debugLog('[FeatureFlagsPage] Reloaded flags:', normalized);
        setFlags(normalized);

        window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
        debugLog('[FeatureFlagsPage] Successfully updated flag and reloaded data');
      } catch (err) {
        console.error(err);
        console.error('Failed to toggle flag via API:', err);
        alert('Failed to update flag. See console for details.');
      } finally {
        setUpdating(false);
      }
      return;
    }

    // Fallback Logic (Storage) - Global mode only
    debugLog('[FeatureFlagsPage] Setting global flag:', flag.key, newState);
    setGlobalFlag(flag.key, newState);
    const resolvedFlags = getAllFlagsWithResolution(null);
    setFlags(resolvedFlags);
    window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
  };

  // ── Derived filter data ──

  const displayFlags = flags
    .filter((flag) => !isThemeFlagKey(flag.key))
    .filter((flag) => String(flag.key || '').startsWith('content__'))
    .filter((flag) => {
      const parts = String(flag.key || '').split('__');
      const type = parts[1] || '';
      const subtype = parts[2] || '';
      const styleIndex = parts.findIndex((p) => p === 'style');
      const style = styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
      if (filterType !== 'all' && type !== filterType) return false;
      if (filterSubtype !== 'all' && subtype !== filterSubtype) return false;
      if (filterStyle !== 'all' && style !== filterStyle) return false;
      return true;
    });

  const uniqueTypes = Array.from(new Set(
    flags
      .filter((flag) => String(flag.key || '').startsWith('content__'))
      .map((flag) => String(flag.key || '').split('__')[1])
      .filter(Boolean)
  )).sort();

  const uniqueSubtypes = Array.from(new Set(
    flags
      .filter((flag) => String(flag.key || '').startsWith('content__'))
      .map((flag) => String(flag.key || '').split('__')[2])
      .filter(Boolean)
  )).sort();

  const uniqueStyles = Array.from(new Set(
    flags
      .filter((flag) => String(flag.key || '').startsWith('content__'))
      .map((flag) => {
        const parts = String(flag.key || '').split('__');
        const styleIndex = parts.findIndex((p) => p === 'style');
        return styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
      })
      .filter(Boolean)
  )).sort();

  // ── Selection helpers ──

  const allSelected = displayFlags.length > 0 && displayFlags.every((f) => selectedIds.has(f.id));
  const someSelected = selectedIds.size > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayFlags.map((f) => f.id)));
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

  // ── Bulk actions ──

  const handleBulkUpdate = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const toUpdate = displayFlags.filter((f) => selectedIds.has(f.id));
      for (const flag of toUpdate) {
        await updateGlobalFlag(flag.id, enabled);
      }
      const apiFlags = await fetchFlagsForScope('GLOBAL');
      const normalized = apiFlags.map((f: any) => ({
        ...f,
        global_id: f.global_id || f.id,
      }));
      setFlags(normalized);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      console.error('Bulk update failed:', err);
      alert('Bulk update failed. Check console for details.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSyncFlags = async () => {
    setSyncing(true);
    setSeedMessage(null);
    try {
      const result = await syncFlags();
      if (result.created === 0 && result.updated === 0) {
        setSeedMessage(`All ${result.total} flags are in sync.`);
      } else {
        setSeedMessage(`Synced: ${result.created} created, ${result.updated} updated (${result.total} total).`);
      }
      const apiFlags = await fetchFlagsForScope('GLOBAL');
      const normalized = apiFlags.map((f: any) => ({
        ...f,
        global_id: f.global_id || f.id,
      }));
      setFlags(normalized);
    } catch (err) {
      console.error(err);
      console.error('Sync failed:', err);
      setSeedMessage('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Clear filters ──

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterSubtype('all');
    setFilterStyle('all');
    setSelectedIds(new Set());
  };

  return {
    loading,
    seedMessage,
    apiError,
    useApi,
    displayFlags,
    uniqueTypes,
    uniqueSubtypes,
    uniqueStyles,
    filterType, setFilterType,
    filterSubtype, setFilterSubtype,
    filterStyle, setFilterStyle,
    selectedIds,
    allSelected,
    someSelected,
    bulkUpdating,
    syncing,
    handleSelectAll,
    handleSelectOne,
    handleBulkUpdate,
    handleSyncFlags,
    handleToggleFlag,
    handleClearFilters,
  };
}
