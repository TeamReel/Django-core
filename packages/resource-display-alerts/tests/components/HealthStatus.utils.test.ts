/**
 * Unit tests for HealthStatus utility functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  formatRelativeTime,
} from '../../src/components/HealthStatus/utils';

describe('HealthStatus Utils', () => {
  describe('getStatusColor', () => {
    it('returns success color for healthy', () => {
      const color = getStatusColor('healthy');
      expect(color).toContain('success');
      expect(color).toContain('600');
    });

    it('returns warning color for degraded', () => {
      const color = getStatusColor('degraded');
      expect(color).toContain('warning');
      expect(color).toContain('600');
    });

    it('returns error color for unhealthy', () => {
      const color = getStatusColor('unhealthy');
      expect(color).toContain('error');
      expect(color).toContain('600');
    });

    it('returns neutral color for unknown', () => {
      const color = getStatusColor('unknown');
      expect(color).toContain('neutral');
      expect(color).toContain('500');
    });

    it('includes fallback hex colors', () => {
      const color = getStatusColor('healthy');
      expect(color).toMatch(/#[0-9a-f]{6}/i);
    });
  });

  describe('getStatusLabel', () => {
    it('returns "Operational" for healthy', () => {
      expect(getStatusLabel('healthy')).toBe('Operational');
    });

    it('returns "Degraded" for degraded', () => {
      expect(getStatusLabel('degraded')).toBe('Degraded');
    });

    it('returns "Down" for unhealthy', () => {
      expect(getStatusLabel('unhealthy')).toBe('Down');
    });

    it('returns "Unknown" for unknown', () => {
      expect(getStatusLabel('unknown')).toBe('Unknown');
    });
  });

  describe('getStatusIcon', () => {
    it('returns checkmark for healthy', () => {
      expect(getStatusIcon('healthy')).toBe('✓');
    });

    it('returns warning triangle for degraded', () => {
      expect(getStatusIcon('degraded')).toBe('⚠');
    });

    it('returns X mark for unhealthy', () => {
      expect(getStatusIcon('unhealthy')).toBe('✕');
    });

    it('returns question mark for unknown', () => {
      expect(getStatusIcon('unknown')).toBe('?');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock current time to 2025-12-13T12:00:00Z
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-13T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats seconds ago (singular)', () => {
      const oneSecondAgo = new Date('2025-12-13T11:59:59Z').toISOString();
      expect(formatRelativeTime(oneSecondAgo)).toBe('1 second ago');
    });

    it('formats seconds ago (plural)', () => {
      const thirtySecondsAgo = new Date('2025-12-13T11:59:30Z').toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('30 seconds ago');
    });

    it('formats minutes ago (singular)', () => {
      const oneMinuteAgo = new Date('2025-12-13T11:59:00Z').toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('formats minutes ago (plural)', () => {
      const fiveMinutesAgo = new Date('2025-12-13T11:55:00Z').toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('formats hours ago (singular)', () => {
      const oneHourAgo = new Date('2025-12-13T11:00:00Z').toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('formats hours ago (plural)', () => {
      const twoHoursAgo = new Date('2025-12-13T10:00:00Z').toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('formats days ago (singular)', () => {
      const oneDayAgo = new Date('2025-12-12T12:00:00Z').toISOString();
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('formats days ago (plural)', () => {
      const threeDaysAgo = new Date('2025-12-10T12:00:00Z').toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('handles 59 seconds correctly (shows seconds, not minutes)', () => {
      const fiftyNineSecondsAgo = new Date('2025-12-13T11:59:01Z').toISOString();
      expect(formatRelativeTime(fiftyNineSecondsAgo)).toBe('59 seconds ago');
    });

    it('handles 60 seconds correctly (shows 1 minute)', () => {
      const sixtySecondsAgo = new Date('2025-12-13T11:59:00Z').toISOString();
      expect(formatRelativeTime(sixtySecondsAgo)).toBe('1 minute ago');
    });
  });
});
