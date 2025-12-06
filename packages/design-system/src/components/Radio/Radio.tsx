import { createContext, forwardRef, InputHTMLAttributes, useContext, useState } from 'react';
import {
  radioGroup,
  container,
  radioWrapper,
  hiddenInput,
  radio as radioStyle,
  label as labelStyle,
  helperText as helperTextStyle,
  RadioState,
  RadioSize,
} from './Radio.css';

// RadioGroup Context
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  state?: RadioState;
  size?: RadioSize;
}

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(undefined);

// RadioGroup Component
export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  state?: RadioState;
  size?: RadioSize;
  helperText?: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
}

export const RadioGroup = ({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled,
  state: stateProp,
  size = 'md',
  helperText: helperTextProp,
  error,
  success,
  children,
}: RadioGroupProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  // Determine state: error > success > default
  const state = stateProp || (error ? 'error' : success ? 'success' : 'default');

  // Helper text priority: error > success > helperText
  const displayHelperText = error || success || helperTextProp;

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider value={{ name, value, onChange: handleChange, disabled, state, size }}>
      <div className={radioGroup} role="radiogroup">
        {children}
        {displayHelperText && (
          <span className={helperTextStyle({ state })}>{displayHelperText}</span>
        )}
      </div>
    </RadioGroupContext.Provider>
  );
};

// Radio Component
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  value: string;
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ value, label, disabled: disabledProp, id, ...rest }, ref) => {
    const context = useContext(RadioGroupContext);

    if (!context) {
      throw new Error('Radio must be used within a RadioGroup');
    }

    const { name, value: groupValue, onChange, disabled: groupDisabled, state = 'default', size = 'md' } = context;
    const disabled = disabledProp || groupDisabled;
    const checked = groupValue === value;

    // Auto-generate ID if not provided
    const radioId = id || `radio-${name}-${value}`;

    const handleChange = () => {
      if (!disabled && onChange) {
        onChange(value);
      }
    };

    return (
      <label htmlFor={radioId} className={container} data-disabled={disabled}>
        <span className={radioWrapper}>
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className={hiddenInput}
            aria-invalid={state === 'error'}
            {...rest}
          />
          <span className={radioStyle({ state, size })} />
        </span>

        {label && <span className={labelStyle({ state })}>{label}</span>}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
