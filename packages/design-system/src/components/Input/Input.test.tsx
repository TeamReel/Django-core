import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Input } from './Input';

expect.extend(toHaveNoViolations);

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('renders with helper text', () => {
    render(<Input label="Email" helperText="We'll never share your email" />);
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
  });

  it('renders error state with error message', () => {
    render(<Input label="Email" error="Email is required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('renders success state with success message', () => {
    render(<Input label="Email" success="Email is valid" />);
    expect(screen.getByText('Email is valid')).toBeInTheDocument();
  });

  it('error message takes precedence over success and helper text', () => {
    render(
      <Input
        label="Email"
        error="Email is required"
        success="Email is valid"
        helperText="Helper text"
      />
    );
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.queryByText('Email is valid')).not.toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('success message takes precedence over helper text', () => {
    render(
      <Input
        label="Email"
        success="Email is valid"
        helperText="Helper text"
      />
    );
    expect(screen.getByText('Email is valid')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('handles onChange events', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<Input label="Email" onChange={handleChange} />);

    const input = screen.getByLabelText('Email');
    await user.type(input, 'test@example.com');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test@example.com');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Email" disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('renders all sizes', () => {
    const { rerender } = render(<Input label="Small" size="sm" />);
    expect(screen.getByLabelText('Small')).toBeInTheDocument();

    rerender(<Input label="Medium" size="md" />);
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();

    rerender(<Input label="Large" size="lg" />);
    expect(screen.getByLabelText('Large')).toBeInTheDocument();
  });

  it('marks label as required when required prop is true', () => {
    render(<Input label="Email" required />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('required');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} label="Email" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Input label="Email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with error', async () => {
    const { container } = render(<Input label="Email" error="Email is required" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when disabled', async () => {
    const { container } = render(<Input label="Email" disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
