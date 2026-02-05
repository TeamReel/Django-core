import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
  Button,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { useNavigate } from 'react-router-dom';
import {
  fetchFlagsForScope,
  updateGlobalFlag,
  seedDefaultFlags,
  syncFlags,
  type ApiFeatureFlag
} from '../../utils/featureFlagsApi';
import {
  getAllFlagsWithResolution,
  setGlobalFlag,
  type FeatureFlag,
} from '../../utils/featureFlagStorage';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  actionButtonStyle,
} from '../../utils/directoryStyles';

/**
 * T013 - Feature Flags Page (GLOBAL Management)
 *
 * Purpose: GLOBAL feature flags management for superadmins only
 * - Superadmin: Manages global defaults (master switches for the app)
 * - Org Admin: Redirected to organisation Settings page
 * - For org/project overrides, use the Settings tab on detail pages
 * - Resolution hierarchy: Global (disabled) > Org override > Project override
 */

export const FeatureFlagsPage: React.FC = () => {
  const navigate = useNavigate();
  const { context, organisations } = useContextSwitcher();
  const { user } = useAuth();
  const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  };
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

  // This page is GLOBAL-only
  const editMode = 'global';

  // Derived state from context switcher
  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;

  const isThemeFlagKey = (key: string): boolean => {
    const normalized = String(key || '').toLowerCase();
    return normalized.includes('dark_mode') || normalized.includes('dark_theme');
  };

  // Use useAuth for superadmin check (most reliable source)
  const isSuperadmin = Boolean((user as any)?.is_superuser) || String((user as any)?.role || '').toLowerCase() === 'superadmin';


  // Breadcrumb context switcher setup
  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  // Custom handler to switch organisation without page reload
  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    debugLog('[FeatureFlagsPage] Switching to org:', option.label, option.id);

    // SIMPLIFIED APPROACH FOR NON-ORG-SCOPED ROUTES:
    // The Feature Flags page is at /config/feature-flags (not org-scoped in the URL)
    // So switchContext won't navigate. Instead, we directly update localStorage and reload.
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    window.location.reload();
  };

  // Redirect non-superadmins to their org settings page
  useEffect(() => {
    if (context.isLoading) return;

    console.log('[FeatureFlagsPage] Redirect check:', {
      isSuperadmin,
      currentOrgId,
      userRole: (user as any)?.role,
      isSuper: (user as any)?.is_superuser
    });

    // Superadmins: allow access to global flags page
    if (isSuperadmin) {
      setInitialLoadDone(true);
      setLoading(false);
      return;
    }

    // Non-superadmins: redirect to org settings
    if (currentOrgId) {
      const orgSlug = organisations.find(o => String(o.id) === currentOrgId)?.slug || currentOrgId;
      console.log('[FeatureFlagsPage] Redirecting non-superadmin to org settings:', orgSlug);
      navigate(`/organisations/${orgSlug}?tab=settings`);
    } else {
      // No org selected - show access denied message
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
          // GLOBAL mode only - no org context
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
        } catch (err: any) {
          console.warn('API failed:', err);

          // Strict requirement: No fallback for Auth errors (401/403)
          if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
            setApiError('Permission denied. Please ensure you are logged in with the correct permissions.');
            setFlags([]); // Clear flags
            return;
          }

          // Only fallback if 404 (endpoint missing) or other network errors
          debugLog('Falling back to local storage due to non-auth error');
          setUseApi(false);
          const resolvedFlags = getAllFlagsWithResolution(null);
          setFlags(resolvedFlags);
        } finally {
          setLoading(false);
        }
      } else {
        // In demo mode (localStorage), fetch global flags
        const resolvedFlags = getAllFlagsWithResolution(null);
        debugLog('[FeatureFlagsPage] Loaded GLOBAL flags from storage. Count:', resolvedFlags.length);
        setFlags(resolvedFlags);
        setLoading(false);
      }
    };

    loadFlags();

    // Listen for storage changes (cross-tab or same-tab via custom event)
    const handleStorageChange = (e: Event) => {
      debugLog('[FeatureFlagsPage] Storage event received:', e.type);
      // Use setTimeout to ensure state is updated after storage write completes
      setTimeout(() => {
        loadFlags();
      }, 0);
    };

    window.addEventListener('featureFlagsChanged', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('featureFlagsChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [useApi, isSuperadmin, initialLoadDone]);

  // Toggle flag (GLOBAL-only for superadmins)
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
        // Superadmin toggles global default
        const globalId = apiFlag.global_id || (apiFlag as any).id;
        debugLog('[FeatureFlagsPage] API: Updating global flag:', globalId, newState);
        await updateGlobalFlag(String(globalId), newState);

        // Reload flags to reflect changes
        debugLog('[FeatureFlagsPage] Reloading GLOBAL flags after update');
        const apiFlags = await fetchFlagsForScope('GLOBAL');
        const normalized = apiFlags.map((flag: any) => ({
          ...flag,
          global_id: flag.global_id || flag.id,
        }));
        debugLog('[FeatureFlagsPage] Reloaded flags:', normalized);
        setFlags(normalized);

        // Trigger featureFlagsChanged event so other components (like theme toggle) can react
        window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
        debugLog('[FeatureFlagsPage] Successfully updated flag and reloaded data');
      } catch (err) {
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

    // Notify other tabs/components
    window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Feature Flags"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Feature Flags' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading feature flags...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

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

  // Extract unique values for filter dropdowns
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

  const [syncing, setSyncing] = useState(false);

  // Multi-select helpers
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

  const handleBulkUpdate = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const toUpdate = displayFlags.filter((f) => selectedIds.has(f.id));
      for (const flag of toUpdate) {
        await updateGlobalFlag(flag.id, enabled);
      }
      // Reload flags
      const apiFlags = await fetchFlagsForScope('GLOBAL');
      const normalized = apiFlags.map((flag: any) => ({
        ...flag,
        global_id: flag.global_id || flag.id,
      }));
      setFlags(normalized);
      setSelectedIds(new Set());
    } catch (err) {
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
      // Reload flags
      const apiFlags = await fetchFlagsForScope('GLOBAL');
      const normalized = apiFlags.map((flag: any) => ({
        ...flag,
        global_id: flag.global_id || flag.id,
      }));
      setFlags(normalized);
    } catch (err) {
      console.error('Sync failed:', err);
      setSeedMessage('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Feature Flags - Global Management"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Feature Flags' },
          { label: 'Global Defaults' }
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Admin badge */}
            <div style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: 600,
              letterSpacing: '0.5px',
              cursor: 'default',
            }}>
              👑 SUPERADMIN
            </div>
          </div>
        }
      />

      <PageContent>
        {seedMessage && (
          <Alert variant="info" className="mb-4">
            {seedMessage}
          </Alert>
        )}

        {/* Info Alert */}
        <Alert variant="info" className="mb-4">
          <strong>Global Feature Flags:</strong> These are master switches for the entire application.
          When a global flag is <strong>disabled</strong>, it overrides all organisation and project settings.
          Organisations can create more restrictive overrides (disable when global is enabled) but cannot enable when global is disabled.
          <br /><br />
          To manage organisation-specific overrides, go to <strong>Organisation → Settings tab</strong>.
        </Alert>

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
        }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            <option value="all">Type: All</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterSubtype}
            onChange={(e) => setFilterSubtype(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            <option value="all">Subtype: All</option>
            {uniqueSubtypes.map((subtype) => (
              <option key={subtype} value={subtype}>{subtype}</option>
            ))}
          </select>
          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            <option value="all">Style: All</option>
            {uniqueStyles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {someSelected && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="primary"
                  size="md"
                  disabled={bulkUpdating}
                  onClick={() => handleBulkUpdate(true)}
                >
                  {bulkUpdating ? '...' : 'Enable Selected'}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  disabled={bulkUpdating}
                  onClick={() => handleBulkUpdate(false)}
                >
                  {bulkUpdating ? '...' : 'Disable Selected'}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setFilterType('all');
                setFilterSubtype('all');
                setFilterStyle('all');
                setSelectedIds(new Set());
              }}
            >
              Clear
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={syncing}
              onClick={handleSyncFlags}
            >
              {syncing ? 'Syncing...' : '🔄 Sync Templates'}
            </Button>
          </div>
        </div>

        {/* Flags Table */}
        <Card>
          {apiError ? (
            <div className="p-8 text-center">
              <div className="text-red-500 font-medium mb-2">Access Denied</div>
              <div className="text-gray-500 mb-4">{apiError}</div>
              <Button variant="primary" onClick={() => window.location.href = '/admin/login/?next=/config/feature-flags'}>
                Log in to Backend
              </Button>
              <div className="mt-4 text-xs text-gray-400">
                (Demo Shell requires a valid backend session for this page)
              </div>
            </div>
          ) : displayFlags.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {useApi ? (
                <p>No feature flags found in the database.</p>
              ) : (
                'No feature flags available. Check console for errors.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...compactThStyle, width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Type</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Subtype</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Style</th>
                    <th style={{ ...compactThStyle, width: '30%' }}>Description</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Global</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFlags.map((flag) => {
                    const parts = String(flag.key || '').split('__');
                    const type = parts[1] || '';
                    const subtype = parts[2] || '';
                    const styleIndex = parts.findIndex((p) => p === 'style');
                    const style = styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
                    const displayEnabled = flag.enabled;
                    const isSelected = selectedIds.has(flag.id);

                    return (
                      <tr key={flag.id}>
                        <td style={compactTdStyle}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(flag.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={compactTdStyle}>{type || '—'}</td>
                        <td style={compactTdStyle}>{subtype || '—'}</td>
                        <td style={compactTdStyle}>{style || '—'}</td>
                        <td style={{ ...compactTdStyle, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {flag.description || '—'}
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant={displayEnabled ? 'success' : 'default'} style={{ fontSize: '11px', padding: '2px 6px' }}>
                            {displayEnabled ? 'On' : 'Off'}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <button
                            style={actionButtonStyle(displayEnabled ? 'neutral' : 'primary')}
                            title={displayEnabled ? 'Disable globally' : 'Enable globally'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleFlag(flag);
                            }}
                          >
                            {displayEnabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Info Footer */}
        <Alert variant="info" className="mt-4">
          <strong>Hierarchy Rules:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li><strong>Global Setting (Master Switch)</strong>: When disabled, it overrides all organisation and project settings system-wide.</li>
            <li><strong>Organisation Overrides</strong>: Can be more restrictive (disable when global is enabled) but cannot be more permissive (enable when global is disabled).</li>
            <li><strong>Project Overrides</strong>: Follow the same rules relative to their organisation setting.</li>
            <li>To manage overrides, navigate to the <strong>Settings tab</strong> on Organisation or Club detail pages.</li>
          </ul>
        </Alert>
      </PageContent>
    </>
  );
};
