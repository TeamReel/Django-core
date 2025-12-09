import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { ApiError } from '../../types';

// TODO: Import from @teamreel/design-system when available
// For now, using placeholder interfaces matching F01 spec
interface InputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  helperText?: string;
}

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

// Placeholder components (will be replaced with @teamreel/design-system)
const Input: React.FC<InputProps> = ({ label, value, onChange, error, disabled, required, type = 'text', helperText }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
      {label} {required && <span style={{ color: 'red' }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      style={{
        width: '100%',
        padding: '0.5rem',
        border: error ? '1px solid red' : '1px solid #ccc',
        borderRadius: '4px',
      }}
    />
    {helperText && <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>{helperText}</small>}
    {error && <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</div>}
  </div>
);

const Button: React.FC<ButtonProps> = ({ type = 'button', loading, disabled, children, onClick }) => (
  <button
    type={type}
    disabled={disabled || loading}
    onClick={onClick}
    style={{
      padding: '0.5rem 1rem',
      backgroundColor: loading || disabled ? '#ccc' : '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? 'Loading...' : children}
  </button>
);

const Alert: React.FC<AlertProps> = ({ variant, children }) => {
  const colors = {
    success: '#d4edda',
    error: '#f8d7da',
    warning: '#fff3cd',
    info: '#d1ecf1',
  };
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        backgroundColor: colors[variant],
        border: `1px solid ${colors[variant]}`,
        borderRadius: '4px',
      }}
    >
      {children}
    </div>
  );
};

/**
 * ProfileForm component for updating user profile information.
 *
 * Features:
 * - Pre-populated with current user data
 * - Validates required fields (first_name, last_name, current_password)
 * - Shows success message after update
 * - Displays field-level and form-level errors
 * - Updates AuthContext automatically on success
 *
 * @example
 * ```tsx
 * <ProfileForm />
 * ```
 *
 * @security
 * - Requires current_password for all updates
 * - Clears password field on success
 * - Shows generic error for incorrect password
 */
export const ProfileForm: React.FC = () => {
  const user = useCurrentUser();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { mutate, loading, error, success } = useUpdateProfile();

  // Update form fields if user data changes (e.g., after initial auth)
  React.useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!firstName.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!lastName.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!currentPassword) {
      errors.current_password = 'Current password is required for verification';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    try {
      await mutate({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        current_password: currentPassword,
      });
      // Clear password field on success for security
      setCurrentPassword('');
    } catch (err) {
      // Error handled by hook - displayed via error state
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {success && (
        <Alert variant="success">
          Profile updated successfully
        </Alert>
      )}

      {error?.formErrors && error.formErrors.length > 0 && (
        <Alert variant="error">
          {error.formErrors.join(', ')}
        </Alert>
      )}

      <Input
        label="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        error={validationErrors.first_name || error?.fieldErrors.first_name?.[0]}
        disabled={loading}
        required
      />

      <Input
        label="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        error={validationErrors.last_name || error?.fieldErrors.last_name?.[0]}
        disabled={loading}
        required
      />

      <Input
        label="Current Password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={validationErrors.current_password || error?.fieldErrors.current_password?.[0]}
        disabled={loading}
        required
        helperText="Required to confirm changes"
      />

      <Button type="submit" loading={loading}>
        Update Profile
      </Button>
    </form>
  );
};
