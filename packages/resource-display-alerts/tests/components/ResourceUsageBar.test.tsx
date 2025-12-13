/**
 * Unit tests for ResourceUsageBar component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceUsageBar } from '../../src/components/ResourceUsageBar';

describe('ResourceUsageBar', () => {
  describe('rendering', () => {
    it('renders with basic props', () => {
      render(<ResourceUsageBar value={50} max={100} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays label when provided', () => {
      render(<ResourceUsageBar value={50} max={100} label="API Credits" />);
      expect(screen.getByText('API Credits')).toBeInTheDocument();
    });

    it('shows value/max by default', () => {
      render(<ResourceUsageBar value={850} max={1000} unit="credits" />);
      expect(screen.getByText('850/1000 credits')).toBeInTheDocument();
    });

    it('shows percentage when showPercentage=true', () => {
      render(<ResourceUsageBar value={85} max={100} showPercentage />);
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('does not render label when not provided', () => {
      const { container } = render(<ResourceUsageBar value={50} max={100} />);
      const labels = container.querySelectorAll('.label');
      expect(labels.length).toBe(0);
    });

    it('accepts custom className', () => {
      const { container } = render(
        <ResourceUsageBar value={50} max={100} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('ARIA attributes', () => {
    it('has correct progressbar role', () => {
      render(<ResourceUsageBar value={50} max={100} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('includes severity in aria-label when high', () => {
      render(<ResourceUsageBar value={90} max={100} label="Credits" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('warning')
      );
    });

    it('does not include severity warning for low usage', () => {
      render(<ResourceUsageBar value={30} max={100} label="Credits" />);
      const progressbar = screen.getByRole('progressbar');
      const ariaLabel = progressbar.getAttribute('aria-label');
      expect(ariaLabel).not.toContain('warning');
    });

    it('does not include severity warning for medium usage', () => {
      render(<ResourceUsageBar value={65} max={100} label="Credits" />);
      const progressbar = screen.getByRole('progressbar');
      const ariaLabel = progressbar.getAttribute('aria-label');
      expect(ariaLabel).not.toContain('warning');
    });

    it('uses custom aria-label when provided', () => {
      render(
        <ResourceUsageBar
          value={50}
          max={100}
          aria-label="Custom label for testing"
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Custom label for testing');
    });

    it('includes label in default aria-label', () => {
      render(<ResourceUsageBar value={50} max={100} label="API Credits" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('API Credits')
      );
    });

    it('uses "Resource usage" as default when no label provided', () => {
      render(<ResourceUsageBar value={50} max={100} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Resource usage')
      );
    });
  });

  describe('severity colors', () => {
    it('applies low severity color (green) for <50%', () => {
      const { container } = render(<ResourceUsageBar value={30} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('success');
    });

    it('applies medium severity color (yellow) for 50-80%', () => {
      const { container } = render(<ResourceUsageBar value={65} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('warning');
    });

    it('applies high severity color (red) for >=80%', () => {
      const { container } = render(<ResourceUsageBar value={90} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('error');
    });

    it('applies correct color at 50% boundary', () => {
      const { container } = render(<ResourceUsageBar value={50} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('warning');
    });

    it('applies correct color at 80% boundary', () => {
      const { container } = render(<ResourceUsageBar value={80} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('error');
    });
  });

  describe('bar width', () => {
    it('sets correct width for percentage', () => {
      const { container } = render(<ResourceUsageBar value={50} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('width: 50%');
    });

    it('sets correct width for non-round percentage', () => {
      const { container } = render(<ResourceUsageBar value={850} max={1000} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('width: 85%');
    });

    it('caps width at 100% for over-quota', () => {
      const { container } = render(<ResourceUsageBar value={120} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('width: 100%');
    });

    it('shows 0% width when value is 0', () => {
      const { container } = render(<ResourceUsageBar value={0} max={100} />);
      const bar = container.querySelector('[class*="bar"]');
      expect(bar).toBeTruthy();
      expect(bar?.getAttribute('style')).toContain('width: 0%');
    });
  });

  describe('edge cases', () => {
    it('handles value > max (over-quota)', () => {
      render(<ResourceUsageBar value={120} max={100} showPercentage />);
      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('handles max=0 without crashing', () => {
      render(<ResourceUsageBar value={0} max={0} />);
      expect(screen.getByText('0/0')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<ResourceUsageBar value={-10} max={100} showPercentage />);
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      render(<ResourceUsageBar value={33.33} max={100} showPercentage />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('handles very large values', () => {
      render(<ResourceUsageBar value={9999999} max={10000000} unit="bytes" />);
      expect(screen.getByText('9999999/10000000 bytes')).toBeInTheDocument();
    });

    it('handles empty string unit', () => {
      render(<ResourceUsageBar value={50} max={100} unit="" />);
      expect(screen.getByText('50/100')).toBeInTheDocument();
    });
  });
});
