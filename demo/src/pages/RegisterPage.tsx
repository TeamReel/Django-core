import { useEffect } from 'react';
import type React from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSignUp, useAuth } from '@django-core/auth-ui';
import { routes } from '../routes';
import { logger } from '@/utils/logger';
import { useFormFields } from '@/hooks/useFormFields';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const { fields, setField } = useFormFields({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    validationError: '',
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { signUp, isLoading, error } = useSignUp();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const next = searchParams.get('next');
      navigate(next || routes.dashboard());
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setField('validationError', '');

    // Client-side validation
    if (fields.password !== fields.confirmPassword) {
      setField('validationError', 'Passwords do not match');
      return;
    }

    if (fields.password.length < 8) {
      setField('validationError', 'Password must be at least 8 characters long');
      return;
    }

    try {
      await signUp(fields.email, fields.password, fields.firstName, fields.lastName);
    } catch (err) {
      // Error is already handled by useSignUp hook
      logger.error('Registration failed', err);
    }
  };

  const displayError = fields.validationError || (error?.formErrors?.[0]) || '';

  // Show field-specific errors
  const emailError = error?.fieldErrors?.email?.[0] || '';
  const passwordError = error?.fieldErrors?.password?.[0] || '';
  const firstNameError = error?.fieldErrors?.first_name?.[0] || '';
  const lastNameError = error?.fieldErrors?.last_name?.[0] || '';

  return (
    <div className={`p-20 max-w-400 mx-auto ${styles.container}`}>
      <h1>Create Account</h1>
      <p>Sign up for a new Django Core-App account</p>

        <form onSubmit={handleSubmit} className={`flex-col mt-32 ${styles.form}`}>
        {displayError && (
          <div className={`p-10 rounded-4 ${styles.errorBox}`}>
            {displayError}
          </div>
        )}

        <div className="flex-row gap-10">
          <div className="flex-1">
            <label htmlFor="firstName" className={`block fw-500 ${styles.label}`}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="First name"
              value={fields.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              className={`w-full p-10 rounded-4 fs-16 ${firstNameError ? styles.inputError : styles.input}`}
            />
            {firstNameError && <div className="fs-12 text-error">{firstNameError}</div>}
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className={`block fw-500 ${styles.label}`}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={fields.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              className={`w-full p-10 rounded-4 fs-16 ${lastNameError ? styles.inputError : styles.input}`}
            />
            {lastNameError && <div className="fs-12 text-error">{lastNameError}</div>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className={`block fw-500 ${styles.label}`}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={(e) => setField('email', e.target.value)}
            required
            autoComplete="email"
            className={`w-full p-10 rounded-4 fs-16 ${emailError ? styles.inputError : styles.input}`}
          />
          {emailError && <div className="fs-12 text-error">{emailError}</div>}
        </div>

        <div>
          <label htmlFor="password" className={`block fw-500 ${styles.label}`}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Password (min 8 characters)"
            value={fields.password}
            onChange={(e) => setField('password', e.target.value)}
            required
            autoComplete="new-password"
            className={`w-full p-10 rounded-4 fs-16 ${passwordError ? styles.inputError : styles.input}`}
          />
          {passwordError && <div className="fs-12 text-error">{passwordError}</div>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={`block fw-500 ${styles.label}`}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm password"
            value={fields.confirmPassword}
            onChange={(e) => setField('confirmPassword', e.target.value)}
            required
            autoComplete="new-password"
            className={`w-full p-10 rounded-4 fs-16 ${styles.input}`}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`p-12 border-none rounded-4 fs-16 fw-500 text-white ${isLoading ? styles.submitButtonDisabled : styles.submitButton}`}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className={`fs-14 text-center mt-20 ${styles.footerText}`}>
        Already have an account? <Link to="/login" className={`text-decoration-none ${styles.footerLink}`}>Sign in here</Link>
      </p>
    </div>
  );
}
