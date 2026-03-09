import { useContextSwitcher as useContextSwitcherBase, type ContextSwitcherContextValue } from '@django-core/context-switcher';
import { useLocalStorage } from './useLocalStorage';

/**
 * Enhanced context switcher that persists selected context to localStorage
 */
export interface UsePersistedContextReturn extends ContextSwitcherContextValue {
  setSelectedOrgId: (orgId: string | null) => void;
  selectedOrgId: string | null;
}

export function usePersistedContext(): UsePersistedContextReturn {
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
