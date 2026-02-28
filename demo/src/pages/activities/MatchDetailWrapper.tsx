import React from 'react';
import { SeasonProvider } from '../../providers/SeasonProvider';
import HierarchyMatchDetailPage from './MatchDetailPage';

/**
 * Thin wrapper that provides shared season-hierarchy context to the match page.
 * SeasonProvider handles org/project/club/season/competitions fetching;
 * MatchDetailPage only needs to fetch competition detail + match + opponent.
 */
export default function MatchDetailWrapper() {
  return (
    <SeasonProvider>
      <HierarchyMatchDetailPage />
    </SeasonProvider>
  );
}
