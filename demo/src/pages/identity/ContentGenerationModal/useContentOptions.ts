/**
 * Sub-hook: content generation option states + background fetching.
 *
 * Extracted from useContentGeneration to keep the orchestrator under 500 lines.
 */
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../../utils/apiBase';

interface ContentOptionsConfig {
  isOpen: boolean;
  matchData: any;
}

export function useContentOptions({ isOpen, matchData }: ContentOptionsConfig) {
  // ─── Lineup options ─────────────────────────────────────
  const [lineupFormation, setLineupFormation] = useState<string>(matchData?.metadata?.formation || '4-3-3');
  const [lineupCloseupStyle, setLineupCloseupStyle] = useState<'popout' | 'badge'>('popout');
  const [lineupAnimationStyle, setLineupAnimationStyle] = useState<'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade'>('slide_up');
  const [lineupIntroStyle, setLineupIntroStyle] = useState<'per_line' | 'per_player'>('per_line');
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string | null>(null);
  const [appBackgrounds, setAppBackgrounds] = useState<Array<{ id: string; url: string; label?: string; profile_name?: string }>>([]);

  // ─── Flyer options ──────────────────────────────────────
  const [matchFlyerVariant, setMatchFlyerVariant] = useState<'modern' | 'action' | 'stadium'>('modern');
  const [flyerMemberId, setFlyerMemberId] = useState<string | null>(null);
  const [flyerActionStyle, setFlyerActionStyle] = useState<string>('dribbling');
  const [flyerPhotoLayout, setFlyerPhotoLayout] = useState<'single' | 'triple' | 'hero_duo'>('single');
  const [flyerPhotoSlots, setFlyerPhotoSlots] = useState<Array<{ member_id: string | null; style_variant: string }>>([
    { member_id: null, style_variant: 'dribbling' },
    { member_id: null, style_variant: 'dribbling' },
    { member_id: null, style_variant: 'dribbling' },
  ]);

  // ─── Goal / Summary options ─────────────────────────────
  const [goalScoreHome, setGoalScoreHome] = useState<number>(0);
  const [goalScoreAway, setGoalScoreAway] = useState<number>(0);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);

  const [summaryScoreHome, setSummaryScoreHome] = useState<number>(0);
  const [summaryScoreAway, setSummaryScoreAway] = useState<number>(0);
  const [summaryGoalScorers, setSummaryGoalScorers] = useState<string>('');

  // ─── Fetch app backgrounds ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const fetchBackgrounds = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/branding/assets/app-backgrounds/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.data || data?.results || []);
          setAppBackgrounds(
            items.filter((a: any) => a.url).map((a: any) => ({
              id: a.id, url: a.url, label: a.label || '', profile_name: a.project_name || a.profile_name || '',
            })),
          );
        }
      } catch (err) {
        console.error(err);
        console.warn('Failed to fetch app backgrounds:', err);
      }
    };
    fetchBackgrounds();
  }, [isOpen]);

  return {
    lineupFormation, setLineupFormation,
    lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle, setLineupAnimationStyle,
    lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl, setSelectedBackgroundUrl,
    appBackgrounds,
    matchFlyerVariant, setMatchFlyerVariant,
    flyerMemberId, setFlyerMemberId,
    flyerActionStyle, setFlyerActionStyle,
    flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome, setGoalScoreHome,
    goalScoreAway, setGoalScoreAway,
    goalScorerId, setGoalScorerId,
    summaryScoreHome, setSummaryScoreHome,
    summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers, setSummaryGoalScorers,
  };
}
