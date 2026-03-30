import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
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
  fetchFlags,
  updateGlobalFlag,
  createOrgOverride,
  updateOrgOverride,
  deleteOrgOverride,
  seedDefaultFlags,
  type ApiFeatureFlag
} from '../../utils/featureFlagsApi';
import {
  getAllFlagsWithResolution,
  setGlobalFlag,
  setOrgFlag,
  setOrgProvisioning,
  removeOrgFlag,
  hasOrgOverride,
  type FeatureFlag,
} from '../../utils/featureFlagStorage';

/**
 * T013 - Feature Flags Page (Tenant-Aware)
 *
 * Purpose: Show tenant-scoped flags with toggles and rollout percentages
 * - Superadmin: Manages global defaults
 * - Org Admin: Manages org-specific overrides
 * - Shows scope badges (Global / Org Override)
 * - Resolution priority: Org override > Global > Default
 */

export const FeatureFlagsPage: React.FC = () => {
  const navigate = useNavigate();
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [flags, setFlags] = useState<(FeatureFlag | ApiFeatureFlag)[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState<'global' | 'org'>(
    () => (localStorage.getItem('feature-flags-edit-mode') as 'global' | 'org') || 'global'
  );
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [useApi, setUseApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Derived state from context switcher
  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  // Use useAuth for superadmin check (most reliable source)
  const isSuperadmin = (user as any)?.role === 'superadmin';

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
    console.log('[FeatureFlagsPage] Switching to org:', option.label, option.id);

    // SIMPLIFIED APPROACH FOR NON-ORG-SCOPED ROUTES:
    // The Feature Flags page is at /config/feature-flags (not org-scoped in the URL)
    // So switchContext won't navigate. Instead, we directly update localStorage and reload.
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    window.location.reload();
  };
  // Persist editMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('feature-flags-edit-mode', editMode);
  }, [editMode]);
  // Load user info
  useEffect(() => {
    // Wait for context to be loaded before making decisions
    if (context.isLoading) return;

    const loadUser = async () => {
      try {
        setLoading(true);

        // Set initial edit mode - force org mode for non-superadmins
        if (!isSuperadmin && currentOrgId) {
          setEditMode('org');
        }

        setInitialLoadDone(true);
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [context.isLoading, currentOrgId, isSuperadmin]);

  // Reload flags when org context changes (via ContextSwitcher)
  useEffect(() => {
    const loadFlags = async () => {
      if (useApi) {
        try {
          setApiError(null);
          // If in global mode, we don't pass orgId (unless we want to see overrides for a specific org while in global mode? No.)
          // If in org mode, we pass currentOrgId
          const targetOrgId = editMode === 'org' ? currentOrgId : null;

          // Safety check: Non-superadmins cannot fetch global flags
          if (!isSuperadmin && !targetOrgId) {
             console.log('[FeatureFlagsPage] Skipping fetch: Non-superadmin cannot fetch global flags');
             return;
          }

          // Skip fetch if in org mode but no org selected (avoids 403 on global fetch)
          if (editMode === 'org' && !targetOrgId) {
            console.log('[FeatureFlagsPage] Skipping fetch: Org mode but no org selected');
            return;
          }

          console.log('[FeatureFlagsPage] Fetching flags from API for org:', targetOrgId);
          const apiFlags = await fetchFlags(targetOrgId);
          setFlags(apiFlags);
        } catch (err: any) {
          console.warn('API failed:', err);

          // Strict requirement: No fallback for Auth errors (401/403)
          if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
            setApiError('Permission denied. Please ensure you are logged in with the correct permissions.');
            setFlags([]); // Clear flags
            return;
          }

          // Only fallback if 404 (endpoint missing) or other network errors
          console.log('Falling back to local storage due to non-auth error');
          setUseApi(false);
          const targetOrgId = editMode === 'org' ? currentOrgId : null;
          const resolvedFlags = getAllFlagsWithResolution(targetOrgId);
          setFlags(resolvedFlags);
        }
      } else {
        // In demo mode (localStorage), also respect editMode like API path does
        const targetOrgId = editMode === 'org' ? currentOrgId : null;

        // Safety check: Non-superadmins cannot fetch global flags
        if (!isSuperadmin && !targetOrgId) {
          console.log('[FeatureFlagsPage] Skipping storage fetch: Non-superadmin cannot fetch global flags');
          return;
        }

        const resolvedFlags = getAllFlagsWithResolution(targetOrgId);
        console.log('[FeatureFlagsPage] Loaded flags from storage for org:', targetOrgId, 'Count:', resolvedFlags.length);
        setFlags(resolvedFlags);
      }
    };

    loadFlags();

    // Listen for storage changes (cross-tab or same-tab via custom event)
    const handleStorageChange = (e: Event) => {
      console.log('[FeatureFlagsPage] Storage event received:', e.type);
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
  }, [currentOrgId, editMode, useApi, isSuperadmin]); // Added isSuperadmin

  // Separate effect for editMode to avoid re-registering event listeners
  useEffect(() => {
    // If not superadmin, ensure we are in org mode when org is present
    if (!isSuperadmin && currentOrgId) {
      setEditMode('org');
    }
    // REMOVED: The auto-switch to 'org' mode for Superadmins was preventing access to 'global' mode
    // because currentOrgId is often present in the background.
    // Superadmins should be able to stay in 'global' mode even if an org is selected.
  }, [isSuperadmin, currentOrgId]); // Removed editMode from dependency to avoid loops

  // Toggle flag (tenant-aware)
  const handleToggleFlag = async (flag: FeatureFlag | ApiFeatureFlag) => {
    if (updating) {
      console.log('[FeatureFlagsPage] Already updating, ignoring click');
      return;
    }

    const currentState = flag.enabled;
    const newState = !currentState;

    console.log('[FeatureFlagsPage] handleToggleFlag called:', {
      flagKey: flag.key,
      currentState,
      newState,
      isSuperadmin,
      currentOrgId,
      editMode,
      useApi
    });

    if (useApi) {
      setUpdating(true);
      const apiFlag = flag as ApiFeatureFlag;
      try {
        if (editMode === 'global') {
           // Superadmin toggles global default
           console.log('[FeatureFlagsPage] API: Updating global flag:', apiFlag.global_id, newState);
           await updateGlobalFlag(apiFlag.global_id, newState);
        } else if (currentOrgId) {
           // Org Override or standalone org flag
           if ((apiFlag.resolutionSource === 'override' || apiFlag.resolutionSource === 'organisation') && apiFlag.org_override_id) {
             console.log('[FeatureFlagsPage] API: Updating org flag:', apiFlag.org_override_id, newState);
             await updateOrgOverride(apiFlag.org_override_id, newState);
           } else {
             // Create new override
             console.log('[FeatureFlagsPage] API: Creating org override:', currentOrgId, apiFlag.key, newState);
             await createOrgOverride(currentOrgId, apiFlag.key, newState);
           }
        }

        // Reload flags to reflect changes
        const targetOrgId = editMode === 'org' ? currentOrgId : null;
        console.log('[FeatureFlagsPage] Reloading flags after update. editMode:', editMode, 'targetOrgId:', targetOrgId);
        const apiFlags = await fetchFlags(targetOrgId);
        console.log('[FeatureFlagsPage] Reloaded flags:', apiFlags);
        setFlags(apiFlags);

        // Trigger featureFlagsChanged event so other components (like theme toggle) can react
        window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
        console.log('[FeatureFlagsPage] Successfully updated flag and reloaded data');
      } catch (err) {
        console.error('Failed to toggle flag via API:', err);
        alert('Failed to update flag. See console for details.');
      } finally {
        setUpdating(false);
      }
      return;
    }

    // Fallback Logic (Storage)
    const isProvisioned = (flag as any).provisioned;
    if (isSuperadmin) {
      if (editMode === 'global') {
        // Superadmin toggles global default
        console.log('[FeatureFlagsPage] Setting global flag:', flag.key, newState);
        setGlobalFlag(flag.key, newState);
      } else if (currentOrgId) {
        // Superadmin toggles org provisioning
        // If we are in org mode, the toggle represents the PROVISIONING status
        // So we toggle the provisioned state, not the enabled state directly
        const newProvisionedState = !isProvisioned;
        console.log('[FeatureFlagsPage] Setting org provisioning (as superadmin):', currentOrgId, flag.key, newProvisionedState);
        setOrgProvisioning(currentOrgId, flag.key, newProvisionedState);
      }
    } else if (currentOrgId) {
      // Org Admin toggles org-specific override
      console.log('[FeatureFlagsPage] Setting org flag:', currentOrgId, flag.key, newState);
      setOrgFlag(currentOrgId, flag.key, newState);
    } else {
      console.warn('[FeatureFlagsPage] Cannot toggle flag: not superadmin and no currentOrgId');
    }

    // Note: Don't manually reload here - the event listener will handle it
    // This ensures all tabs update consistently
  };

  // Reset org override to global default
  const handleResetToGlobal = async (flag: FeatureFlag | ApiFeatureFlag) => {
    if (!currentOrgId) return;

    if (useApi) {
      const apiFlag = flag as ApiFeatureFlag;
      if (apiFlag.org_override_id) {
        try {
          console.log('[FeatureFlagsPage] API: Deleting org override:', apiFlag.org_override_id);
          await deleteOrgOverride(apiFlag.org_override_id);
          // Reload flags
          const targetOrgId = editMode === 'org' ? currentOrgId : null;
          const apiFlags = await fetchFlags(targetOrgId);
          setFlags(apiFlags);
        } catch (err) {
          console.error('Failed to reset flag via API:', err);
        }
      }
      return;
    }

    // Fallback Logic
    removeOrgFlag(currentOrgId, flag.key);

    // Reload flags to show updated state
    const targetOrgId = editMode === 'org' ? currentOrgId : null;
    const resolvedFlags = getAllFlagsWithResolution(targetOrgId);
    setFlags(resolvedFlags);
  };

  if (loading) {
    return (
      <AppShell>
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
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Feature Flags"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Feature Flags' },
          ...(isSuperadmin && editMode === 'global'
            ? [{ label: 'Global Defaults' }]
            : [{
                label: isSuperadmin ? (
                  <BreadcrumbContextSwitcher
                    currentId={currentOrgId || ''}
                    options={organisationOptions}
                    onSelect={handleOrganisationSwitch}
                    hasDropdown={true}
                    type="organisation"
                  />
                ) : (currentOrgName || 'Organisation')
              }]
          )
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Demo Helper: Show current mode */}
            <div style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: isSuperadmin ? '#3b82f6' : '#a855f7',
              color: 'white',
              fontWeight: 600,
              letterSpacing: '0.5px',
              cursor: 'default',
            }}>
              {isSuperadmin ? '👑 ADMIN' : '👤 ORG'}
            </div>

            {/* Scope Selector - Only for Superadmin */}
            {isSuperadmin && (
              <>
                <div style={{
                  height: '24px',
                  width: '1px',
                  backgroundColor: 'var(--app-border)',
                  opacity: 0.5,
                }} />
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--app-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--app-border)' }}>
                  <button
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: editMode === 'global' ? '#3b82f6' : 'transparent',
                      color: editMode === 'global' ? 'white' : 'var(--app-text)',
                    }}
                    onClick={() => {
                      setEditMode('global');
                      // Note: We don't clear the org context here because switchContext(null) is not supported.
                      // The page logic handles editMode='global' by ignoring the current org context.
                    }}
                  >
                    Global Defaults
                  </button>
                  <button
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: editMode === 'org' ? '#a855f7' : 'transparent',
                      color: editMode === 'org' ? 'white' : 'var(--app-text)',
                    }}
                    onClick={() => setEditMode('org')}
                  >
                    Organisation Overrides
                  </button>
                </div>
              </>
            )}

            {/* Superadmin: Clear Context button - Removed as switchContext(null) is not supported */}
            {/*
            {isSuperadmin && currentOrgId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchContext({ organisation: null, project: null })}
                title="Clear organisation context to manage global defaults"
              >
                ✕ Clear
              </Button>
            )}
            */}

            {/* Dev Tool: Role Toggler - REMOVED for manual validation to avoid confusion */}
            {/*
            <button
              onClick={() => {
                const newRole = !isSuperadmin;
                setIsSuperadmin(newRole);
                localStorage.setItem('demo_user_role', newRole ? 'superadmin' : 'org_admin');
                if (!newRole && currentOrgId) setEditMode('org');
              }}
              title="🛠️ Developer Tool: Toggle Role (Superadmin <-> Org Admin)"
              style={{
                background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.3,
                  fontSize: '14px',
                  padding: '4px',
                  marginLeft: '8px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
              >
                ⚙️
              </button>
            */}
          </div>
        }
      />

      <PageContent>
        {/* Context Info */}
        {!isSuperadmin && currentOrgName && (
          <Alert variant="info" className="mb-4">
            <strong>Organisation Context:</strong> Managing flags for <strong>{currentOrgName}</strong>.
            You can enable/disable provisioned features for your users.
          </Alert>
        )}

        {isSuperadmin && editMode === 'org' && !currentOrgId && (
          <Alert variant="info" className="mb-4">
            <strong>Select Organisation:</strong> Please select an organisation from the dropdown above to manage its overrides.
          </Alert>
        )}

        {isSuperadmin && editMode === 'global' && (
          <Alert variant="info" className="mb-4">
            <strong>Global Defaults Mode:</strong> Changes affect all organisations without specific overrides.
          </Alert>
        )}

        {isSuperadmin && currentOrgId && editMode === 'org' && (
          <Alert variant="warning" className="mb-4">
            <strong>Organisation Overrides Mode:</strong> Managing overrides for <strong>{currentOrgName}</strong>.
            Use "Provision" to enable availability, then "Enable" to set the default state for this org.
          </Alert>
        )}

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
          ) : flags.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {useApi ? (
                <div className="flex flex-col items-center gap-4">
                  {!isSuperadmin && !currentOrgId ? (
                    <div className="text-amber-600">
                      <p className="font-medium">No Organisation Selected</p>
                      <p className="text-sm mt-1">Please select an organisation from the top bar to view feature flags.</p>
                    </div>
                  ) : (
                    <>
                      <p>No feature flags found in the database.</p>
                      <div className="text-xs text-gray-400 mt-2">
                        Debug: Org={currentOrgId || 'null'}, Role={isSuperadmin ? 'Superadmin' : 'OrgAdmin'}, Mode={editMode}
                      </div>
                      {isSuperadmin && (
                        <Button
                          variant="primary"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              await seedDefaultFlags();
                              // Reload
                              const apiFlags = await fetchFlags(editMode === 'org' ? currentOrgId : null);
                              setFlags(apiFlags);
                            } catch (err) {
                              console.error('Failed to seed flags:', err);
                              setApiError('Failed to seed flags. Check console for details.');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Seed Default Flags
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                'No feature flags available. Check console for errors.'
              )}
            </div>
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Feature Flag' },
                ...(editMode === 'org' ? [
                  { key: 'global_setting', label: 'Global Setting' },
                  { key: 'org_setting', label: 'Organisation Setting' },
                  { key: 'effective_value', label: 'Effective Value' },
                ] : [
                  { key: 'enabled', label: 'Setting' },
                ]),
                { key: 'rollout_percentage', label: 'Rollout %' },
                { key: 'actions', label: 'Actions' },
              ]}
              rows={flags.map((flag) => {
                // Determine if we have an override
                const resolutionSource = useApi
                  ? (flag as ApiFeatureFlag).resolutionSource
                  : (hasOrgOverride(currentOrgId, flag.key) ? 'override' : 'global');
                const isOverride = resolutionSource === 'override' || resolutionSource === 'global_disabled';
                const isOrgFlag = resolutionSource === 'organisation';
                const isGlobalDisabled = resolutionSource === 'global_disabled';

                // Get raw values from API
                const apiFlag = flag as ApiFeatureFlag;
                const globalValue = apiFlag.global_value;
                const orgValue = apiFlag.org_value;

                // Effective enabled state
                const displayEnabled = flag.enabled;

                // Disabled state (cannot edit)
                const isDisabled = !isSuperadmin && !currentOrgId;

                // Global Setting Column
                let globalSettingNode: React.ReactNode = <span className="text-gray-400">-</span>;
                if (editMode === 'org' && globalValue !== null && globalValue !== undefined) {
                  globalSettingNode = (
                    <Badge variant={globalValue ? 'success' : 'default'}>
                      {globalValue ? 'Enabled' : 'Disabled'}
                    </Badge>
                  );
                }

                // Organisation Setting Column - show the stored value even if overridden by global
                let orgSettingNode: React.ReactNode = <span className="text-gray-400">-</span>;
                if (editMode === 'org') {
                  if (orgValue !== null && orgValue !== undefined) {
                    orgSettingNode = (
                      <Badge variant={orgValue ? 'success' : 'default'}>
                        {orgValue ? 'Enabled' : 'Disabled'}
                      </Badge>
                    );
                  } else {
                    orgSettingNode = (
                      <span className="text-gray-500 dark:text-gray-400 text-sm italic">
                        Inherited from global
                      </span>
                    );
                  }
                }

                // Effective Value Column - shows what's actually active
                let effectiveValueNode: React.ReactNode = null;
                if (editMode === 'org') {
                  if (isGlobalDisabled && orgValue === true) {
                    // Global disabled overrides org enabled
                    effectiveValueNode = (
                      <div>
                        <Badge variant="default">Disabled</Badge>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Overridden by global setting</span>
                        </div>
                      </div>
                    );
                  } else {
                    // Normal case
                    effectiveValueNode = (
                      <Badge variant={displayEnabled ? 'success' : 'default'}>
                        {displayEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    );
                  }
                }

                const rowData: any = {
                  id: flag.id,
                  name: (
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{flag.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{flag.description}</div>
                    </div>
                  ),
                  rollout_percentage: (
                    <span className="text-gray-700 dark:text-gray-300">
                      {flag.rollout_percentage}%
                    </span>
                  ),
                  actions: (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="sm"
                        variant={displayEnabled ? 'outline' : 'primary'}
                        disabled={isDisabled}
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFlag(flag);
                        }}
                      >
                        {displayEnabled ? 'Disable' : 'Enable'}
                      </Button>

                      {/* Reset to global button */}
                      {((!isSuperadmin && isOverride) || (isSuperadmin && editMode === 'org' && isOverride)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResetToGlobal(flag);
                          }}
                          title="Revert to global default"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  ),
                };

                // Add mode-specific columns
                if (editMode === 'org') {
                  rowData.global_setting = globalSettingNode;
                  rowData.org_setting = orgSettingNode;
                  rowData.effective_value = effectiveValueNode;
                } else {
                  rowData.enabled = (
                    <Badge variant={displayEnabled ? 'success' : 'default'}>
                      {displayEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  );
                }

                return rowData;
              })}
            />
          )}
        </Card>

        {/* Info Footer */}
        {editMode === 'org' ? (
          <Alert variant="info" className="mt-4">
            <strong>Organisation Feature Flags:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li><strong>Global Setting</strong>: The baseline value set by administrators for all organisations.</li>
              <li><strong>Organisation Setting</strong>: Your organisation's override (if configured).</li>
              <li><strong>Effective Value</strong>: The actual active setting for your organisation.</li>
              <li className="text-amber-700 dark:text-amber-400">
                ⚠️ <strong>Master Switch</strong>: When a global setting is disabled, it overrides all organisation settings but preserves your overrides for when it's re-enabled.
              </li>
            </ul>
          </Alert>
        ) : (
          <Alert variant="info" className="mt-4">
            <strong>Global Feature Flags:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li><strong>Setting</strong>: The baseline value that applies to all organisations by default.</li>
              <li><strong>Disabled global flags</strong> act as a master switch - they override all organisation settings system-wide.</li>
              <li>Organisations can create more restrictive overrides (disable when global is enabled) but cannot enable when global is disabled.</li>
            </ul>
          </Alert>
        )}
      </PageContent>
    </AppShell>
  );
};
