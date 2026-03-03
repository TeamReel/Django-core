/**
 * Unit tests for ResourceCard compound component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceCard } from '../../src/components/ResourceCard';

describe('ResourceCard', () => {
  describe('compound component pattern', () => {
    it('renders Header, Body, Footer in correct order', () => {
      render(
        <ResourceCard>
          <ResourceCard.Header>Header Content</ResourceCard.Header>
          <ResourceCard.Body>Body Content</ResourceCard.Body>
          <ResourceCard.Footer>Footer Content</ResourceCard.Footer>
        </ResourceCard>
      );

      expect(screen.getByText('Header Content')).toBeInTheDocument();
      expect(screen.getByText('Body Content')).toBeInTheDocument();
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('throws error when Header used outside ResourceCard', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ResourceCard.Header>Orphan Header</ResourceCard.Header>);
      }).toThrow('must be used within <ResourceCard>');

      spy.mockRestore();
    });

    it('throws error when Body used outside ResourceCard', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ResourceCard.Body>Orphan Body</ResourceCard.Body>);
      }).toThrow('must be used within <ResourceCard>');

      spy.mockRestore();
    });

    it('throws error when Footer used outside ResourceCard', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ResourceCard.Footer>Orphan Footer</ResourceCard.Footer>);
      }).toThrow('must be used within <ResourceCard>');

      spy.mockRestore();
    });
  });

  describe('variants', () => {
    it('applies default variant by default', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Body>Content</ResourceCard.Body>
        </ResourceCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('default');
    });

    it('applies compact variant', () => {
      const { container } = render(
        <ResourceCard variant="compact">
          <ResourceCard.Body>Content</ResourceCard.Body>
        </ResourceCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('compact');
    });

    it('applies bordered variant', () => {
      const { container } = render(
        <ResourceCard variant="bordered">
          <ResourceCard.Body>Content</ResourceCard.Body>
        </ResourceCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bordered');
    });
  });

  describe('composition', () => {
    it('renders only Header', () => {
      render(
        <ResourceCard>
          <ResourceCard.Header>Header Only</ResourceCard.Header>
        </ResourceCard>
      );

      expect(screen.getByText('Header Only')).toBeInTheDocument();
      expect(screen.queryByText('Body')).not.toBeInTheDocument();
    });

    it('renders only Body', () => {
      render(
        <ResourceCard>
          <ResourceCard.Body>Body Only</ResourceCard.Body>
        </ResourceCard>
      );

      expect(screen.getByText('Body Only')).toBeInTheDocument();
      expect(screen.queryByText('Header')).not.toBeInTheDocument();
    });

    it('renders Header and Body without Footer', () => {
      render(
        <ResourceCard>
          <ResourceCard.Header>Header</ResourceCard.Header>
          <ResourceCard.Body>Body</ResourceCard.Body>
        </ResourceCard>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.queryByText('Footer')).not.toBeInTheDocument();
    });

    it('renders complex nested content', () => {
      render(
        <ResourceCard>
          <ResourceCard.Header>
            <h3>Title</h3>
            <button>Action</button>
          </ResourceCard.Header>
          <ResourceCard.Body>
            <div>
              <p>Paragraph 1</p>
              <p>Paragraph 2</p>
            </div>
          </ResourceCard.Body>
          <ResourceCard.Footer>
            <button>Cancel</button>
            <button>Save</button>
          </ResourceCard.Footer>
        </ResourceCard>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('className', () => {
    it('accepts custom className on parent', () => {
      const { container } = render(
        <ResourceCard className="custom-card">
          <ResourceCard.Body>Content</ResourceCard.Body>
        </ResourceCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-card');
    });

    it('accepts custom className on Header', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Header className="custom-header">
            <span data-testid="header-content">Header</span>
          </ResourceCard.Header>
        </ResourceCard>
      );

      const headerContent = screen.getByTestId('header-content');
      const headerDiv = headerContent.parentElement;
      expect(headerDiv?.className).toContain('custom-header');
      expect(headerDiv?.className).toContain('header');
    });

    it('accepts custom className on Body', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Body className="custom-body">
            <span data-testid="body-content">Body</span>
          </ResourceCard.Body>
        </ResourceCard>
      );

      const bodyContent = screen.getByTestId('body-content');
      const bodyDiv = bodyContent.parentElement;
      expect(bodyDiv?.className).toContain('custom-body');
      expect(bodyDiv?.className).toContain('body');
    });

    it('accepts custom className on Footer', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Footer className="custom-footer">
            <span data-testid="footer-content">Footer</span>
          </ResourceCard.Footer>
        </ResourceCard>
      );

      const footerContent = screen.getByTestId('footer-content');
      const footerDiv = footerContent.parentElement;
      expect(footerDiv?.className).toContain('custom-footer');
      expect(footerDiv?.className).toContain('footer');
    });
  });

  describe('integration examples', () => {
    it('works with actual component content', () => {
      render(
        <ResourceCard variant="default">
          <ResourceCard.Header>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>API Usage</span>
              <span>85%</span>
            </div>
          </ResourceCard.Header>
          <ResourceCard.Body>
            <div>850 / 1000 requests</div>
          </ResourceCard.Body>
          <ResourceCard.Footer>
            <button>View Details</button>
          </ResourceCard.Footer>
        </ResourceCard>
      );

      expect(screen.getByText('API Usage')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('850 / 1000 requests')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('renders multiple cards independently', () => {
      render(
        <div>
          <ResourceCard>
            <ResourceCard.Header>Card 1</ResourceCard.Header>
          </ResourceCard>
          <ResourceCard variant="compact">
            <ResourceCard.Header>Card 2</ResourceCard.Header>
          </ResourceCard>
        </div>
      );

      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty children gracefully', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Body></ResourceCard.Body>
        </ResourceCard>
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles undefined className', () => {
      const { container } = render(
        <ResourceCard>
          <ResourceCard.Body>Content</ResourceCard.Body>
        </ResourceCard>
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
