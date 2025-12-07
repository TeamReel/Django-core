import { forwardRef, type InputHTMLAttributes } from 'react';
import { input, label, helperText, type InputState, type InputSize } from './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  state?: InputState;
  size?: InputSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label: labelText,
      helperText: helperTextContent,
      error,
      success,
      state: stateProp,
      size = 'md',
      id,
      required,
      className,
      ...props
    },
    ref
  ) => {
    // Derive state from error/success props if not explicitly provided
    const state = stateProp || (error ? 'error' : success ? 'success' : 'default');

    // Generate ID if not provided (for label association)
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Determine helper text to display (error takes precedence)
    const displayHelperText = error || success || helperTextContent;

    return (
      <div className={className}>
        {labelText && (
          <label
            htmlFor={inputId}
            className={label({ state, required: required || undefined })}
          >
            {labelText}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={input({ state, size })}
          aria-invalid={state === 'error'}
          aria-describedby={displayHelperText ? `${inputId}-helper` : undefined}
          required={required}
          {...props}
        />
        {displayHelperText && (
          <span
            id={`${inputId}-helper`}
            className={helperText({ state })}
          >
            {displayHelperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
