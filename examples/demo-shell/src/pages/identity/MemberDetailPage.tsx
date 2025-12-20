import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Alert,
  Badge,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

export const MemberDetailPage: React.FC = () => {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Use 'id' from params as orgId/slug
  const orgSlug = id;

  useEffect(() => {
    if (searchParams.get('action') === 'edit') {
      setIsEditing(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

        const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${memberId}/`, {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch member details');
        }

        const data = await response.json();
        setMember(data);
        setRole(data.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (orgSlug && memberId) {
        fetchMember();
    }
  }, [orgSlug, memberId]);

  const handleSave = async () => {
      try {
          setSaving(true);
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

          const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${memberId}/`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify({ role }),
          });

          if (!response.ok) {
              const data = await response.json();
              throw new Error(data.role?.[0] || data.detail || 'Failed to update member');
          }

          const data = await response.json();
          setMember(data);
          setIsEditing(false);
          alert('Member updated successfully');
      } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to update member');
      } finally {
          setSaving(false);
      }
  };

  if (loading) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Member Details"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: 'Loading...', current: true },
            ]}
          />
          <PageContent>
            <Card>Loading...</Card>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  if (error || !member) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Error"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: 'Error', current: true },
            ]}
          />
          <PageContent>
            <Alert type="error">{error || 'Member not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(`/organisations/${orgSlug}`)}>
                Back to Organisation
            </Button>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
          title={`${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email}
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Organisations', onClick: () => navigate('/organisations') },
            { label: member.organisation.name, onClick: () => navigate(`/organisations/${orgSlug}`) },
            { label: 'Member Details', current: true },
          ]}
          actions={
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(`/organisations/${orgSlug}`)}>
                    Back
                </Button>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        Edit Member
                    </Button>
                )}
            </div>
          }
        />
        <PageContent>
            <Card>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">User Information</h3>
                        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Full Name</label>
                                <div className="mt-1 text-sm text-gray-900">{member.user.first_name} {member.user.last_name}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Email</label>
                                <div className="mt-1 text-sm text-gray-900">{member.user.email}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">User ID</label>
                                <div className="mt-1 text-sm text-gray-900 font-mono">{member.user.id}</div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Membership Details</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Joined At</label>
                                <div className="mt-1 text-sm text-gray-900">{new Date(member.joined_at).toLocaleString()}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Invited By</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    {member.invited_by ? `${member.invited_by.first_name} ${member.invited_by.last_name}` : 'System / Creator'}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-2">Role</label>
                                {isEditing ? (
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                        <Button variant="secondary" onClick={() => {
                                            setIsEditing(false);
                                            setRole(member.role); // Reset role
                                        }}>
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{member.role}</Badge>
                                    </div>
                                )}
                                {isEditing && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Admins have full access to organisation settings and can manage members.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </PageContent>
      </div>
    </AppShell>
  );
};
