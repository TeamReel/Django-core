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
    <div className="p-20" style={{ maxWidth: '400px', margin: '100px auto' }}>
      <h1>Create Account</h1>
      <p>Sign up for a new Django Core-App account</p>

      <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '15px', marginTop: '30px' }}>
        {displayError && (
          <div className="p-10 rounded-4" style={{ backgroundColor: '#fee', border: '1px solid #fcc', color: '#c00' }}>
            {displayError}
          </div>
        )}

        {/* Debug: Show full error object */}
        {error && (
          <div className="p-10 rounded-4 fs-12" style={{ backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
            <details>
              <summary>Debug Error Info</summary>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </details>
          </div>
        )}

        <div className="flex-row gap-10">
          <div className="flex-1">
            <label htmlFor="firstName" className="block fw-500" style={{ marginBottom: '5px' }}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-10 rounded-4 fs-16"
              style={{ border: firstNameError ? '1px solid #f00' : '1px solid #ccc' }}
            />
            {firstNameError && <div className="fs-12" style={{ color: '#f00' }}>{firstNameError}</div>}
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block fw-500" style={{ marginBottom: '5px' }}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-10 rounded-4 fs-16"
              style={{ border: lastNameError ? '1px solid #f00' : '1px solid #ccc' }}
            />
            {lastNameError && <div className="fs-12" style={{ color: '#f00' }}>{lastNameError}</div>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block fw-500" style={{ marginBottom: '5px' }}>
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
            className="w-full p-10 rounded-4 fs-16"
            style={{ border: emailError ? '1px solid #f00' : '1px solid #ccc' }}
          />
          {emailError && <div className="fs-12" style={{ color: '#f00' }}>{emailError}</div>}
        </div>

        <div>
          <label htmlFor="password" className="block fw-500" style={{ marginBottom: '5px' }}>
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
            className="w-full p-10 rounded-4 fs-16"
            style={{ border: passwordError ? '1px solid #f00' : '1px solid #ccc' }}
          />
          {passwordError && <div className="fs-12" style={{ color: '#f00' }}>{passwordError}</div>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block fw-500" style={{ marginBottom: '5px' }}>
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
            className="w-full p-10 rounded-4 fs-16"
            style={{ border: '1px solid #ccc' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="p-12 border-none rounded-4 fs-16 fw-500"
          style={{
            backgroundColor: isLoading ? '#ccc' : 'var(--app-success)',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="fs-14 text-center" style={{ marginTop: '20px', color: '#666' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--app-primary)', textDecoration: 'none' }}>Sign in here</Link>
      </p>
    </div>
  );
}
