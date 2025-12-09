/**
 * RequestPasswordResetForm - Email input form for requesting password reset.
 *
 * Features:
 * - Client-side email validation
 * - Generic success message (prevents email enumeration)
 * - Loading states with disabled inputs
 * - Uses F01 Design System components
 *
 * @example
 * ```tsx
 * <RequestPasswordResetForm
 *   onSuccess={() => console.log('Reset requested')}
 * />
 * ```
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { useRequestPasswordReset } from '../../hooks/useRequestPasswordReset';

// TODO: Import from @teamreel/design-system when available
interface InputProps {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

interface ButtonProps {
  type: 'submit' | 'button';
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  children: React.ReactNode;
  role?: string;
}

// Placeholder components
const Input: React.FC<InputProps> = ({ label, error, ...props }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label htmlFor={props.id} style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
      {label} {props.required && <span style={{ color: 'red' }}>*</span>}
    </label>
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.5rem',
        border: error ? '2px solid red' : '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1rem',
      }}
    />
    {error && (
      <span style={{ display: 'block', marginTop: '0.25rem', color: 'red', fontSize: '0.875rem' }} role="alert">
        {error}
      </span>
    )}
  </div>
);

const Button: React.FC<ButtonProps> = ({ children, loading, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled || loading}
    style={{
      width: '100%',
      padding: '0.75rem',
      backgroundColor: disabled || loading ? '#ccc' : '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? 'Sending...' : children}
  </button>
);

const Alert: React.FC<AlertProps> = ({ variant, children, ...props }) => {
  const colors = {
    error: { bg: '#fee', border: '#fcc', text: '#c33' },
    success: { bg: '#efe', border: '#cfc', text: '#3c3' },
    info: { bg: '#e0f7fa', border: '#b2ebf2', text: '#00796b' },
  };
  const style = colors[variant];

  return (
    <div
      {...props}
      style={{
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '4px',
        color: style.text,
      }}
    >
      {children}
    </div>
  );
};

export interface RequestPasswordResetFormProps {
  /**
   * Callback on successful request.
   */
  onSuccess?: () => void;

  /**
   * Callback on request error.
   */
  onError?: (error: Error) => void;

  /**
   * Additional CSS class name.
   */
  className?: string;
}

interface ValidationErrors {
  email?: string;
}

/**
 * Email validation regex.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generic success message to prevent email enumeration.
 */
const SUCCESS_MESSAGE = 'If that email exists, a password reset link has been sent. Check your inbox.';

/**
 * RequestPasswordResetForm component.
 */
export const RequestPasswordResetForm: React.FC<RequestPasswordResetFormProps> = ({
  onSuccess,
  onError,
  className,
}) => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { requestReset, isLoading, error, success } = useRequestPasswordReset();

  /**
   * Validate email field.
   */
  const validateEmail = useCallback((value: string): string | undefined => {
    if (!value) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Invalid email format';
    return undefined;
  }, []);

  /**
   * Handle field blur - validate and mark as touched.
   */
  const handleBlur = useCallback(() => {
    setTouched(true);
    const emailError = validateEmail(email);
    setValidationErrors({ email: emailError });
  }, [email, validateEmail]);

  /**
   * Handle email change - clear validation error for touched field.
   */
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (touched) {
        const emailError = validateEmail(e.target.value);
        setValidationErrors({ email: emailError });
      }
    },
    [touched, validateEmail]
  );

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate
      const emailError = validateEmail(email);
      if (emailError) {
        setValidationErrors({ email: emailError });
        setTouched(true);
        return;
      }

      setValidationErrors({});

      try {
        await requestReset(email);
        onSuccess?.();
      } catch (err) {
        onError?.(err as Error);
      }
    },
    [email, validateEmail, requestReset, onSuccess, onError]
  );

  // Show success message
  if (success) {
    return (
      <div className={className}>
        <Alert variant="success" role="status">
          {SUCCESS_MESSAGE}
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {error?.formErrors && error.formErrors.length > 0 && (
        <Alert variant="error" role="alert">
          {error.formErrors.join(', ')}
        </Alert>
      )}

      <Input
        id="reset-email"
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleBlur}
        error={validationErrors.email || error?.fieldErrors.email?.[0]}
        disabled={isLoading}
        required
        autoComplete="email"
      />

      <Button type="submit" loading={isLoading} disabled={isLoading || !!validationErrors.email}>
        Send Reset Link
      </Button>
    </form>
  );
};
