/**
 * SignInForm - Email/password form for user authentication.
 *
 * Features:
 * - Client-side validation (email format, password min length)
 * - Loading states with disabled inputs
 * - Field-level and form-level error display
 * - Uses F01 Design System components (Input, Button, Alert)
 *
 * @example
 * ```tsx
 * <SignInForm
 *   onSuccess={(user) => console.log('Signed in:', user)}
 *   forgotPasswordUrl="/forgot-password"
 * />
 * ```
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { useSignIn } from '../../hooks/useSignIn';
import type { User } from '../../types';

// TODO: Import from @teamreel/design-system when available
// For now, using placeholder interfaces matching F01 spec
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
  'aria-describedby'?: string;
}

interface ButtonProps {
  type: 'submit' | 'button';
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

interface AlertProps {
  variant: 'error' | 'warning' | 'info' | 'success';
  children: React.ReactNode;
  role?: string;
  'aria-live'?: 'polite' | 'assertive';
}

// Placeholder components - will be replaced with actual F01 imports
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
      <span
        style={{ display: 'block', marginTop: '0.25rem', color: 'red', fontSize: '0.875rem' }}
        role="alert"
      >
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
    {loading ? 'Signing in...' : children}
  </button>
);

const Alert: React.FC<AlertProps> = ({ variant, children, ...props }) => (
  <div
    {...props}
    style={{
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      backgroundColor: variant === 'error' ? '#fee' : '#e0f7fa',
      border: `1px solid ${variant === 'error' ? '#fcc' : '#b2ebf2'}`,
      borderRadius: '4px',
      color: variant === 'error' ? '#c33' : '#00796b',
    }}
  >
    {children}
  </div>
);

export interface SignInFormProps {
  /**
   * Callback on successful sign-in.
   */
  onSuccess?: (user: User) => void;

  /**
   * Callback on sign-in error.
   */
  onError?: (error: Error) => void;

  /**
   * URL for "Forgot password?" link.
   */
  forgotPasswordUrl?: string;

  /**
   * Additional CSS class name.
   */
  className?: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

/**
 * Email validation regex - basic format check.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimum password length per security requirements.
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * SignInForm component.
 */
export const SignInForm: React.FC<SignInFormProps> = ({
  onSuccess,
  onError,
  forgotPasswordUrl,
  className,
}) => {
  const { signIn, isLoading, error: apiError, clearError } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  /**
   * Validate email field.
   */
  const validateEmail = useCallback((value: string): string | undefined => {
    if (!value) {
      return 'Email is required';
    }
    if (!EMAIL_REGEX.test(value)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  }, []);

  /**
   * Validate password field.
   */
  const validatePassword = useCallback((value: string): string | undefined => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    return undefined;
  }, []);

  /**
   * Handle email change.
   */
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);
      clearError();

      if (touched.email) {
        const error = validateEmail(value);
        setValidationErrors((prev) => ({ ...prev, email: error }));
      }
    },
    [touched.email, validateEmail, clearError]
  );

  /**
   * Handle password change.
   */
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPassword(value);
      clearError();

      if (touched.password) {
        const error = validatePassword(value);
        setValidationErrors((prev) => ({ ...prev, password: error }));
      }
    },
    [touched.password, validatePassword, clearError]
  );

  /**
   * Handle field blur - mark as touched and validate.
   */
  const handleEmailBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setValidationErrors((prev) => ({ ...prev, email: error }));
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, password: true }));
    const error = validatePassword(password);
    setValidationErrors((prev) => ({ ...prev, password: error }));
  }, [password, validatePassword]);

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ email: true, password: true });

      // Validate all fields
      const emailError = validateEmail(email);
      const passwordError = validatePassword(password);

      if (emailError || passwordError) {
        setValidationErrors({
          email: emailError,
          password: passwordError,
        });
        return;
      }

      // Clear validation errors
      setValidationErrors({});

      try {
        const user = await signIn(email, password);
        onSuccess?.(user);
      } catch (err) {
        onError?.(err as Error);
      }
    },
    [email, password, validateEmail, validatePassword, signIn, onSuccess, onError]
  );

  // Combine field errors from validation and API
  const emailError = validationErrors.email || apiError?.fieldErrors?.email?.[0];
  const passwordError = validationErrors.password || apiError?.fieldErrors?.password?.[0];
  const formErrors = apiError?.formErrors || [];

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {/* Form-level errors */}
      {formErrors.length > 0 && (
        <Alert variant="error" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Email field */}
      <Input
        id="sign-in-email"
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleEmailBlur}
        error={emailError}
        disabled={isLoading}
        required
        autoComplete="email"
        aria-describedby={emailError ? 'sign-in-email-error' : undefined}
      />

      {/* Password field */}
      <Input
        id="sign-in-password"
        name="password"
        type="password"
        label="Password"
        value={password}
        onChange={handlePasswordChange}
        onBlur={handlePasswordBlur}
        error={passwordError}
        disabled={isLoading}
        required
        autoComplete="current-password"
        aria-describedby={passwordError ? 'sign-in-password-error' : undefined}
      />

      {/* Forgot password link */}
      {forgotPasswordUrl && (
        <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
          <a
            href={forgotPasswordUrl}
            style={{ color: '#0070f3', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Forgot password?
          </a>
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" loading={isLoading} disabled={isLoading}>
        Sign In
      </Button>
    </form>
  );
};
