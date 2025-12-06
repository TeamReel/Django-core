import { forwardRef, TextareaHTMLAttributes } from 'react';
import { textarea, label as labelStyle, helperText, TextareaState, TextareaSize, TextareaResize } from './Textarea.css';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  state?: TextareaState;
  size?: TextareaSize;
  resize?: TextareaResize;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label: labelText,
      helperText: helperTextProp,
      error,
      success,
      state: stateProp,
      size = 'md',
      resize = 'vertical',
      id,
      required,
      className,
      ...rest
    },
    ref
  ) => {
    // Determine state: error > success > default
    const state = stateProp || (error ? 'error' : success ? 'success' : 'default');

    // Auto-generate ID if not provided
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Helper text priority: error > success > helperText
    const displayHelperText = error || success || helperTextProp;

    return (
      <div>
        {labelText && (
          <label htmlFor={textareaId} className={labelStyle({ state, required })}>
            {labelText}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={textarea({ state, size, resize })}
          aria-invalid={state === 'error'}
          aria-describedby={displayHelperText ? `${textareaId}-helper` : undefined}
          required={required}
          {...rest}
        />

        {displayHelperText && (
          <span id={`${textareaId}-helper`} className={helperText({ state })}>
            {displayHelperText}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
