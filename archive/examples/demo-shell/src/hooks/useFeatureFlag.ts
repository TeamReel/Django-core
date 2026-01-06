import { useState, useEffect } from 'react';
import { getResolvedFlag } from '../utils/featureFlagStorage';
import { fetchFlags } from '../utils/featureFlagsApi';
import { useAuth } from '@django-core/auth-ui';

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

  useEffect(() => {
    const checkFlag = async () => {
      try {
        // Detect if user is a superadmin
        // Priority: Backend API > useAuth user object > localStorage demo_user_role > demo email check
        let isSuperadmin = false;

        // Try to fetch current user from backend
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
            isSuperadmin = userData.is_superuser || userData.role === 'superadmin';
            console.log(`[useFeatureFlag] Backend check: isSuperadmin=${isSuperadmin}`);
          }
        } catch (err) {
          // Backend not available, fallback to demo mode
          console.debug('[useFeatureFlag] Backend not available, using demo mode');
        }

        // Check useAuth user object
        if (!isSuperadmin && user) {
          if ((user as any).is_superuser || (user as any).role === 'superadmin') {
            isSuperadmin = true;
            console.log(`[useFeatureFlag] useAuth check: isSuperadmin=${isSuperadmin}`);
          }
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
            console.log(`[useFeatureFlag] Demo mode: found superadmin in localStorage`);
          }
        }

        // DEMO MODE: Check by email (admin@example.com = superadmin)
        if (!isSuperadmin && user?.email) {
          if (user.email === 'admin@example.com') {
            isSuperadmin = true;
            console.log(`[useFeatureFlag] Demo mode: detected superadmin by email (${user.email})`);
          }
        }

        // Get current organisation context from localStorage
        // ContextSwitcher uses 'django-core:currentOrgId', not 'demo_context'
        let orgId: string | null = null;

        // Try django-core key first (used by ContextSwitcher)
        orgId = localStorage.getItem('django-core:currentOrgId');

        // Fallback to demo_context if available
        if (!orgId) {
          const contextStr = localStorage.getItem('demo_context');
          if (contextStr) {
            try {
              const context = JSON.parse(contextStr);
              orgId = context.organisationId || null;
            } catch (e) {
              console.debug('[useFeatureFlag] Failed to parse demo_context:', e);
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

        console.log(`[useFeatureFlag] Checking flag "${flagKey}" for orgId:`, orgId, 'isSuperadmin:', isSuperadmin);

        // Try to fetch from API first
        try {
          const apiFlags = await fetchFlags(orgId);
          const flag = apiFlags.find(f => f.key === flagKey);
          console.log(`[useFeatureFlag] API result for "${flagKey}":`, flag);
          if (flag !== undefined) {
            console.log(`[useFeatureFlag] Setting "${flagKey}" enabled to:`, flag.enabled);
            setIsEnabled(flag.enabled);
            return;
          }
        } catch (apiErr) {
          // API failed, fall back to localStorage
          console.debug(`[useFeatureFlag] API fetch failed for "${flagKey}", using localStorage:`, apiErr);
        }

        // Fallback: Resolve flag from localStorage
        const resolved = getResolvedFlag(flagKey, orgId, defaultEnabled);
        console.log(`[useFeatureFlag] localStorage result for "${flagKey}":`, resolved);
        setIsEnabled(resolved);
      } catch (err) {
        console.error(`[useFeatureFlag] Error resolving feature flag "${flagKey}":`, err);
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
