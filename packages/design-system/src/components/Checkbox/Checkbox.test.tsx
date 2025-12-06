import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<Checkbox aria-label="Checkbox" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Checkbox label="Subscribe" helperText="Get weekly updates" />);
      expect(screen.getByText('Get weekly updates')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('renders error state with error message', () => {
      render(<Checkbox label="Accept" error="You must accept" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('You must accept')).toBeInTheDocument();
    });

    it('renders success state with success message', () => {
      render(<Checkbox label="Accept" success="Thank you!" />);
      expect(screen.getByText('Thank you!')).toBeInTheDocument();
    });

    it('error message takes precedence over success message', () => {
      render(<Checkbox label="Accept" error="Error" success="Success" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    it('error message takes precedence over helper text', () => {
      render(<Checkbox label="Accept" error="Error" helperText="Helper" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('can be checked and unchecked', async () => {
      render(<Checkbox label="Accept" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      await userEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      await userEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('handles onChange events', async () => {
      const handleChange = jest.fn();
      render(<Checkbox label="Accept" onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      expect(handleChange).toHaveBeenCalled();
    });

    it('cannot be clicked when disabled', async () => {
      const handleChange = jest.fn();
      render(<Checkbox label="Accept" disabled onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('props', () => {
    it('renders as disabled', () => {
      render(<Checkbox label="Accept" disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('renders as checked', () => {
      render(<Checkbox label="Accept" checked readOnly />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders with small size', () => {
      render(<Checkbox label="Accept" size="sm" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with medium size', () => {
      render(<Checkbox label="Accept" size="md" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(<Checkbox label="Accept" size="lg" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('supports indeterminate state', () => {
      render(<Checkbox label="Accept" indeterminate />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Checkbox ref={ref} label="Accept" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('accessibility', () => {
    it('associates label with checkbox', () => {
      render(<Checkbox label="Accept" />);
      const checkbox = screen.getByLabelText('Accept');
      expect(checkbox).toBeInTheDocument();
    });

    it('sets aria-invalid on error', () => {
      render(<Checkbox label="Accept" error="Required" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    });

    it('links helper text with aria-describedby', () => {
      render(<Checkbox label="Accept" helperText="Helper" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby');
    });

    it('supports aria-label when no label provided', () => {
      render(<Checkbox aria-label="Accept terms" />);
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });
  });
});
