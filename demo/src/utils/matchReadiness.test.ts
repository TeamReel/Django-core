/**
 * Tests for calculateMatchReadiness utility
 *
 * Validates readiness percentage calculation for match content.
 * Enabled subtypes: flyer, lineup, lineup_flyer, match_intro, poster (pre_match),
 *   goal (during_match, excluded without goals), match_summary (post_match)
 */

import { describe, it, expect } from 'vitest';
import { calculateMatchReadiness } from './matchReadiness';

describe('calculateMatchReadiness', () => {
  // ── No goals scenario: 6 enabled subtypes (goal excluded) ──

  it('returns 0% when no content is done and no goals', () => {
    const result = calculateMatchReadiness([], undefined);
    expect(result.percent).toBe(0);
    expect(result.done).toBe(0);
    // 5 pre_match + 0 during_match (goal excluded) + 1 post_match = 6
    expect(result.total).toBe(6);
  });

  it('calculates partial readiness correctly without goals', () => {
    const result = calculateMatchReadiness(['flyer', 'lineup'], undefined);
    expect(result.done).toBe(2);
    expect(result.total).toBe(6);
    expect(result.percent).toBe(33); // Math.round(2/6 * 100)
  });

  it('returns 100% when all enabled subtypes are done (no goals)', () => {
    const allDone = ['flyer', 'lineup', 'lineup_flyer', 'match_intro', 'poster', 'match_summary'];
    const result = calculateMatchReadiness(allDone, undefined);
    expect(result.done).toBe(6);
    expect(result.total).toBe(6);
    expect(result.percent).toBe(100);
  });

  // ── With goals scenario: 7 enabled subtypes (goal included) ──

  it('includes goal subtype when match has goals', () => {
    const matchWithGoals = { metadata: { home_score: 2, away_score: 1 } };
    const result = calculateMatchReadiness([], matchWithGoals);
    expect(result.total).toBe(7);
    expect(result.done).toBe(0);
    expect(result.percent).toBe(0);
  });

  it('counts goal as done when match has goals', () => {
    const matchWithGoals = { metadata: { home_score: 1, away_score: 0 } };
    const result = calculateMatchReadiness(['flyer', 'goal'], matchWithGoals);
    expect(result.done).toBe(2);
    expect(result.total).toBe(7);
    expect(result.percent).toBe(29); // Math.round(2/7 * 100)
  });

  it('returns 100% with all items done including goal', () => {
    const matchWithGoals = { metadata: { home_score: 3, away_score: 2 } };
    const allDone = ['flyer', 'lineup', 'lineup_flyer', 'match_intro', 'poster', 'goal', 'match_summary'];
    const result = calculateMatchReadiness(allDone, matchWithGoals);
    expect(result.percent).toBe(100);
    expect(result.done).toBe(7);
    expect(result.total).toBe(7);
  });

  // ── Edge cases ──

  it('ignores disabled subtypes in done list', () => {
    // 'walkon' and 'anthem' are disabled, 'end_score' and 'highlights' are disabled
    const result = calculateMatchReadiness(['walkon', 'anthem', 'end_score', 'highlights'], undefined);
    expect(result.done).toBe(0);
    expect(result.total).toBe(6);
    expect(result.percent).toBe(0);
  });

  it('excludes goal from done when match has no goals', () => {
    // Passing goal as done but no match score → goal excluded from both total and done
    const result = calculateMatchReadiness(['goal', 'flyer'], { metadata: {} });
    expect(result.done).toBe(1); // only flyer, goal excluded
    expect(result.total).toBe(6); // goal excluded from total
  });

  it('handles null match gracefully', () => {
    const result = calculateMatchReadiness(['flyer'], null);
    expect(result.done).toBe(1);
    expect(result.total).toBe(6);
    expect(result.percent).toBe(17); // Math.round(1/6 * 100)
  });

  it('handles 0-0 score as no goals', () => {
    const matchZero = { metadata: { home_score: 0, away_score: 0 } };
    const result = calculateMatchReadiness([], matchZero);
    expect(result.total).toBe(6); // goal excluded since both scores are 0/falsy
  });
});
