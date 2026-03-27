/**
 * Sub-hook: content generation option states + background fetching.
 *
 * Extracted from useContentGeneration to keep the orchestrator under 500 lines.
 */
import { useMemo, useReducer, useEffect } from 'react';
import { api } from '@/api/client';
import { logger } from '@/utils/logger';
import { formReducer, makeSetter } from '@/utils/formReducer';

interface ContentOptionsConfig {
  isOpen: boolean;
  matchData: Record<string, unknown> | null;
}

export function useContentOptions({ isOpen, matchData }: ContentOptionsConfig) {
  interface ContentOptionsState {
    lineupFormation: string;
    lineupCloseupStyle: 'popout' | 'badge';
    lineupAnimationStyle: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade';
    lineupIntroStyle: 'per_line' | 'per_player';
    selectedBackgroundUrl: string | null;
    appBackgrounds: Array<{ id: string; url: string; label?: string; sport_name?: string }>;
    matchFlyerVariant: 'modern' | 'action' | 'stadium';
    flyerMemberId: string | null;
    flyerActionStyle: string;
    flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
    flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
    goalScoreHome: number;
    goalScoreAway: number;
    goalScorerId: string | null;
    summaryScoreHome: number;
    summaryScoreAway: number;
    summaryGoalScorers: string;
  }

  const [s, dispatch] = useReducer(formReducer<ContentOptionsState>, {
    lineupFormation: (matchData?.metadata as Record<string, unknown>)?.formation as string || '4-3-3',
    lineupCloseupStyle: 'popout',
    lineupAnimationStyle: 'slide_up',
    lineupIntroStyle: 'per_line',
    selectedBackgroundUrl: null,
    appBackgrounds: [],
    matchFlyerVariant: 'modern',
    flyerMemberId: null,
    flyerActionStyle: 'dribbling',
    flyerPhotoLayout: 'single',
    flyerPhotoSlots: [
      { member_id: null, style_variant: 'dribbling' },
      { member_id: null, style_variant: 'dribbling' },
      { member_id: null, style_variant: 'dribbling' },
    ],
    goalScoreHome: 0,
    goalScoreAway: 0,
    goalScorerId: null,
    summaryScoreHome: 0,
    summaryScoreAway: 0,
    summaryGoalScorers: '',
  });

  const setLineupFormation = useMemo(() => makeSetter<ContentOptionsState, 'lineupFormation'>(dispatch, 'lineupFormation'), [dispatch]);
  const setLineupCloseupStyle = useMemo(() => makeSetter<ContentOptionsState, 'lineupCloseupStyle'>(dispatch, 'lineupCloseupStyle'), [dispatch]);
  const setLineupAnimationStyle = useMemo(() => makeSetter<ContentOptionsState, 'lineupAnimationStyle'>(dispatch, 'lineupAnimationStyle'), [dispatch]);
  const setLineupIntroStyle = useMemo(() => makeSetter<ContentOptionsState, 'lineupIntroStyle'>(dispatch, 'lineupIntroStyle'), [dispatch]);
  const setSelectedBackgroundUrl = useMemo(() => makeSetter<ContentOptionsState, 'selectedBackgroundUrl'>(dispatch, 'selectedBackgroundUrl'), [dispatch]);
  const setAppBackgrounds = useMemo(() => makeSetter<ContentOptionsState, 'appBackgrounds'>(dispatch, 'appBackgrounds'), [dispatch]);
  const setMatchFlyerVariant = useMemo(() => makeSetter<ContentOptionsState, 'matchFlyerVariant'>(dispatch, 'matchFlyerVariant'), [dispatch]);
  const setFlyerMemberId = useMemo(() => makeSetter<ContentOptionsState, 'flyerMemberId'>(dispatch, 'flyerMemberId'), [dispatch]);
  const setFlyerActionStyle = useMemo(() => makeSetter<ContentOptionsState, 'flyerActionStyle'>(dispatch, 'flyerActionStyle'), [dispatch]);
  const setFlyerPhotoLayout = useMemo(() => makeSetter<ContentOptionsState, 'flyerPhotoLayout'>(dispatch, 'flyerPhotoLayout'), [dispatch]);
  const setFlyerPhotoSlots = useMemo(() => makeSetter<ContentOptionsState, 'flyerPhotoSlots'>(dispatch, 'flyerPhotoSlots'), [dispatch]);
  const setGoalScoreHome = useMemo(() => makeSetter<ContentOptionsState, 'goalScoreHome'>(dispatch, 'goalScoreHome'), [dispatch]);
  const setGoalScoreAway = useMemo(() => makeSetter<ContentOptionsState, 'goalScoreAway'>(dispatch, 'goalScoreAway'), [dispatch]);
  const setGoalScorerId = useMemo(() => makeSetter<ContentOptionsState, 'goalScorerId'>(dispatch, 'goalScorerId'), [dispatch]);
  const setSummaryScoreHome = useMemo(() => makeSetter<ContentOptionsState, 'summaryScoreHome'>(dispatch, 'summaryScoreHome'), [dispatch]);
  const setSummaryScoreAway = useMemo(() => makeSetter<ContentOptionsState, 'summaryScoreAway'>(dispatch, 'summaryScoreAway'), [dispatch]);
  const setSummaryGoalScorers = useMemo(() => makeSetter<ContentOptionsState, 'summaryGoalScorers'>(dispatch, 'summaryGoalScorers'), [dispatch]);

  // ─── Fetch app backgrounds ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const fetchBackgrounds = async () => {
      try {
        const data = await api.get<Array<{ id: string; label?: string; sport_name?: string; url: string }> | { results: Array<{ id: string; label?: string; sport_name?: string; url: string }> }>('/branding/assets/app-backgrounds/');
        const items = Array.isArray(data) ? data : (data?.results || []);
        setAppBackgrounds(
          items.filter((a) => a.url).map((a) => ({
            id: a.id, url: a.url, label: a.label || '', sport_name: a.sport_name || '',
          })),
        );
      } catch (err) {
        logger.warn('Failed to fetch app backgrounds', err);
      }
    };
    fetchBackgrounds();
  }, [isOpen]);

  return {
    lineupFormation: s.lineupFormation, setLineupFormation,
    lineupCloseupStyle: s.lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle: s.lineupAnimationStyle, setLineupAnimationStyle,
    lineupIntroStyle: s.lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl: s.selectedBackgroundUrl, setSelectedBackgroundUrl,
    appBackgrounds: s.appBackgrounds,
    matchFlyerVariant: s.matchFlyerVariant, setMatchFlyerVariant,
    flyerMemberId: s.flyerMemberId, setFlyerMemberId,
    flyerActionStyle: s.flyerActionStyle, setFlyerActionStyle,
    flyerPhotoLayout: s.flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots: s.flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome: s.goalScoreHome, setGoalScoreHome,
    goalScoreAway: s.goalScoreAway, setGoalScoreAway,
    goalScorerId: s.goalScorerId, setGoalScorerId,
    summaryScoreHome: s.summaryScoreHome, setSummaryScoreHome,
    summaryScoreAway: s.summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers: s.summaryGoalScorers, setSummaryGoalScorers,
  };
}
