/**
 * useMatchPhase — Determines the content phase (pre / during / post)
 * based on the match start_time relative to "now".
 *
 * Thresholds (from C2 spec):
 *   now < start - 2h            → pre-match
 *   start - 2h ≤ now ≤ start + 3h → live (during)
 *   now > start + 3h            → post-match
 *   start_time missing/invalid  → pre-match (fallback)
 */
import { useMemo } from 'react';
import type { ContentPhase } from '../components/MatchWizardV2/types';

const HOURS_2 = 2 * 60 * 60 * 1000;
const HOURS_3 = 3 * 60 * 60 * 1000;

export type PhaseConfidence = 'auto' | 'fallback';

export interface MatchPhaseResult {
  /** Detected phase */
  phase: ContentPhase;
  /** How the phase was determined */
  confidence: PhaseConfidence;
  /** Dutch label for the detected phase */
  label: string;
  /** Short hint used for the "recommended" badge */
  hint: string;
}

const LABELS: Record<ContentPhase, string> = {
  pre: 'Pre-match',
  during: 'Live',
  post: 'Post-match',
};

const HINTS: Record<ContentPhase, string> = {
  pre: 'Wedstrijd nog niet begonnen',
  during: 'Nu bezig',
  post: 'Wedstrijd afgelopen',
};

/**
 * Pure function — can also be used outside React (e.g. tests).
 */
export function detectMatchPhase(
  startTime: string | Date | null | undefined,
  now: Date = new Date(),
): MatchPhaseResult {
  if (!startTime) {
    return { phase: 'pre', confidence: 'fallback', label: LABELS.pre, hint: 'Geen aanvangstijd ingesteld' };
  }

  const matchDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
  if (isNaN(matchDate.getTime())) {
    return { phase: 'pre', confidence: 'fallback', label: LABELS.pre, hint: 'Ongeldige aanvangstijd' };
  }

  const matchMs = matchDate.getTime();
  const nowMs = now.getTime();

  if (nowMs < matchMs - HOURS_2) {
    return { phase: 'pre', confidence: 'auto', label: LABELS.pre, hint: HINTS.pre };
  }

  if (nowMs <= matchMs + HOURS_3) {
    return { phase: 'during', confidence: 'auto', label: LABELS.during, hint: HINTS.during };
  }

  return { phase: 'post', confidence: 'auto', label: LABELS.post, hint: HINTS.post };
}

/**
 * React hook — memoizes the phase result based on `startTime`.
 */
export function useMatchPhase(startTime: string | Date | null | undefined): MatchPhaseResult {
  return useMemo(() => detectMatchPhase(startTime), [startTime]);
}
