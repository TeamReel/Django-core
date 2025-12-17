import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  Button,
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import { User } from '../../types';

/**
 * T011 - Profile Page
 *
 * Purpose: Display current user info and roles
 * - Shows user name, email, role, last login
 * - Links to preferences page
 * - Read-only view (editing handled in preferences)
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

        const response = await fetch('/api/users/me/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile (${response.status})`);
        }

        const userData: User = await response.json();
        setUser(userData);
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
      <div>
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Profile' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading profile...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Profile' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="profile-error">
            {error || 'Could not load profile'}
          </Alert>
        </PageContent>
      </div>
    );
  }

  const roleDescriptions: Record<string, string> = {
    viewer: 'Read-only access to organisation data',
    member: 'Can create and edit projects',
    admin: 'Full administrative access',
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Profile' },
        ]}
      />

      <PageContent>
        {/* User information card */}
        <Card className="mb-6" data-testid="profile-info-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" data-testid="profile-name">
                {user.name}
              </h2>
              <p className="text-gray-600" data-testid="profile-email">
                {user.email}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/preferences')}
              data-testid="profile-preferences-button"
            >
              Edit Preferences
            </Button>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Role */}
              <div>
                <div className="text-sm text-gray-600 font-semibold mb-2">Role</div>
                <Badge
                  variant="primary"
                  data-testid="profile-role-badge"
                >
                  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                </Badge>
                <p className="text-xs text-gray-500 mt-2">
                  {roleDescriptions[user.role || 'member']}
                </p>
              </div>

              {/* Status */}
              <div>
                <div className="text-sm text-gray-600 font-semibold mb-2">Status</div>
                <Badge
                  variant={user.is_active ? 'success' : 'warning'}
                  data-testid="profile-status-badge"
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Last login */}
              <div>
                <div className="text-sm text-gray-600 font-semibold mb-2">
                  Last Active
                </div>
                <p data-testid="profile-last-login">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* User metadata */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">User ID</span>
              <span className="font-mono text-sm" data-testid="profile-user-id">
                {user.id}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Member Since</span>
              <span data-testid="profile-created-at">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Last Updated</span>
              <span data-testid="profile-updated-at">
                {user.updated_at
                  ? new Date(user.updated_at).toLocaleString()
                  : '-'}
              </span>
            </div>
          </div>
        </Card>

        {/* Help section */}
        <Alert type="info" className="mt-6" data-testid="profile-help">
          <strong>Need to change your password or security settings?</strong> Visit
          your preferences page to update your account settings.
        </Alert>
      </PageContent>
    </div>
  );
};

export default ProfilePage;
