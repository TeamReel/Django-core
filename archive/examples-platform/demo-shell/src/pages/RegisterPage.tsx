import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignUp, useAuth } from '@django-core/auth-ui';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();

  const { signUp, isLoading, error } = useSignUp();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    try {
      await signUp(email, password, firstName, lastName);
    } catch (err) {
      // Error is already handled by useSignUp hook
      console.error('Registration failed:', err);
    }
  };

  const displayError = validationError || (error?.formErrors?.[0]) || '';

  // Show field-specific errors
  const emailError = error?.fieldErrors?.email?.[0] || '';
  const passwordError = error?.fieldErrors?.password?.[0] || '';
  const firstNameError = error?.fieldErrors?.first_name?.[0] || '';
  const lastNameError = error?.fieldErrors?.last_name?.[0] || '';

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Create Account</h1>
      <p>Sign up for a new Django Core-App account</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
        {displayError && (
          <div style={{ padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>
            {displayError}
          </div>
        )}

        {/* Debug: Show full error object */}
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
            <details>
              <summary>Debug Error Info</summary>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </details>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: '100%', padding: '10px', border: firstNameError ? '1px solid #f00' : '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
            />
            {firstNameError && <div style={{ color: '#f00', fontSize: '12px' }}>{firstNameError}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ width: '100%', padding: '10px', border: lastNameError ? '1px solid #f00' : '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
            />
            {lastNameError && <div style={{ color: '#f00', fontSize: '12px' }}>{lastNameError}</div>}
          </div>
        </div>

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', padding: '10px', border: emailError ? '1px solid #f00' : '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          {emailError && <div style={{ color: '#f00', fontSize: '12px' }}>{emailError}</div>}
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ width: '100%', padding: '10px', border: passwordError ? '1px solid #f00' : '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          {passwordError && <div style={{ color: '#f00', fontSize: '12px' }}>{passwordError}</div>}
        </div>

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '12px',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Sign in here</Link>
      </p>
    </div>
  );
}
