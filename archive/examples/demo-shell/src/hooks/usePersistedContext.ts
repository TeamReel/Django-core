import { useContextSwitcher as useContextSwitcherBase } from '@django-core/context-switcher';
import { useLocalStorage } from './useLocalStorage';

/**
 * Enhanced context switcher that persists selected context to localStorage
 */
export function usePersistedContext() {
  const baseContext = useContextSwitcherBase();
  const [persistedOrgId, setPersistedOrgId] = useLocalStorage<string | null>('demo_selected_org_id', null);

  // Get the actual selected org from baseContext
  const selectedOrgId = baseContext.context.organisation?.id?.toString() || persistedOrgId;

  return {
    ...baseContext,
    context: baseContext.context,
    // Store org ID in localStorage when it changes
    setSelectedOrgId: (orgId: string | null) => {
      setPersistedOrgId(orgId);
    },
    selectedOrgId,
  };
}
