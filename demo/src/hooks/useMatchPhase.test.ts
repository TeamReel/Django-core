import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { detectMatchPhase, useMatchPhase } from './useMatchPhase';

// Use detectMatchPhase (pure function) for most tests; useMatchPhase for hook test.

describe('detectMatchPhase', () => {
  const matchTime = new Date('2025-06-15T15:00:00Z');

  it('returns pre-match when now is >2h before start', () => {
    const now = new Date('2025-06-15T12:00:00Z'); // 3h before
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('pre');
    expect(result.confidence).toBe('auto');
  });

  it('returns during when now is within 2h before start', () => {
    const now = new Date('2025-06-15T13:30:00Z'); // 1.5h before
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('during');
    expect(result.confidence).toBe('auto');
  });

  it('returns during at exactly 2h before start', () => {
    const now = new Date('2025-06-15T13:00:00Z'); // exactly 2h before
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('during');
  });

  it('returns during at match start time', () => {
    const result = detectMatchPhase(matchTime, matchTime);
    expect(result.phase).toBe('during');
  });

  it('returns during within 3h after start', () => {
    const now = new Date('2025-06-15T17:30:00Z'); // 2.5h after
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('during');
  });

  it('returns during at exactly 3h after start', () => {
    const now = new Date('2025-06-15T18:00:00Z'); // exactly 3h after
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('during');
  });

  it('returns post-match when now is >3h after start', () => {
    const now = new Date('2025-06-15T18:00:01Z'); // 3h + 1s after
    const result = detectMatchPhase(matchTime, now);
    expect(result.phase).toBe('post');
    expect(result.confidence).toBe('auto');
  });

  it('returns pre-match fallback when startTime is null', () => {
    const result = detectMatchPhase(null);
    expect(result.phase).toBe('pre');
    expect(result.confidence).toBe('fallback');
    expect(result.hint).toContain('Geen aanvangstijd');
  });

  it('returns pre-match fallback for invalid date string', () => {
    const result = detectMatchPhase('not-a-date');
    expect(result.phase).toBe('pre');
    expect(result.confidence).toBe('fallback');
    expect(result.hint).toContain('Ongeldige');
  });

  it('accepts ISO string input', () => {
    const now = new Date('2025-06-15T20:00:00Z');
    const result = detectMatchPhase('2025-06-15T15:00:00Z', now);
    expect(result.phase).toBe('post');
  });

  it('has Dutch labels', () => {
    const result = detectMatchPhase(matchTime, matchTime);
    expect(result.label).toBe('Live');
  });
});

describe('useMatchPhase', () => {
  it('returns memoized phase result from hook', () => {
    const { result } = renderHook(() =>
      useMatchPhase('2025-06-15T15:00:00Z'),
    );
    expect(result.current.phase).toBeDefined();
    expect(['pre', 'during', 'post']).toContain(result.current.phase);
  });

  it('returns fallback for null startTime', () => {
    const { result } = renderHook(() => useMatchPhase(null));
    expect(result.current.phase).toBe('pre');
    expect(result.current.confidence).toBe('fallback');
  });
});
