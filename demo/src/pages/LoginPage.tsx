import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignIn, useAuth } from '@django-core/auth-ui';

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
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Django Core-App Demo</h1>
      <p>Log in to access the demo shell</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>
            {error.formErrors[0] || 'Login failed. Please try again.'}
          </div>
        )}

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
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
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
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
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '12px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>Quick Login (Demo Accounts)</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
          Test different roles with football-themed data (5 leagues, 25 clubs, ~280 users)
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            { label: '👑 Super Admin', email: 'admin@teamreel.demo', desc: 'Full System Access', pass: 'Basis123.' },
            { label: '�🇱 League Admin', email: 'jan.de jong@knvb.demo', desc: 'Federation - KNVB', pass: 'Basis123.' },
            { label: '👔 Club Director', email: 'directeur@ajax.demo', desc: 'Club - Ajax', pass: 'Basis123.' },
            { label: '📋 Team Manager', email: 'coach@ajax1.demo', desc: 'Team - Ajax 1', pass: 'Basis123.' },
            { label: '🏃 Team Player', email: 'player@ajax1.demo', desc: 'Squad - Ajax 1', pass: 'Basis123.' },
            { label: '👀 Supporter', email: 'supporter1@ajax.demo', desc: 'Fan - Ajax', pass: 'Basis123.' },
          ].map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.pass);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>{account.label}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{account.desc}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{account.email}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '12px', fontStyle: 'italic' }}>
          All passwords: Basis123.
        </p>
      </div>

      <p style={{ marginTop: '15px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
        Don't have an account? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Create one here</Link>
      </p>
    </div>
  );
}
