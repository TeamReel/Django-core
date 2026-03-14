/**
 * useFeatureFlagsData — All state, effects, and handlers for FeatureFlagsPage
 *
 * Manages: 16 useState, 2 useEffect (redirect + load), toggle/bulk/sync handlers,
 * filter derivations, selection helpers.
 */

import { useEffect, useMemo, useReducer, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { routes } from '../../routes';
import { useAuth } from '@django-core/auth-ui';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { formReducer, makeSetter } from '@/utils/formReducer';
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

// ── Return type ──

export interface UseFeatureFlagsDataReturn {
  loading: boolean;
  seedMessage: string | null;
  apiError: string | null;
  useApi: boolean;
  displayFlags: (FeatureFlag | ApiFeatureFlag)[];
  uniqueTypes: string[];
  uniqueSubtypes: string[];
  uniqueStyles: string[];
  filterType: string;
  setFilterType: Dispatch<SetStateAction<string>>;
  filterSubtype: string;
  setFilterSubtype: Dispatch<SetStateAction<string>>;
  filterStyle: string;
  setFilterStyle: Dispatch<SetStateAction<string>>;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  bulkUpdating: boolean;
  syncing: boolean;
  handleSelectAll: () => void;
  handleSelectOne: (id: string) => void;
  handleBulkUpdate: (enabled: boolean) => Promise<void>;
  handleSyncFlags: () => Promise<void>;
  handleToggleFlag: (flag: FeatureFlag | ApiFeatureFlag) => Promise<void>;
  handleClearFilters: () => void;
}

// ── Hook ──

export function useFeatureFlagsData(): UseFeatureFlagsDataReturn {
  const navigate = useNavigate();
  const { context, organisations } = useContextSwitcher();
  const { user } = useAuth();
  const { pushToast } = useToast();

  interface FlagsState {
    flags: (FeatureFlag | ApiFeatureFlag)[];
    loading: boolean;
    updating: boolean;
    initialLoadDone: boolean;
    useApi: boolean;
    apiError: string | null;
    seedMessage: string | null;
    autoSeeded: boolean;
    filterType: string;
    filterSubtype: string;
    filterStyle: string;
    selectedIds: Set<string>;
    bulkUpdating: boolean;
    syncing: boolean;
  }

  const [s, dispatch] = useReducer(formReducer<FlagsState>, {
    flags: [], loading: true, updating: false, initialLoadDone: false,
    useApi: true, apiError: null, seedMessage: null, autoSeeded: false,
    filterType: 'all', filterSubtype: 'all', filterStyle: 'all',
    selectedIds: new Set<string>(), bulkUpdating: false, syncing: false,
  });

  const setFlags = useMemo(() => makeSetter<FlagsState, 'flags'>(dispatch, 'flags'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<FlagsState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setUpdating = useMemo(() => makeSetter<FlagsState, 'updating'>(dispatch, 'updating'), [dispatch]);
  const setInitialLoadDone = useMemo(() => makeSetter<FlagsState, 'initialLoadDone'>(dispatch, 'initialLoadDone'), [dispatch]);
  const setUseApi = useMemo(() => makeSetter<FlagsState, 'useApi'>(dispatch, 'useApi'), [dispatch]);
  const setApiError = useMemo(() => makeSetter<FlagsState, 'apiError'>(dispatch, 'apiError'), [dispatch]);
  const setSeedMessage = useMemo(() => makeSetter<FlagsState, 'seedMessage'>(dispatch, 'seedMessage'), [dispatch]);
  const setAutoSeeded = useMemo(() => makeSetter<FlagsState, 'autoSeeded'>(dispatch, 'autoSeeded'), [dispatch]);
  const setFilterType = useMemo(() => makeSetter<FlagsState, 'filterType'>(dispatch, 'filterType'), [dispatch]);
  const setFilterSubtype = useMemo(() => makeSetter<FlagsState, 'filterSubtype'>(dispatch, 'filterSubtype'), [dispatch]);
  const setFilterStyle = useMemo(() => makeSetter<FlagsState, 'filterStyle'>(dispatch, 'filterStyle'), [dispatch]);
  const setSelectedIds = useMemo(() => makeSetter<FlagsState, 'selectedIds'>(dispatch, 'selectedIds'), [dispatch]);
  const setBulkUpdating = useMemo(() => makeSetter<FlagsState, 'bulkUpdating'>(dispatch, 'bulkUpdating'), [dispatch]);
  const setSyncing = useMemo(() => makeSetter<FlagsState, 'syncing'>(dispatch, 'syncing'), [dispatch]);

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const isSuperadmin = Boolean(user?.is_superuser) || String(user?.role || '').toLowerCase() === 'superadmin';

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
      navigate(`${routes.orgDetailLegacy({ orgId: orgSlug })}?tab=settings`);
    } else {
      setApiError('Feature flags management requires superadmin access. Please contact your administrator.');
      setLoading(false);
    }
  }, [context.isLoading, currentOrgId, isSuperadmin, organisations, navigate, user]);

  // Reload flags when context changes (GLOBAL-only, no org context)
  useEffect(() => {
    if (!isSuperadmin || !s.initialLoadDone) return;

    const loadFlags = async () => {
      if (s.useApi) {
        try {
          setApiError(null);
          setLoading(true);
          debugLog('[FeatureFlagsPage] Fetching GLOBAL flags from API');
          let apiFlags = await fetchFlagsForScope('GLOBAL');
          const normalized = apiFlags.map((flag: ApiFeatureFlag) => ({
            ...flag,
            global_id: flag.global_id || flag.id,
          }));
          setFlags(normalized);

          // Auto-seed once if none found
          if (!s.autoSeeded && normalized.filter((flag) => String(flag.key || '').startsWith('content__')).length === 0) {
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
            const normalizedAfterSeed = apiFlags.map((flag: ApiFeatureFlag) => ({
              ...flag,
              global_id: flag.global_id || flag.id,
            }));
            setFlags(normalizedAfterSeed);
          }
        } catch (err: unknown) {
          logger.debug('Feature flags API failed, fallback may be used', err);
          const errMsg = err instanceof Error ? err.message : '';
          if (errMsg && (errMsg.includes('401') || errMsg.includes('403'))) {
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
  }, [s.useApi, isSuperadmin, s.initialLoadDone]);

  // ── Toggle single flag ──

  const handleToggleFlag = async (flag: FeatureFlag | ApiFeatureFlag) => {
    if (s.updating) {
      debugLog('[FeatureFlagsPage] Already updating, ignoring click');
      return;
    }

    const currentState = flag.enabled;
    const newState = !currentState;

    debugLog('[FeatureFlagsPage] handleToggleFlag called (GLOBAL mode):', {
      flagKey: flag.key,
      currentState,
      newState,
      useApi: s.useApi
    });

    if (s.useApi) {
      setUpdating(true);
      const apiFlag = flag as ApiFeatureFlag;
      try {
        const globalId = apiFlag.global_id || apiFlag.id;
        debugLog('[FeatureFlagsPage] API: Updating global flag:', globalId, newState);
        await updateGlobalFlag(String(globalId), newState);

        debugLog('[FeatureFlagsPage] Reloading GLOBAL flags after update');
        const apiFlags = await fetchFlagsForScope('GLOBAL');
        const normalized = apiFlags.map((f: ApiFeatureFlag) => ({
          ...f,
          global_id: f.global_id || f.id,
        }));
        debugLog('[FeatureFlagsPage] Reloaded flags:', normalized);
        setFlags(normalized);

        window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
        debugLog('[FeatureFlagsPage] Successfully updated flag and reloaded data');
      } catch (err) {
        logger.error('Failed to toggle flag via API', err);
        pushToast({ message: 'Failed to update flag. See console for details.', type: 'error' });
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

  const displayFlags = s.flags
    .filter((flag: any) => !isThemeFlagKey(flag.key))
    .filter((flag: any) => String(flag.key || '').startsWith('content__'))
    .filter((flag: any) => {
      const parts = String(flag.key || '').split('__');
      const type = parts[1] || '';
      const subtype = parts[2] || '';
      const styleIndex = parts.findIndex((p) => p === 'style');
      const style = styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
      if (s.filterType !== 'all' && type !== s.filterType) return false;
      if (s.filterSubtype !== 'all' && subtype !== s.filterSubtype) return false;
      if (s.filterStyle !== 'all' && style !== s.filterStyle) return false;
      return true;
    });

  const uniqueTypes: string[] = Array.from(new Set<string>(
    s.flags
      .filter((flag: any) => String(flag.key || '').startsWith('content__'))
      .map((flag: any) => String(flag.key || '').split('__')[1])
      .filter(Boolean) as string[]
  )).sort();

  const uniqueSubtypes: string[] = Array.from(new Set<string>(
    s.flags
      .filter((flag: any) => String(flag.key || '').startsWith('content__'))
      .map((flag: any) => String(flag.key || '').split('__')[2])
      .filter(Boolean) as string[]
  )).sort();

  const uniqueStyles: string[] = Array.from(new Set<string>(
    s.flags
      .filter((flag: any) => String(flag.key || '').startsWith('content__'))
      .map((flag: any) => {
        const parts = String(flag.key || '').split('__');
        const styleIndex = parts.findIndex((p) => p === 'style');
        return styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
      })
      .filter(Boolean) as string[]
  )).sort();

  // ── Selection helpers ──

  const allSelected = displayFlags.length > 0 && displayFlags.every((f: any) => s.selectedIds.has(f.id));
  const someSelected = s.selectedIds.size > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set<string>());
    } else {
      setSelectedIds(new Set<string>(displayFlags.map((f: any) => f.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set<string>(s.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // ── Bulk actions ──

  const handleBulkUpdate = async (enabled: boolean) => {
    if (s.selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const toUpdate = displayFlags.filter((f: any) => s.selectedIds.has(f.id));
      for (const flag of toUpdate) {
        await updateGlobalFlag(flag.id, enabled);
      }
      const apiFlags = await fetchFlagsForScope('GLOBAL');
      const normalized = apiFlags.map((f: ApiFeatureFlag) => ({
        ...f,
        global_id: f.global_id || f.id,
      }));
      setFlags(normalized);
      setSelectedIds(new Set<string>());
    } catch (err) {
      logger.error('Bulk update failed', err);
      pushToast({ message: 'Bulk update failed. Check console for details.', type: 'error' });
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
      const normalized = apiFlags.map((f: ApiFeatureFlag) => ({
        ...f,
        global_id: f.global_id || f.id,
      }));
      setFlags(normalized);
    } catch (err) {
      logger.error('Sync failed', err);
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
    setSelectedIds(new Set<string>());
  };

  return {
    loading: s.loading,
    seedMessage: s.seedMessage,
    apiError: s.apiError,
    useApi: s.useApi,
    displayFlags,
    uniqueTypes,
    uniqueSubtypes,
    uniqueStyles,
    filterType: s.filterType, setFilterType,
    filterSubtype: s.filterSubtype, setFilterSubtype,
    filterStyle: s.filterStyle, setFilterStyle,
    selectedIds: s.selectedIds,
    allSelected,
    someSelected,
    bulkUpdating: s.bulkUpdating,
    syncing: s.syncing,
    handleSelectAll,
    handleSelectOne,
    handleBulkUpdate,
    handleSyncFlags,
    handleToggleFlag,
    handleClearFilters,
  };
}
