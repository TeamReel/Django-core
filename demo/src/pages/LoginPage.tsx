import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignIn, useAuth } from '@django-core/auth-ui';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const { signIn, isLoading, error } = useSignIn();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className={`mx-auto p-20 ${styles.container}`}>
      <h1>Django Core-App Demo</h1>
      <p>Log in to access the demo shell</p>

        <form onSubmit={handleSubmit} className={`flex-col ${styles.form}`}>
        {error && (
          <div className={`rounded-4 ${styles.errorBox}`}>
            {error.formErrors[0] || 'Login failed. Please try again.'}
          </div>
        )}

        <div>
          <label htmlFor="email" className={`block fw-500 ${styles.label}`}>
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="password" className={`block fw-500 ${styles.label}`}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Password"
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
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className={`fs-14 text-muted text-center ${styles.registerPrompt}`}>
        Don't have an account? <Link to="/register" className={`text-decoration-none ${styles.registerLink}`}>Create one here</Link>
      </p>
    </div>
  );
}
