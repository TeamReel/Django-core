import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Radio, RadioGroup } from './Radio';

describe('Radio', () => {
  it('throws error when used outside RadioGroup', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Radio value="test" label="Test" />);
    }).toThrow('Radio must be used within a RadioGroup');

    consoleSpy.mockRestore();
  });
});

describe('RadioGroup', () => {
  describe('rendering', () => {
    it('renders radio buttons with labels', () => {
      render(
        <RadioGroup name="color">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      expect(screen.getByLabelText('Red')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(
        <RadioGroup name="color" helperText="Choose your favorite color">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByText('Choose your favorite color')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('renders error state with error message', () => {
      render(
        <RadioGroup name="color" error="Please select a color">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      const radio = screen.getByRole('radio');
      expect(radio).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Please select a color')).toBeInTheDocument();
    });

    it('renders success state with success message', () => {
      render(
        <RadioGroup name="color" success="Good choice!">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByText('Good choice!')).toBeInTheDocument();
    });

    it('error message takes precedence over success message', () => {
      render(
        <RadioGroup name="color" error="Error" success="Success">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('allows selecting a radio button', async () => {
      render(
        <RadioGroup name="color">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      const redRadio = screen.getByLabelText('Red') as HTMLInputElement;
      const blueRadio = screen.getByLabelText('Blue') as HTMLInputElement;

      await userEvent.click(redRadio);
      expect(redRadio.checked).toBe(true);
      expect(blueRadio.checked).toBe(false);

      await userEvent.click(blueRadio);
      expect(redRadio.checked).toBe(false);
      expect(blueRadio.checked).toBe(true);
    });

    it('calls onChange when selection changes', async () => {
      const handleChange = jest.fn();

      render(
        <RadioGroup name="color" onChange={handleChange}>
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      await userEvent.click(screen.getByLabelText('Red'));
      expect(handleChange).toHaveBeenCalledWith('red');

      await userEvent.click(screen.getByLabelText('Blue'));
      expect(handleChange).toHaveBeenCalledWith('blue');
    });

    it('cannot be clicked when disabled', async () => {
      const handleChange = jest.fn();

      render(
        <RadioGroup name="color" disabled onChange={handleChange}>
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      const radio = screen.getByRole('radio');
      await userEvent.click(radio);

      expect(handleChange).not.toHaveBeenCalled();
      expect(radio).toBeDisabled();
    });
  });

  describe('controlled mode', () => {
    it('respects controlled value', () => {
      render(
        <RadioGroup name="color" value="blue">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      const redRadio = screen.getByLabelText('Red') as HTMLInputElement;
      const blueRadio = screen.getByLabelText('Blue') as HTMLInputElement;

      expect(redRadio.checked).toBe(false);
      expect(blueRadio.checked).toBe(true);
    });

    it('updates when controlled value changes', () => {
      const { rerender } = render(
        <RadioGroup name="color" value="red">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      expect(screen.getByLabelText('Red')).toBeChecked();

      rerender(
        <RadioGroup name="color" value="blue">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      expect(screen.getByLabelText('Blue')).toBeChecked();
    });
  });

  describe('uncontrolled mode', () => {
    it('uses defaultValue', () => {
      render(
        <RadioGroup name="color" defaultValue="blue">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      expect(screen.getByLabelText('Blue')).toBeChecked();
    });

    it('maintains internal state', async () => {
      render(
        <RadioGroup name="color">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      await userEvent.click(screen.getByLabelText('Red'));
      expect(screen.getByLabelText('Red')).toBeChecked();

      await userEvent.click(screen.getByLabelText('Blue'));
      expect(screen.getByLabelText('Blue')).toBeChecked();
      expect(screen.getByLabelText('Red')).not.toBeChecked();
    });
  });

  describe('props', () => {
    it('renders with small size', () => {
      render(
        <RadioGroup name="color" size="sm">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('renders with medium size', () => {
      render(
        <RadioGroup name="color" size="md">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(
        <RadioGroup name="color" size="lg">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('individual radio can be disabled', async () => {
      const handleChange = jest.fn();

      render(
        <RadioGroup name="color" onChange={handleChange}>
          <Radio value="red" label="Red" disabled />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      const redRadio = screen.getByLabelText('Red');
      await userEvent.click(redRadio);

      expect(handleChange).not.toHaveBeenCalled();
      expect(redRadio).toBeDisabled();
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();

      render(
        <RadioGroup name="color">
          <Radio ref={ref} value="red" label="Red" />
        </RadioGroup>
      );

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('accessibility', () => {
    it('uses radiogroup role', () => {
      render(
        <RadioGroup name="color">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('sets aria-invalid on error', () => {
      render(
        <RadioGroup name="color" error="Required">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );

      expect(screen.getByRole('radio')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates radios with same name', () => {
      render(
        <RadioGroup name="color">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      expect(radios[0].name).toBe('color');
      expect(radios[1].name).toBe('color');
    });
  });
});
