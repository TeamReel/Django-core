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

        console.log(`[useFeatureFlag] Checking flag "${flagKey}" for orgId:`, orgId);

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
