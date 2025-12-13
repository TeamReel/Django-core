/**
 * Unit tests for ResourceUsageBar utilities
 */

import { describe, it, expect } from 'vitest';
import { calculatePercentage, getSeverity, formatDisplayText, getSeverityColor } from '../../src/components/ResourceUsageBar/utils';

describe('ResourceUsageBar utilities', () => {
  describe('calculatePercentage', () => {
    it('calculates correct percentage', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(850, 1000)).toBe(85);
    });

    it('handles over-quota', () => {
      expect(calculatePercentage(120, 100)).toBe(120);
    });

    it('handles max=0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('handles zero value', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('handles negative values', () => {
      expect(calculatePercentage(-10, 100)).toBe(-10);
    });

    it('handles decimal values', () => {
      expect(calculatePercentage(33.33, 100)).toBeCloseTo(33.33, 2);
    });
  });

  describe('getSeverity', () => {
    it('returns low for <50%', () => {
      expect(getSeverity(0)).toBe('low');
      expect(getSeverity(49.9)).toBe('low');
    });

    it('returns medium for 50-80%', () => {
      expect(getSeverity(50)).toBe('medium');
      expect(getSeverity(65)).toBe('medium');
      expect(getSeverity(79.9)).toBe('medium');
    });

    it('returns high for >=80%', () => {
      expect(getSeverity(80)).toBe('high');
      expect(getSeverity(100)).toBe('high');
      expect(getSeverity(120)).toBe('high');
    });

    it('handles boundary values correctly', () => {
      expect(getSeverity(49.99)).toBe('low');
      expect(getSeverity(50.0)).toBe('medium');
      expect(getSeverity(79.99)).toBe('medium');
      expect(getSeverity(80.0)).toBe('high');
    });
  });

  describe('formatDisplayText', () => {
    it('formats value/max with unit', () => {
      expect(formatDisplayText(850, 1000, 'credits')).toBe('850/1000 credits');
    });

    it('formats percentage', () => {
      expect(formatDisplayText(85, 100, undefined, true)).toBe('85%');
    });

    it('handles no unit', () => {
      expect(formatDisplayText(50, 100)).toBe('50/100');
    });

    it('rounds percentage to nearest integer', () => {
      expect(formatDisplayText(33.33, 100, undefined, true)).toBe('33%');
      expect(formatDisplayText(66.66, 100, undefined, true)).toBe('67%');
    });

    it('formats with different units', () => {
      expect(formatDisplayText(45, 100, 'GB')).toBe('45/100 GB');
      expect(formatDisplayText(500, 1000, 'calls')).toBe('500/1000 calls');
    });

    it('handles over-quota with percentage', () => {
      expect(formatDisplayText(120, 100, undefined, true)).toBe('120%');
    });

    it('handles over-quota with value/max', () => {
      expect(formatDisplayText(1200, 1000, 'credits')).toBe('1200/1000 credits');
    });
  });

  describe('getSeverityColor', () => {
    it('returns correct color for low severity', () => {
      const color = getSeverityColor('low');
      expect(color).toContain('success');
    });

    it('returns correct color for medium severity', () => {
      const color = getSeverityColor('medium');
      expect(color).toContain('warning');
    });

    it('returns correct color for high severity', () => {
      const color = getSeverityColor('high');
      expect(color).toContain('error');
    });

    it('returns CSS custom property with fallback', () => {
      const color = getSeverityColor('low');
      expect(color).toMatch(/var\(--color-\w+-\d+,\s*#[0-9a-f]{6}\)/);
    });
  });
});
