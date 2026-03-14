/**
 * SeasonProvider — shared context for the Season hierarchy pages.
 *
 * Provides org / club / project / season / competitions + brand profiles +
 * permissions so that SeasonDetailPage, CompetitionDetailPage,
 * MatchDetailPage and MemberDetailPage no longer duplicate ~150 lines of
 * identical fetch-and-resolve logic each.
 *
 * Usage:
 *   <SeasonProvider>
 *     <ProjectSeasonDetailPage />
 *   </SeasonProvider>
 *
 * Each page reads shared data via  `useSeasonContext()`.
 */

import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import { useSeasonData } from './useSeasonData';
import { type SeasonContextValue } from './seasonProviderHelpers';

// Re-export for backward compatibility
export { isSeasonPeriod } from './seasonProviderHelpers';
export type { BrandProfile, SeasonContextValue } from './seasonProviderHelpers';

// ── React Context ──────────────────────────────────────────────────────

const SeasonContext = createContext<SeasonContextValue | null>(null);

/**
 * Hook consumed by season-hierarchy pages.
 * Throws when used outside of `<SeasonProvider>`.
 */
export function useSeasonContext(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) {
    throw new Error(
      'useSeasonContext() must be used within a <SeasonProvider>. ' +
        'Wrap your page component with <SeasonProvider>…</SeasonProvider>.'
    );
  }
  return ctx;
}

// ── Provider component ─────────────────────────────────────────────────

export function SeasonProvider({ children }: PropsWithChildren) {
  const value = useSeasonData();
  return (
    <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
  );
}

export default SeasonProvider;
