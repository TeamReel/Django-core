import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { User } from '../../types';
import AppShell from '../../components/AppShell';

/**
 * T011 - Profile Page
 *
 * Purpose: Display current user info and roles
 * - Shows user name, email, role, last login
 * - Read-only view
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        console.log('[ProfilePage] Fetching profile from:', `${apiBaseUrl}/api/v1/auth/me/`);
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/me/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        console.log('[ProfilePage] Response status:', response.status);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Not authenticated. Please log in.');
          }
          throw new Error(`Failed to fetch profile (${response.status})`);
        }

        const userData: User = await response.json();
        console.log('[ProfilePage] Raw API response:', userData);
        console.log('[ProfilePage] User data keys:', Object.keys(userData));

        // Handle B13 envelope if present
        const actualUser = (userData as any).data || userData;
        console.log('[ProfilePage] Parsed user:', actualUser);

        setUser(actualUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Profile', current: true },
          ]}
        />
        <PageContent>
          <Card>
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-muted-text)' }}>
              Loading profile...
            </div>
          </Card>
        </PageContent>
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell>
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Profile', current: true },
          ]}
        />
        <PageContent>
          <Alert variant="error" data-testid="profile-error">
            {error || 'Could not load profile'}
          </Alert>
        </PageContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Profile', current: true },
        ]}
        actions={
          <button
            onClick={() => navigate('/users')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Back to Users
          </button>
        }
      />

      <PageContent>
        {/* Profile Information Card */}
        <Card data-testid="profile-info-card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>
            Profile Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ fontWeight: 500, color: 'var(--app-text)' }} data-testid="profile-name">
                {user.name || user.email}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                Email
              </label>
              <div style={{ fontWeight: 500, color: 'var(--app-text)' }} data-testid="profile-email">
                {user.email}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                System Role
              </label>
              <div data-testid="profile-role-badge">
                <Badge variant="default">
                  {user.role || 'User'}
                </Badge>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                Status
              </label>
              <div data-testid="profile-status-badge">
                <Badge variant={user.is_active ? 'success' : 'warning'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Information Card */}
        <Card style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>
            Account Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                User ID
              </label>
              <div style={{ fontWeight: 500, color: 'var(--app-text)', fontFamily: 'monospace', fontSize: '14px' }} data-testid="profile-user-id">
                {user.id}
              </div>
            </div>
            {user.created_at && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                  Member Since
                </label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }} data-testid="profile-created-at">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
            {user.last_login && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>
                  Last Login
                </label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }} data-testid="profile-last-login">
                  {new Date(user.last_login).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </Card>
      </PageContent>
    </AppShell>
  );
};

export default ProfilePage;
