import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Badge,
  Alert,
  Button,
  Input,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { User } from '../../types';
import AppShell from '../../components/AppShell';
import { api, ApiError } from '../../api';
import styles from './ProfilePage.module.css';

/**
 * T011 - Profile Page
 *
 * Purpose: Display and edit user profile
 * - Shows user name, email, role, last login
 * - Allows editing first_name and last_name
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const actualUser = await api.get<User>('/auth/me/');

        setUser(actualUser);
        setFirstName(actualUser.first_name || '');
        setLastName(actualUser.last_name || '');
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          setError('Not authenticated. Please log in.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        }
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);

      const updatedUser = await api.patch<User>('/auth/profile/', {
        first_name: firstName,
        last_name: lastName,
      });

      setUser(updatedUser);
      setFirstName(updatedUser.first_name || '');
      setLastName(updatedUser.last_name || '');
      setSaveSuccess(true);
      setIsEditing(false);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Profile', current: true },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center p-32 text-muted">
              Loading profile...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
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
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Profile', current: true },
        ]}
        actions={
          <button
            onClick={() => navigate('/users')}
            className={styles.backButton}
          >
            Back to Users
          </button>
        }
      />

      <PageContent>
        {saveSuccess && (
          <Alert variant="success" className="mb-16">
            Profile updated successfully!
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-16">
            {error}
          </Alert>
        )}

        {/* Profile Information Card */}
        <Card data-testid="profile-info-card">
          <div className="flex-between mb-16">
            <h3 className="fs-16 fw-600 m-0 text-primary">
              Profile Information
            </h3>
            {!isEditing ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <div className={styles.editActions}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFirstName(user?.first_name || '');
                    setLastName(user?.last_name || '');
                    setError(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex-col gap-12">
            {isEditing ? (
              <>
                <div>
                  <Input
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Input
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label-muted mb-4">
                    First Name
                  </label>
                  <div className="fw-500 text-primary">
                    {user?.first_name || '—'}
                  </div>
                </div>
                <div>
                  <label className="label-muted mb-4">
                    Last Name
                  </label>
                  <div className="fw-500 text-primary">
                    {user?.last_name || '—'}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label-muted mb-4">
                Full Name
              </label>
              <div className="fw-500 text-primary" data-testid="profile-name">
                {user.name || user.email}
              </div>
            </div>
            <div>
              <label className="label-muted mb-4">
                Email
              </label>
              <div className="fw-500 text-primary" data-testid="profile-email">
                {user.email}
              </div>
            </div>
            <div>
              <label className="label-muted mb-4">
                System Role
              </label>
              <div data-testid="profile-role-badge">
                <Badge variant="default">
                  {user.role || 'User'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="label-muted mb-4">
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
        <Card className="mt-16">
          <h3 className="fs-16 fw-600 mb-16 text-primary">
            Account Information
          </h3>
          <div className="flex-col gap-12">
            <div>
              <label className="label-muted mb-4">
                User ID
              </label>
              <div className={`fw-500 text-primary fs-14 ${styles.userId}`} data-testid="profile-user-id">
                {user.id}
              </div>
            </div>
            {user.created_at && (
              <div>
                <label className="label-muted mb-4">
                  Member Since
                </label>
                <div className="fw-500 text-primary" data-testid="profile-created-at">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
            {user.last_login && (
              <div>
                <label className="label-muted mb-4">
                  Last Login
                </label>
                <div className="fw-500 text-primary" data-testid="profile-last-login">
                  {new Date(user.last_login).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </Card>
      </PageContent>
    </>
  );
};

export default ProfilePage;
