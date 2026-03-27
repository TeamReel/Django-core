/**
 * useMatchDayMode — Detects match-day state and provides countdown timer.
 *
 * Match-day = active match starts today (same calendar date).
 * Countdown ticks every minute via setInterval.
 * LIVE = match started but not yet ended.
 * readinessPercent = contentDoneSubtypes / total * 100.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Match } from '../components/dashboard/ActiveMatchCard';

export interface MatchDayMode {
  isMatchDay: boolean;
  activeMatch: Match | null;
  countdown: string | null;        // "Over 2u 15min" | "LIVE" | null
  countdownMinutes: number | null;  // minutes until kickoff (for urgency styling)
  readinessPercent: number;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatCountdown(minutesUntil: number): string {
  if (minutesUntil <= 0) return 'LIVE';
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  if (hours > 0) return `Over ${hours}u ${mins}min`;
  return `Over ${mins}min`;
}

function computeState(match: Match | null, contentDoneSubtypes: string[], totalContentItems: number): MatchDayMode {
  if (!match) {
    return { isMatchDay: false, activeMatch: null, countdown: null, countdownMinutes: null, readinessPercent: 0 };
  }

  const now = new Date();
  const start = new Date(match.start_time);
  const end = match.end_time ? new Date(match.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const isToday = isSameDay(now, start);
  if (!isToday) {
    return { isMatchDay: false, activeMatch: match, countdown: null, countdownMinutes: null, readinessPercent: 0 };
  }

  const nowMs = now.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();

  const isLive = nowMs >= startMs && nowMs <= endMs;
  const minutesUntil = Math.max(0, Math.ceil((startMs - nowMs) / 60000));

  const readinessPercent = totalContentItems > 0
    ? Math.round((contentDoneSubtypes.length / totalContentItems) * 100)
    : 0;

  return {
    isMatchDay: true,
    activeMatch: match,
    countdown: isLive ? 'LIVE' : formatCountdown(minutesUntil),
    countdownMinutes: isLive ? 0 : minutesUntil,
    readinessPercent,
  };
}

export function useMatchDayMode(
  match: Match | null,
  contentDoneSubtypes: string[] = [],
  totalContentItems: number = 12,
): MatchDayMode {
  const [tick, setTick] = useState(0);

  // Re-compute every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: track primitive fields, not object references
  return useMemo(
    () => computeState(match, contentDoneSubtypes, totalContentItems),
    [match?.id, match?.start_time, match?.end_time, contentDoneSubtypes.length, totalContentItems, tick],
  );
}
