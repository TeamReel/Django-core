import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  Card,
  Badge,
  Alert,
  Table,
  Button,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { ContextSwitcher, useContextSwitcher } from '@django-core/context-switcher';
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
  const { context, switchContext } = useContextSwitcher();
  const [flags, setFlags] = useState<(FeatureFlag | ApiFeatureFlag)[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [editMode, setEditMode] = useState<'global' | 'org'>('global');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [useApi, setUseApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Derived state from context switcher
  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  // Load user info
  useEffect(() => {
    // Wait for context to be loaded before making decisions
    if (context.isLoading) return;

    const loadUser = async () => {
      try {
        setLoading(true);

        // Try to fetch current user from backend
        let userIsSuperadmin = false;
        try {
          const userResponse = await fetch('/api/v1/auth/me/', {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserRole(userData.role);
            userIsSuperadmin = userData.is_superuser || userData.role === 'superadmin';
            setIsSuperadmin(userIsSuperadmin);
          }
        } catch (err) {
          console.warn('Backend not available, using demo mode for feature flags');
        }

        // DEMO MODE FALLBACK:
        // Check localStorage FIRST to see if role is already determined
        if (!userIsSuperadmin) {
          const demoRole = localStorage.getItem('demo_user_role');
          console.log('[FeatureFlags] Demo mode check - localStorage role:', demoRole, 'currentOrgId:', currentOrgId);

          if (demoRole === 'superadmin') {
            // User was previously marked as superadmin, keep that role
            console.log('Demo mode: Found superadmin in localStorage, preserving role');
            setIsSuperadmin(true);
            userIsSuperadmin = true;
          } else if (demoRole === 'org_admin') {
            // User was previously marked as org admin, keep that role
            console.log('Demo mode: Found org_admin in localStorage, preserving role');
            setIsSuperadmin(false);
          } else if (!initialLoadDone) {
            // First load - determine role based on org context
            if (currentOrgId) {
              // Has org context on first load → Org Admin (e.g., coming from Users page as Koeman)
              console.log('Demo mode: First load with org context, simulating Org Admin');
              setIsSuperadmin(false);
              localStorage.setItem('demo_user_role', 'org_admin');
            } else {
              // No org context on first load → Superadmin
              console.log('Demo mode: First load without org context, defaulting to Superadmin');
              setIsSuperadmin(true);
              userIsSuperadmin = true;
              localStorage.setItem('demo_user_role', 'superadmin');
            }
          }
        } else {
          // Backend confirmed superadmin, persist it
          console.log('Demo mode: Backend confirmed superadmin, persisting to localStorage');
          localStorage.setItem('demo_user_role', 'superadmin');
        }

        setInitialLoadDone(true);

        // Set initial edit mode - force org mode for non-superadmins
        if (!userIsSuperadmin) {
          setEditMode('org');
        } else if (currentOrgId) {
           // Superadmin with org context -> default to org mode? No, keep global as default for superadmin unless they switch?
           // Actually, let's keep superadmin as global default, but allow them to switch.
           // But for non-superadmin, MUST be org.
        }

      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [context.isLoading, currentOrgId]); // Re-run when context loading finishes or org changes

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
          const resolvedFlags = getAllFlagsWithResolution(currentOrgId);
          setFlags(resolvedFlags);
        }
      } else {
        const resolvedFlags = getAllFlagsWithResolution(currentOrgId);
        console.log('[FeatureFlagsPage] Loaded flags from storage for org:', currentOrgId, 'Count:', resolvedFlags.length);
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
  }, [isSuperadmin, currentOrgId]); // Added editMode to dependency to ensure refresh on mode switch

  // Toggle flag (tenant-aware)
  const handleToggleFlag = async (flag: FeatureFlag | ApiFeatureFlag) => {
    const currentState = flag.enabled;
    const newState = !currentState;

    console.log('[FeatureFlagsPage] handleToggleFlag called:', {
      flagKey: flag.key,
      currentState,
      newState,
      isSuperadmin,
      currentOrgId,
      userRole,
      editMode,
      useApi
    });

    if (useApi) {
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
        const apiFlags = await fetchFlags(targetOrgId);
        setFlags(apiFlags);

        // Trigger featureFlagsChanged event so other components (like theme toggle) can react
        window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
      } catch (err) {
        console.error('Failed to toggle flag via API:', err);
        alert('Failed to update flag. See console for details.');
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
    const resolvedFlags = getAllFlagsWithResolution(currentOrgId);
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
                      // Clear org context when switching to global to avoid confusion
                      if (currentOrgId) {
                        switchContext({ organisation: null, project: null });
                      }
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

            {/* Context Switcher - Only for Superadmin in Org Mode */}
            {isSuperadmin && editMode === 'org' && (
              <>
                <div style={{
                  height: '24px',
                  width: '1px',
                  backgroundColor: 'var(--app-border)',
                  opacity: 0.5,
                }} />
                <div style={{ minWidth: '200px' }}>
                  <ContextSwitcher />
                </div>
              </>
            )}

            {/* Superadmin: Clear Context button */}
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

            {/* Dev Tool: Role Toggler (Hidden from normal UI flow, for demo testing only) */}
            {isSuperadmin && (
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
            )}
          </div>
        }
      />

      <PageContent>
        {/* Context Info */}
        {!isSuperadmin && currentOrgName && (
          <Alert type="info" className="mb-4">
            <strong>Organisation Context:</strong> Managing flags for <strong>{currentOrgName}</strong>.
            You can enable/disable provisioned features for your users.
          </Alert>
        )}

        {isSuperadmin && editMode === 'org' && !currentOrgId && (
          <Alert type="info" className="mb-4">
            <strong>Select Organisation:</strong> Please select an organisation from the dropdown above to manage its overrides.
          </Alert>
        )}

        {isSuperadmin && editMode === 'global' && (
          <Alert type="info" className="mb-4">
            <strong>Global Defaults Mode:</strong> Changes affect all organisations without specific overrides.
          </Alert>
        )}

        {isSuperadmin && currentOrgId && editMode === 'org' && (
          <Alert type="warning" className="mb-4">
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
                            setLoading(true);
                            await seedDefaultFlags();
                            // Reload
                            const apiFlags = await fetchFlags(editMode === 'org' ? currentOrgId : null);
                            setFlags(apiFlags);
                            setLoading(false);
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
              {
                key: 'name',
                label: 'Flag',
                },
                {
                  key: 'scope',
                  label: 'Scope',
                },
                {
                  key: 'enabled',
                  label: 'Status',
                },
                {
                  key: 'rollout_percentage',
                  label: 'Rollout',
                },
                {
                  key: 'actions',
                  label: 'Actions',
                },
              ]}
              rows={flags.map((flag) => {
                // Determine if we have an override
                const resolutionSource = useApi
                  ? (flag as ApiFeatureFlag).resolutionSource
                  : (hasOrgOverride(currentOrgId, flag.key) ? 'override' : 'global');
                const isOverride = resolutionSource === 'override';
                const isOrgFlag = resolutionSource === 'organisation';

                const isOrgMode = isSuperadmin && currentOrgId && editMode === 'org';

                // Effective enabled state
                const displayEnabled = flag.enabled;

                // Disabled state (cannot edit)
                // Org Admin can always edit their own overrides in this model
                const isDisabled = !isSuperadmin && !currentOrgId;

                return {
                  id: flag.id,
                  name: (
                    <div>
                      <div className="font-medium">{flag.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{flag.description}</div>
                    </div>
                  ),
                  scope: isSuperadmin ? (
                    editMode === 'global' ? <Badge variant="default">Global</Badge> : <Badge variant="primary">Org Override</Badge>
                  ) : (isOverride || isOrgFlag) ? (
                    <Badge variant="primary">Organisation</Badge>
                  ) : (
                    <Badge variant="secondary">Global Default</Badge>
                  ),
                  enabled: (
                    <Badge variant={displayEnabled ? 'success' : 'secondary'}>
                      {displayEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ),
                  rollout_percentage: `${flag.rollout_percentage}%`,
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
                      {/* Visible for Org Admin if override exists */}
                      {/* Visible for Superadmin in Org Mode if override exists */}
                      {((!isSuperadmin && isOverride) || (isSuperadmin && editMode === 'org' && isOverride)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResetToGlobal(flag);
                          }}
                          title="Reset to global default"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  ),
                };
              })}
            />
          )}
        </Card>

        {/* Info Footer */}
        <Alert type="info" className="mt-4">
          <strong>How flags work:</strong>
          <ul className="mt-2 ml-4 list-disc">
            <li><strong>Global Defaults</strong>: Set the baseline for all organisations.</li>
            <li><strong>Organisation Overrides</strong>: Specific settings for an organisation that override the global default.</li>
            <li><strong>Superadmins</strong> can manage both global defaults and overrides for any organisation.</li>
            <li><strong>Org Admins</strong> can manage overrides for their own organisation.</li>
            <li>Changes are saved to the server and persist across sessions.</li>
          </ul>
        </Alert>
      </PageContent>
    </AppShell>
  );
};
