/**
 * Unit tests for HealthStatus component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthStatus } from '../../src/components/HealthStatus';

describe('HealthStatus', () => {
  describe('rendering', () => {
    it('renders with basic props', () => {
      render(<HealthStatus name="Database" status="healthy" />);
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });

    it('displays details when provided', () => {
      render(
        <HealthStatus
          name="API"
          status="degraded"
          details="High response time (1.2s avg)"
        />
      );
      expect(screen.getByText('High response time (1.2s avg)')).toBeInTheDocument();
    });

    it('does not render details when not provided', () => {
      const { container } = render(<HealthStatus name="Cache" status="healthy" />);
      const detailsElement = container.querySelector('.details');
      expect(detailsElement).toBeNull();
    });

    it('displays formatted last checked time', () => {
      // Mock current time for consistent test results
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-13T12:00:00Z'));

      const fiveMinutesAgo = new Date('2025-12-13T11:55:00Z').toISOString();
      render(
        <HealthStatus name="Cache" status="healthy" lastChecked={fiveMinutesAgo} />
      );
      expect(screen.getByText(/Last checked 5 minutes ago/)).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('does not render timestamp when lastChecked not provided', () => {
      const { container } = render(<HealthStatus name="Cache" status="healthy" />);
      const timestampElement = container.querySelector('.timestamp');
      expect(timestampElement).toBeNull();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <HealthStatus name="DB" status="healthy" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('status variants', () => {
    it('renders healthy status with checkmark icon', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('✓');
      expect(icon).toHaveAttribute('aria-label', 'Operational status');
    });

    it('renders healthy status with "Operational" label', () => {
      render(<HealthStatus name="DB" status="healthy" />);
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });

    it('renders degraded status with warning icon', () => {
      const { container } = render(<HealthStatus name="DB" status="degraded" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('⚠');
      expect(icon).toHaveAttribute('aria-label', 'Degraded status');
    });

    it('renders degraded status with "Degraded" label', () => {
      render(<HealthStatus name="DB" status="degraded" />);
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    it('renders unhealthy status with X mark icon', () => {
      const { container } = render(<HealthStatus name="DB" status="unhealthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('✕');
      expect(icon).toHaveAttribute('aria-label', 'Down status');
    });

    it('renders unhealthy status with "Down" label', () => {
      render(<HealthStatus name="DB" status="unhealthy" />);
      expect(screen.getByText('Down')).toBeInTheDocument();
    });

    it('renders unknown status with question mark icon', () => {
      const { container } = render(<HealthStatus name="DB" status="unknown" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('?');
      expect(icon).toHaveAttribute('aria-label', 'Unknown status');
    });

    it('renders unknown status with "Unknown" label', () => {
      render(<HealthStatus name="DB" status="unknown" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('status colors', () => {
    it('applies success color for healthy status', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon?.getAttribute('style')).toContain('success');
    });

    it('applies warning color for degraded status', () => {
      const { container } = render(<HealthStatus name="DB" status="degraded" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon?.getAttribute('style')).toContain('warning');
    });

    it('applies error color for unhealthy status', () => {
      const { container } = render(<HealthStatus name="DB" status="unhealthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon?.getAttribute('style')).toContain('error');
    });

    it('applies neutral color for unknown status', () => {
      const { container } = render(<HealthStatus name="DB" status="unknown" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon?.getAttribute('style')).toContain('neutral');
    });
  });

  describe('size variants', () => {
    it('applies medium size by default', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" />);
      const healthStatus = container.firstChild as HTMLElement;
      expect(healthStatus.className).toContain('medium');
    });

    it('applies small size class', () => {
      const { container } = render(
        <HealthStatus name="DB" status="healthy" size="small" />
      );
      const healthStatus = container.firstChild as HTMLElement;
      expect(healthStatus.className).toContain('small');
    });

    it('applies large size class', () => {
      const { container } = render(
        <HealthStatus name="DB" status="healthy" size="large" />
      );
      const healthStatus = container.firstChild as HTMLElement;
      expect(healthStatus.className).toContain('large');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA label on icon', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveAttribute('role', 'img');
      expect(icon).toHaveAttribute('aria-label');
    });

    it('includes status text for screen readers', () => {
      render(<HealthStatus name="DB" status="healthy" />);
      // Status label is visible text, not just color
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });
  });
});
