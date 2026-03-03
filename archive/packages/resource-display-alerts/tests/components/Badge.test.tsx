/**
 * Unit tests for Badge component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components/Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders children content', () => {
      render(<Badge>5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders text content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders number content', () => {
      render(<Badge>{99}</Badge>);
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(<Badge className="custom-badge">3</Badge>);
      expect(container.firstChild).toHaveClass('custom-badge');
    });
  });

  describe('variant colors', () => {
    it('applies neutral variant by default', () => {
      const { container } = render(<Badge>3</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('neutral');
    });

    it('applies success variant color', () => {
      const { container } = render(<Badge variant="success">OK</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('success');
    });

    it('applies warning variant color', () => {
      const { container } = render(<Badge variant="warning">3</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('warning');
    });

    it('applies error variant color', () => {
      const { container } = render(<Badge variant="error">5</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('error');
    });

    it('applies info variant color', () => {
      const { container } = render(<Badge variant="info">2</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('info');
    });

    it('includes background color in style', () => {
      const { container } = render(<Badge variant="success">OK</Badge>);
      const badge = container.firstChild as HTMLElement;
      const style = badge.getAttribute('style');
      expect(style).toContain('background-color');
      expect(style).toContain('color');
    });
  });

  describe('size variants', () => {
    it('applies medium size by default', () => {
      const { container } = render(<Badge>5</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('medium');
    });

    it('renders small size', () => {
      const { container } = render(<Badge size="small">1</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('small');
    });

    it('renders large size', () => {
      const { container } = render(<Badge size="large">99+</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('large');
    });
  });

  describe('edge cases', () => {
    it('renders zero', () => {
      render(<Badge>0</Badge>);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders empty string', () => {
      const { container } = render(<Badge></Badge>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders complex content', () => {
      render(
        <Badge>
          <span>5</span> items
        </Badge>
      );
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('items')).toBeInTheDocument();
    });

    it('renders very long numbers', () => {
      render(<Badge>999+</Badge>);
      expect(screen.getByText('999+')).toBeInTheDocument();
    });
  });

  describe('combinations', () => {
    it('combines variant and size props', () => {
      const { container } = render(
        <Badge variant="error" size="small">
          !
        </Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('small');
      const style = badge.getAttribute('style');
      expect(style).toContain('error');
    });

    it('combines all props', () => {
      const { container } = render(
        <Badge variant="success" size="large" className="my-badge">
          Complete
        </Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('large');
      expect(badge.className).toContain('my-badge');
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });
});
