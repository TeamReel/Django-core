import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Textarea placeholder="Enter description..." />);
      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Textarea helperText="Max 500 characters" />);
      expect(screen.getByText('Max 500 characters')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<Textarea placeholder="No label" />);
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('renders error state with error message', () => {
      render(<Textarea label="Description" error="This field is required" />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('renders success state with success message', () => {
      render(<Textarea label="Description" success="Looks good!" />);
      expect(screen.getByText('Looks good!')).toBeInTheDocument();
    });

    it('error message takes precedence over success message', () => {
      render(<Textarea label="Description" error="Error" success="Success" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    it('error message takes precedence over helper text', () => {
      render(<Textarea label="Description" error="Error" helperText="Helper" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('handles onChange events', async () => {
      const handleChange = jest.fn();
      render(<Textarea label="Description" onChange={handleChange} />);

      const textarea = screen.getByLabelText('Description');
      await userEvent.type(textarea, 'Hello');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('props', () => {
    it('renders as disabled', () => {
      render(<Textarea label="Description" disabled />);
      expect(screen.getByLabelText('Description')).toBeDisabled();
    });

    it('renders with small size', () => {
      render(<Textarea label="Description" size="sm" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with medium size', () => {
      render(<Textarea label="Description" size="md" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(<Textarea label="Description" size="lg" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('marks textarea as required when required prop is true', () => {
      render(<Textarea label="Description" required />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toHaveAttribute('required');
    });

    it('renders with no resize', () => {
      render(<Textarea label="Description" resize="none" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with vertical resize', () => {
      render(<Textarea label="Description" resize="vertical" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with both resize', () => {
      render(<Textarea label="Description" resize="both" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with custom rows', () => {
      render(<Textarea label="Description" rows={5} />);
      const textarea = screen.getByLabelText('Description') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to textarea element', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} label="Description" />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe('accessibility', () => {
    it('associates label with textarea', () => {
      render(<Textarea label="Description" />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toBeInTheDocument();
    });

    it('sets aria-invalid on error', () => {
      render(<Textarea label="Description" error="Required" />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('links helper text with aria-describedby', () => {
      render(<Textarea label="Description" helperText="Helper" />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toHaveAttribute('aria-describedby');
    });
  });
});
