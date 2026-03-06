/**
 * ContentStreakWidget — Shows the team's content creation streak.
 *
 * A streak = number of consecutive matches (past, with start_time <= now)
 * for which at least the "base content" (flyer + lineup + end_score) was created.
 *
 * Computed client-side from the last N past matches and their media items.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Flame, TrendingUp, Trophy } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiBase';
import styles from './ContentStreakWidget.module.css';

/** Safely extract array from any paginated API response format */
function extractItems<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.results)) return json.results;
  return [];
}

/* ── Types ─────────────────────────────────────────────────────────── */

interface PastMatch {
  id: string;
  title: string;
  start_time: string;
  project: { id: string; name: string };
}

interface MediaItem {
  id: string;
  extraction_metadata?: { asset_type?: string };
}

/** The "base" content subtypes that count towards a streak */
const STREAK_REQUIRED_SUBTYPES = ['flyer', 'lineup', 'end_score'];

/** Normalize media asset_type to subtype key */
function normalize(raw: string): string {
  const map: Record<string, string> = {
    match_flyer: 'flyer',
    final_score: 'end_score',
    score: 'end_score',
    lineup_video: 'lineup',
    lineup_flyer: 'lineup',
    goal_celebration: 'goal',
    walkon_video: 'walkon',
    walk_on: 'walkon',
    anthem_video: 'anthem',
  };
  const key = raw.toLowerCase().replace(/[\s-]/g, '_');
  return map[key] || key;
}

/* ── Main Component ────────────────────────────────────────────────── */

export const ContentStreakWidget: React.FC = () => {
  const [streak, setStreak] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // Fetch last 20 past matches
        const now = new Date().toISOString();
        const matchRes = await fetch(
          `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__lte=${encodeURIComponent(now)}&ordering=-start_time&page_size=20`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
        );
        if (!matchRes.ok) throw new Error('fetch failed');
        const matchData = await matchRes.json();
        const pastMatches: PastMatch[] = extractItems<PastMatch>(matchData);

        if (cancelled) return;
        setTotalMatches(pastMatches.length);

        if (pastMatches.length === 0) {
          setStreak(0);
          return;
        }

        // For each match, check if base content exists
        let currentStreak = 0;
        for (const m of pastMatches) {
          const mediaRes = await fetch(
            `${apiBaseUrl}/api/v1/media/items/?activity=${m.id}&page_size=50`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          );
          if (!mediaRes.ok) break;
          const mediaData = await mediaRes.json();
          const items: MediaItem[] = extractItems<MediaItem>(mediaData);

          const types = new Set<string>();
          for (const mi of items) {
            const raw = mi.extraction_metadata?.asset_type;
            if (raw) types.add(normalize(raw));
          }

          const hasBase = STREAK_REQUIRED_SUBTYPES.every((s) => types.has(s));
          if (hasBase) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }

        if (!cancelled) setStreak(currentStreak);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  // Don't render if loading or no past matches
  if (loading || totalMatches === 0) return null;

  const flameLevel = streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 1 ? 1 : 0;

  return (
    <div className={styles.widget} data-level={flameLevel}>
      <div className={styles.flameWrap}>
        {streak > 0 ? (
          <Flame size={28} className={styles.flameIcon} />
        ) : (
          <TrendingUp size={28} className={styles.noStreakIcon} />
        )}
      </div>

      <div className={styles.info}>
        {streak > 0 ? (
          <>
            <div className={styles.streakCount}>
              {streak} {streak === 1 ? 'wedstrijd' : 'wedstrijden'}
            </div>
            <div className={styles.streakLabel}>
              Content streak! {streak >= 5 ? '🔥' : ''}
              {streak >= 10 && <Trophy size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
            </div>
          </>
        ) : (
          <>
            <div className={styles.streakCount}>Start je streak</div>
            <div className={styles.streakLabel}>
              Maak flyer + lineup + eindstand voor de volgende wedstrijd
            </div>
          </>
        )}
      </div>

      {/* Mini progress dots for last 5 matches */}
      {totalMatches > 0 && (
        <div className={styles.dots}>
          {Array.from({ length: Math.min(5, totalMatches) }).map((_, i) => (
            <span
              key={i}
              className={styles.dot}
              data-active={i < streak}
            />
          ))}
        </div>
      )}
    </div>
  );
};
