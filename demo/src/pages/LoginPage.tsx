import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { routes } from '../routes';
import { useSignIn, useAuth } from '@django-core/auth-ui';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { signIn, isLoading, error } = useSignIn();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const next = searchParams.get('next');
      navigate(next || routes.dashboard());
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className={`mx-auto p-20 ${styles.container}`}>
      <h1>Welkom bij TeamReel</h1>
      <p>Log in om verder te gaan</p>

        <form onSubmit={handleSubmit} className={`flex-col ${styles.form}`}>
        {error && (
          <div className={`rounded-4 ${styles.errorBox}`}>
            {error.formErrors[0] || 'Inloggen mislukt. Probeer het opnieuw.'}
          </div>
        )}

        <div>
          <label htmlFor="email" className={`block fw-500 ${styles.label}`}>
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="password" className={`block fw-500 ${styles.label}`}>
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`text-white rounded-4 fs-16 fw-500 ${styles.submitBtn}`}
          data-loading={isLoading ? '' : undefined}
        >
          {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
        </button>
      </form>

      <p className={`fs-14 text-muted text-center ${styles.registerPrompt}`}>
        Nog geen account? <Link to="/register" className={`text-decoration-none ${styles.registerLink}`}>Registreer hier</Link>
      </p>
    </div>
  );
}
