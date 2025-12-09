/**
 * @fileoverview ConfirmPasswordResetForm component
 * Provides password reset confirmation with token validation
 */

import React, { useState } from 'react';
import { useConfirmPasswordReset } from '../../hooks';

// F01 placeholder component interfaces
interface InputProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface ButtonProps {
  type: 'submit' | 'button';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface AlertProps {
  variant: 'success' | 'error';
  className?: string;
  children: React.ReactNode;
}

// F01 placeholder components (temporary until design system ready)
const Input: React.FC<InputProps> = ({ label, error, ...props }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
      {label}
      {props.required && <span style={{ color: 'red' }}> *</span>}
    </label>
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.5rem',
        border: error ? '1px solid red' : '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1rem',
      }}
    />
    {error && <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</div>}
  </div>
);

const Button: React.FC<ButtonProps> = ({ loading, children, ...props }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    style={{
      width: '100%',
      padding: '0.75rem',
      backgroundColor: props.disabled || loading ? '#ccc' : '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? 'Processing...' : children}
  </button>
);

const Alert: React.FC<AlertProps> = ({ variant, children, className }) => (
  <div
    className={className}
    role="alert"
    style={{
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '4px',
      backgroundColor: variant === 'success' ? '#d4edda' : '#f8d7da',
      color: variant === 'success' ? '#155724' : '#721c24',
      border: `1px solid ${variant === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
    }}
  >
    {children}
  </div>
);

/**
 * Password validation regex
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

/**
 * Validation errors structure
 */
interface ValidationErrors {
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * ConfirmPasswordResetForm component props
 */
export interface ConfirmPasswordResetFormProps {
  /** UID in base64 from reset URL */
  uidb64: string;
  /** Reset token from URL */
  token: string;
  /** Optional callback on successful password reset */
  onSuccess?: () => void;
  /** Optional callback on error */
  onError?: (error: Error) => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * ConfirmPasswordResetForm component
 *
 * Provides password reset confirmation with:
 * - Password strength validation
 * - Password confirmation matching
 * - Token-based reset submission
 * - Success state with sign-in link
 *
 * @example
 * ```tsx
 * <ConfirmPasswordResetForm
 *   uidb64="abc123"
 *   token="xyz789"
 *   onSuccess={() => navigate('/auth/login')}
 * />
 * ```
 */
export const ConfirmPasswordResetForm: React.FC<ConfirmPasswordResetFormProps> = ({
  uidb64,
  token,
  onSuccess,
  onError,
  className,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<{ newPassword: boolean; confirmPassword: boolean }>({
    newPassword: false,
    confirmPassword: false,
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const { confirmReset, isLoading, error, success } = useConfirmPasswordReset();

  /**
   * Validate password strength
   */
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!PASSWORD_REGEX.test(password)) {
      return 'Password must include uppercase, lowercase, number, and special character';
    }
    return undefined;
  };

  /**
   * Validate password confirmation
   */
  const validateConfirmPassword = (password: string, confirm: string): string | undefined => {
    if (!confirm) {
      return 'Please confirm your password';
    }
    if (password !== confirm) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  /**
   * Handle password blur - validate on blur
   */
  const handlePasswordBlur = () => {
    setTouched({ ...touched, newPassword: true });
    const passwordError = validatePassword(newPassword);
    setValidationErrors({ ...validationErrors, newPassword: passwordError });
  };

  /**
   * Handle confirm password blur - validate on blur
   */
  const handleConfirmPasswordBlur = () => {
    setTouched({ ...touched, confirmPassword: true });
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    setValidationErrors({ ...validationErrors, confirmPassword: confirmError });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ newPassword: true, confirmPassword: true });

    // Validate all fields
    const errors: ValidationErrors = {};
    const passwordError = validatePassword(newPassword);
    if (passwordError) errors.newPassword = passwordError;

    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    try {
      await confirmReset(uidb64, token, newPassword);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (onError) {
        onError(err as Error);
      }
    }
  };

  // Success state - show success message with sign-in link
  if (success) {
    return (
      <div className={className}>
        <Alert variant="success">
          Password reset successful!{' '}
          <a href="/auth/login" style={{ color: '#155724', textDecoration: 'underline' }}>
            Sign in now
          </a>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Form-level error from API */}
        {error?.formErrors && error.formErrors.length > 0 && (
          <Alert variant="error">{error.formErrors.join(', ')}</Alert>
        )}

        {/* New password field */}
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onBlur={handlePasswordBlur}
          error={
            touched.newPassword && validationErrors.newPassword
              ? validationErrors.newPassword
              : error?.fieldErrors?.new_password?.[0]
          }
          disabled={isLoading}
          required
        />

        {/* Confirm password field */}
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={handleConfirmPasswordBlur}
          error={
            touched.confirmPassword && validationErrors.confirmPassword
              ? validationErrors.confirmPassword
              : error?.fieldErrors?.confirm_password?.[0]
          }
          disabled={isLoading}
          required
        />

        {/* Submit button */}
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          Reset Password
        </Button>

        {/* Back to sign in link */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/auth/login" style={{ color: '#007bff', textDecoration: 'none' }}>
            Back to sign in
          </a>
        </div>
      </form>
    </div>
  );
};
