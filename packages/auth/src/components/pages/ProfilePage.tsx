import React from 'react';
import { ProfileForm } from '../forms/ProfileForm';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useSignOut } from '../../hooks/useSignOut';

/**
 * ProfilePage component for viewing and editing user profile.
 *
 * Features:
 * - Displays ProfileForm for updating first_name and last_name
 * - Shows email as read-only with note about verification requirement
 * - Placeholder for future password change feature
 * - Redirects unauthenticated users (or shows loading)
 *
 * @example
 * ```tsx
 * <ProfilePage />
 * ```
 */
export const ProfilePage: React.FC = () => {
  const user = useCurrentUser();
  const { signOut, loading: signingOut } = useSignOut();

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '2rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: 0 }}>Profile</h1>
          <button
            onClick={() => signOut()}
            disabled={signingOut}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: signingOut ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: signingOut ? 'not-allowed' : 'pointer',
            }}
          >
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>

        <ProfileForm />

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Email</h2>
          <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>{user.email}</p>
          <small style={{ color: '#666', fontSize: '0.875rem' }}>
            Email updates require verification - coming soon
          </small>
        </div>

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Password</h2>
          <small style={{ color: '#666', fontSize: '0.875rem' }}>
            Password change - coming soon
          </small>
        </div>
      </div>
    </div>
  );
};
