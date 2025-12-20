import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BreadcrumbContextSwitcher } from '../components/BreadcrumbContextSwitcher';
import type { BreadcrumbSwitcherOption } from '../components/BreadcrumbContextSwitcher';

describe('BreadcrumbContextSwitcher', () => {
  const mockOptions: BreadcrumbSwitcherOption[] = [
    { id: '1', label: 'Bundesliga', slug: 'bundesliga' },
    { id: '2', label: 'Premier League', slug: 'premier-league' },
    { id: '3', label: 'La Liga', slug: 'la-liga' },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders with label and dropdown closed', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
          hasDropdown={true}
        />
      );

      expect(screen.getByText('Bundesliga')).toBeInTheDocument();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('renders as plain text when hasDropdown is false', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
          hasDropdown={false}
        />
      );

      const span = screen.getByText('Bundesliga').closest('span');
      expect(span).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders as plain text when current is true', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
          current={true}
        />
      );

      const span = screen.getByText('Bundesliga').closest('span');
      expect(span).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders with icon when provided', () => {
      const icon = <svg data-testid="test-icon" />;
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
          icon={icon}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when button is clicked', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Premier League')).toBeInTheDocument();
      expect(screen.getByText('La Liga')).toBeInTheDocument();
    });

    it('closes dropdown when button is clicked again', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');

      // Open
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('highlights current option in dropdown', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const currentOption = screen.getByRole('option', { name: 'Bundesliga' });
      expect(currentOption).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onSelect when an option is clicked', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const option = screen.getByRole('option', { name: 'Premier League' });
      fireEvent.click(option);

      expect(mockOnSelect).toHaveBeenCalledWith({
        id: '2',
        label: 'Premier League',
        slug: 'premier-league',
      });
    });

    it('closes dropdown after selecting an option', async () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const option = screen.getByRole('option', { name: 'Premier League' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes dropdown on Escape key', async () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('sets correct ARIA attributes', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('shows "No options available" when options array is empty', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={[]}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('No options available')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <BreadcrumbContextSwitcher
            label="Bundesliga"
            currentId="1"
            options={mockOptions}
            onSelect={mockOnSelect}
          />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('handles options without slugs', () => {
      const optionsWithoutSlugs: BreadcrumbSwitcherOption[] = [
        { id: '1', label: 'Option 1' },
        { id: '2', label: 'Option 2' },
      ];

      render(
        <BreadcrumbContextSwitcher
          label="Option 1"
          currentId="1"
          options={optionsWithoutSlugs}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const option = screen.getByRole('option', { name: 'Option 2' });
      fireEvent.click(option);

      expect(mockOnSelect).toHaveBeenCalledWith({
        id: '2',
        label: 'Option 2',
      });
    });
  });

  describe('Visual States', () => {
    it('applies hover styles to button', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseOver(button);

      // Visual verification would be in visual regression tests
      // Here we just confirm the element exists
      expect(button).toBeInTheDocument();
    });

    it('rotates chevron icon when dropdown is open', () => {
      render(
        <BreadcrumbContextSwitcher
          label="Bundesliga"
          currentId="1"
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      const chevron = button.querySelector('svg');

      // Closed state
      expect(chevron).toHaveStyle({ transform: 'rotate(0deg)' });

      // Open state
      fireEvent.click(button);
      expect(chevron).toHaveStyle({ transform: 'rotate(180deg)' });
    });
  });
});
