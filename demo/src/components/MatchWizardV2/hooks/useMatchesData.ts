/**
 * useMatchesData – Hook for fetching and managing match selection
 */
import { useEffect } from 'react';
import { useActivities, type Activity } from '../../../hooks/useActivities';
import { useMatchWizard } from '../MatchWizardContext';
import { api } from '@/api';
import { logger } from '@/utils/logger';

export function useMatchesData(isOpen: boolean, initialMatchId?: string): void {
  const { activities, loading, error } = useActivities({ limit: 10 });
  const {
    setSelectedMatch,
    setMatchesLoading,
    setMatchesError,
    setUpcomingMatches,
    selectedMatch,
  } = useMatchWizard();

  // Filter to upcoming matches
  useEffect(() => {
    const upcoming = activities.filter(a => {
      const isMatch = a.activity_type.toLowerCase().includes('match');
      return isMatch && new Date(a.start_time) > new Date();
    });
    setUpcomingMatches(upcoming);
    setMatchesLoading(loading);
    setMatchesError(error ? 'Kon wedstrijden niet laden. Controleer je verbinding.' : null);
  }, [activities, loading, error, setUpcomingMatches, setMatchesLoading, setMatchesError]);

  // Auto-select match when initialMatchId provided or select first upcoming
  useEffect(() => {
    if (!isOpen || selectedMatch) return;

    if (initialMatchId) {
      const m = activities.find(a => a.id === initialMatchId || a.slug === initialMatchId);
      if (m) {
        setSelectedMatch(m);
        return;
      }
      // Match not in initial fetch — load directly
      if (!loading) {
        (async () => {
          try {
            const data = await api.get<Activity>(`/activities/${encodeURIComponent(initialMatchId)}/`);
            if (data?.id) {
              setSelectedMatch(data);
            }
          } catch (err) {
            logger.error('[MatchWizard] Failed to fetch match by id', err);
          }
        })();
      }
    }
  }, [isOpen, activities, initialMatchId, selectedMatch, loading, setSelectedMatch]);
}
