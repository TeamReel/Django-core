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
      setField('validationError', 'Wachtwoorden komen niet overeen');
      return;
    }

    if (fields.password.length < 8) {
      setField('validationError', 'Wachtwoord moet minimaal 8 tekens bevatten');
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
      <h1>Account aanmaken</h1>
      <p>Maak een TeamReel account aan</p>

        <form onSubmit={handleSubmit} className={`flex-col mt-32 ${styles.form}`}>
        {displayError && (
          <div className={`p-10 rounded-4 ${styles.errorBox}`}>
            {displayError}
          </div>
        )}

        <div className="flex-row gap-10">
          <div className="flex-1">
            <label htmlFor="firstName" className={`block fw-500 ${styles.label}`}>
              Voornaam
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="Voornaam"
              value={fields.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              className={`w-full p-10 rounded-4 fs-16 ${firstNameError ? styles.inputError : styles.input}`}
            />
            {firstNameError && <div className="fs-12 text-error">{firstNameError}</div>}
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className={`block fw-500 ${styles.label}`}>
              Achternaam
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Achternaam"
              value={fields.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              className={`w-full p-10 rounded-4 fs-16 ${lastNameError ? styles.inputError : styles.input}`}
            />
            {lastNameError && <div className="fs-12 text-error">{lastNameError}</div>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className={`block fw-500 ${styles.label}`}>
            E-mailadres
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
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            placeholder="Wachtwoord (min. 8 tekens)"
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
            Wachtwoord bevestigen
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Bevestig wachtwoord"
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
          {isLoading ? 'Account aanmaken...' : 'Account aanmaken'}
        </button>
      </form>

      <p className={`fs-14 text-center mt-20 ${styles.footerText}`}>
        Al een account? <Link to="/login" className={`text-decoration-none ${styles.footerLink}`}>Log hier in</Link>
      </p>
    </div>
  );
}
