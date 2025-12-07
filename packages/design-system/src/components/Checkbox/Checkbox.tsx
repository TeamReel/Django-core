import { forwardRef, InputHTMLAttributes, useEffect, useRef } from 'react';
import {
  container,
  checkboxWrapper,
  hiddenInput,
  checkbox as checkboxStyle,
  checkIcon,
  label as labelStyle,
  helperText as helperTextStyle,
  CheckboxState,
  CheckboxSize,
} from './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  state?: CheckboxState;
  size?: CheckboxSize;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText: helperTextProp,
      error,
      success,
      state: stateProp,
      size = 'md',
      indeterminate = false,
      disabled,
      id,
      ...rest
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);

    // Determine state: error > success > default
    const state = stateProp || (error ? 'error' : success ? 'success' : 'default');

    // Auto-generate ID if not provided
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    // Helper text priority: error > success > helperText
    const displayHelperText = error || success || helperTextProp;

    // Handle indeterminate state
    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Combine refs
    const combinedRef = (element: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = element;
      }
    };

    const CheckIcon = () => (
      <svg className={checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );

    const IndeterminateIcon = () => (
      <svg className={checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );

    return (
      <div>
        <label
          htmlFor={checkboxId}
          className={container}
          data-disabled={disabled}
        >
          <span className={checkboxWrapper}>
            <input
              ref={combinedRef}
              type="checkbox"
              id={checkboxId}
              className={hiddenInput}
              disabled={disabled}
              aria-invalid={state === 'error'}
              aria-describedby={displayHelperText ? `${checkboxId}-helper` : undefined}
              {...rest}
            />
            <span className={checkboxStyle({ state, size })}>
              {indeterminate ? <IndeterminateIcon /> : rest.checked && <CheckIcon />}
            </span>
          </span>

          {label && <span className={labelStyle({ state })}>{label}</span>}
        </label>

        {displayHelperText && (
          <span id={`${checkboxId}-helper`} className={helperTextStyle({ state })}>
            {displayHelperText}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
