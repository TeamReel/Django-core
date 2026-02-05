import { useState, useEffect } from 'react';
import { getResolvedFlag } from '../utils/featureFlagStorage';
import { fetchFlags } from '../utils/featureFlagsApi';
import { getActiveContext } from '../utils/activeContext';
import { useAuth } from '@django-core/auth-ui';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

/**
 * useFeatureFlag hook - checks if a feature flag is enabled
 *
 * Uses tenant-aware flag resolution:
 * Priority: Org override > Global > Default
 *
 * Automatically uses current organisation context from localStorage
 * Tries API first, falls back to localStorage
 *
 * Re-checks flags when user logs in/out
 */
export function useFeatureFlag(flagKey: string, defaultEnabled: boolean = true): boolean {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultEnabled);

  const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizeFlagValue = (value: unknown): boolean | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowered = value.trim().toLowerCase();
      if (lowered === 'true') return true;
      if (lowered === 'false') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return null;
  };

  const resolveFlagMatch = (flags: any[], key: string) => {
    const direct = flags.find((f) => f.key === key);
    if (direct) return direct;

    const normalizedTarget = normalizeKey(key);
    const normalizedMatch = flags.find((f) => normalizeKey(String(f.key || '')) === normalizedTarget);
    if (normalizedMatch) return normalizedMatch;

    // Alias support for historical dark theme keys
    const aliases = new Map<string, string[]>([
      ['dark_theme_override', ['dark_themeoverride', 'darkthemeoverride', 'dark_theme', 'darktheme', 'dark_mode', 'darkmode']]
    ]);

    for (const [canonical, aliasList] of aliases.entries()) {
      if (normalizedTarget === normalizeKey(canonical) || aliasList.includes(normalizedTarget)) {
        return flags.find((f) => aliasList.includes(normalizeKey(String(f.key || ''))) || normalizeKey(String(f.key || '')) === normalizeKey(canonical));
      }
    }

    return undefined;
  };

  useEffect(() => {
    const checkFlag = async () => {
      try {
        // Detect if user is a superadmin
        // Priority: Backend API > useAuth user object > localStorage demo_user_role > demo email check
        let isSuperadmin = false;

        // NOTE: We intentionally avoid an extra /auth/me call here.
        // The auth package already loads the current user; duplicating this network request
        // on every page/view hurts performance.

        // Check useAuth user object
        if (!isSuperadmin && user && ((user as any).is_superuser || (user as any).role === 'superadmin')) {
          isSuperadmin = true;
          if (DEBUG_LOGS) console.log(`[useFeatureFlag] useAuth check: isSuperadmin=${isSuperadmin}`);
        }

        // DEMO MODE FALLBACK: check localStorage
        // CRITICAL FIX: Only trust localStorage if we are NOT logged in via backend
        // If backend check succeeded (userResponse.ok), we already know the truth.
        // If backend check failed, THEN we check localStorage.
        // But here, we are checking localStorage even if backend said "false".
        // We must ensure we don't accidentally promote a regular user to superadmin via stale localStorage.

        // If we successfully checked backend, DO NOT check localStorage for role
        // The backend is the source of truth.

        // However, the code above sets isSuperadmin=true if backend says so.
        // If backend says false, isSuperadmin is false.
        // We should only check localStorage if we didn't get a definitive answer from backend/user object.

        // Simplified logic:
        // 1. Backend API (definitive)
        // 2. useAuth user object (definitive if present)
        // 3. localStorage (ONLY if no user is logged in or backend unreachable)

        // We can detect if we are "logged in" via the user object from useAuth
        const isLoggedIn = !!user;

        if (!isSuperadmin && !isLoggedIn) {
          const demoRole = localStorage.getItem('demo_user_role');
          if (demoRole === 'superadmin') {
            isSuperadmin = true;
            if (DEBUG_LOGS) console.log(`[useFeatureFlag] Demo mode: found superadmin in localStorage`);
          }
        }

        // DEMO MODE: Check by email (admin@example.com = superadmin)
        if (!isSuperadmin && user?.email) {
          if (user.email === 'admin@example.com') {
            isSuperadmin = true;
            if (DEBUG_LOGS) {
              console.log(`[useFeatureFlag] Demo mode: detected superadmin by email (${user.email})`);
            }
          }
        }

        // Get current organisation/project context from localStorage
        // ContextSwitcher uses 'django-core:currentOrgId' and 'django-core:currentProjectId'
        let orgId: string | null = null;
        let projectId: string | null = null;

        // Try django-core keys first (used by ContextSwitcher)
        orgId = localStorage.getItem('django-core:currentOrgId');
        projectId = localStorage.getItem('django-core:currentProjectId');

        // Fallback to demo_context if available
        if (!orgId) {
          const contextStr = localStorage.getItem('demo_context');
          if (contextStr) {
            try {
              const context = JSON.parse(contextStr);
              orgId = context.organisationId || null;
              projectId = context.projectId || null;
            } catch (e) {
              if (DEBUG_LOGS) console.debug('[useFeatureFlag] Failed to parse demo_context:', e);
            }
          }
        }

        // If Superadmin, they MIGHT want to see org-specific flags if they have selected an org context.
        // But for "dark_mode", usually we want the org setting if an org is selected.
        // The previous logic forced orgId=null for superadmins, which means they always saw global defaults.
        // This is wrong if the superadmin has switched context to an org.

        // However, the requirement says: "Superadmin: Manages global defaults".
        // But for *consuming* flags (like dark mode), they should see what the current context dictates.

        // If isSuperadmin is true, we still respect the orgId if it exists.
        // The only time we force global is if we are in a "Global Config" mode, but this hook is for *consuming* flags.

        if (DEBUG_LOGS) {
          console.log(
            `[useFeatureFlag] Checking flag "${flagKey}" for orgId/projectId:`,
            orgId,
            projectId,
            'isSuperadmin:',
            isSuperadmin
          );
        }

        // If no org/project in localStorage, attempt to read active context from backend
        if (!orgId || !projectId) {
          try {
            const activeContext = await getActiveContext();
            const contextOrgId = activeContext?.organisation?.id || activeContext?.org?.id || null;
            const contextProjectId = activeContext?.project?.id || activeContext?.club?.id || null;
            if (!orgId && contextOrgId) orgId = String(contextOrgId);
            if (!projectId && contextProjectId) projectId = String(contextProjectId);
            if (DEBUG_LOGS) {
              console.log('[useFeatureFlag] Active context fallback:', {
                contextOrgId: orgId,
                contextProjectId: projectId,
              });
            }
          } catch (contextErr) {
            if (DEBUG_LOGS) console.debug('[useFeatureFlag] Active context fetch failed:', contextErr);
          }
        }

        // Try to fetch from API first
        try {
          const apiFlags = await fetchFlags(orgId, projectId);
          const flag = resolveFlagMatch(apiFlags, flagKey);
          if (DEBUG_LOGS) console.log(`[useFeatureFlag] API result for "${flagKey}":`, flag);
          if (flag !== undefined) {
            if (DEBUG_LOGS) {
              console.log(`[useFeatureFlag] Setting "${flagKey}" enabled to:`, flag.enabled);
            }
            const normalizedEnabled = normalizeFlagValue(flag.enabled);
            setIsEnabled(normalizedEnabled ?? defaultEnabled);
            return;
          }
        } catch (apiErr) {
          // API failed, fall back to localStorage
          if (DEBUG_LOGS) {
            console.debug(`[useFeatureFlag] API fetch failed for "${flagKey}", using localStorage:`, apiErr);
          }
        }

        // Fallback: Resolve flag from localStorage
        const resolved = getResolvedFlag(flagKey, orgId, defaultEnabled);
        if (DEBUG_LOGS) console.log(`[useFeatureFlag] localStorage result for "${flagKey}":`, resolved);
        setIsEnabled(resolved);
      } catch (err) {
        if (DEBUG_LOGS) console.error(`[useFeatureFlag] Error resolving feature flag "${flagKey}":`, err);
        setIsEnabled(defaultEnabled);
      }
    };

    // Check on mount
    checkFlag();

    // Listen for flag changes
    const handleFlagChange = () => checkFlag();
    window.addEventListener('featureFlagsChanged', handleFlagChange);

    // Listen for context changes (org switching)
    const handleContextChange = () => checkFlag();
    window.addEventListener('contextChanged', handleContextChange);

    return () => {
      window.removeEventListener('featureFlagsChanged', handleFlagChange);
      window.removeEventListener('contextChanged', handleContextChange);
    };
  }, [flagKey, defaultEnabled, user]); // Added user dependency

  return isEnabled;
}
