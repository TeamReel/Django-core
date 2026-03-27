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
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
} from '../../shims/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { SkeletonDetailPage } from '../../components/Skeleton';
import { api } from '@/api';
import type { OrgMembershipListItem } from '@/types/api/organisation';
import { routes } from '../../routes';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/errorHelpers';
import styles from './MemberDetailPage.module.css';

/** Org member record from the members API */
interface OrgMemberRecord {
  id: string;
  user?: { first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export const MemberDetailPage: React.FC = () => {
  const { pushToast } = useToast();
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMemberRecord[]>([]);

  const { organisations, context } = useContextSwitcher();

  // Use 'id' from params as orgId/slug
  const orgSlug = id;

  const waitingForOrgContext = Boolean(id) && context.isLoading;

  // Find resolved organisation
  const resolvedOrg = organisations.find(o => o.slug === orgSlug || o.id === id);

  const {
    organisationOptions,
    userOptions,
    handleOrganisationSwitch,
    handleUserSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: orgMembers.map(m => ({
      id: m.id,
      username: `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || m.user?.email || 'Unknown',
      email: m.user?.email || '',
      slug: m.id, // Use member ID as slug
    })),
    context: {
      currentOrgId: resolvedOrg?.id || member?.organisation?.id,
      currentUserId: member?.id,
    },
    basePath: '',
  });

  // Debug logging

  useEffect(() => {
    if (searchParams.get('action') === 'edit') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Fetch org members for user switcher
  useEffect(() => {
    const fetchOrgMembers = async () => {
      if (waitingForOrgContext) return;
      if (!orgSlug) {
        return;
      }

      try {
        const { results } = await api.list<OrgMemberRecord>(`/organisations/${orgSlug}/members/`, { pageSize: 100 });
        setOrgMembers(results);
      } catch (err) {
        logger.debug('Failed to fetch org members for switcher', err);
      }
    };

    fetchOrgMembers();
  }, [orgSlug, waitingForOrgContext]);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);

        const data = await api.get<OrgMembershipListItem>(`/organisations/${orgSlug}/members/${memberId}/`);
        setMember(data);
        setRole(data.role);
      } catch (err) {
        logger.error('Member fetch error', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    if (orgSlug && memberId) {
        fetchMember();
    }
  }, [orgSlug, memberId, waitingForOrgContext]);

  // Guard: If we are in an org context (URL param) but context switcher hasn't loaded orgs yet, wait.
  if (waitingForOrgContext) {
    return (
      <div className="p-6">
        <SkeletonDetailPage tabCount={4} />
      </div>
    );
  }

  const handleSave = async () => {
      try {
          setSaving(true);

          const data = await api.patch<OrgMembershipListItem>(`/organisations/${orgSlug}/members/${memberId}/`, { role });
          setMember(data);
          setIsEditing(false);
      } catch (err) {
        logger.error('Failed to update member', err);
          pushToast({ message: getErrorMessage(err), type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  if (loading) {
    return <SkeletonDetailPage tabCount={4} />;
  }

  if (error || !member) {
    return (
      <>
        <div>
          <PageHeader
            title="Error"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/federations') },
              { label: 'Error', current: true },
            ]}
          />
          <PageContent>
            <Alert variant="error">{error || 'Member not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(routes.orgDetailLegacy({ orgId: orgSlug! }))}>
                Back to Organisation
            </Button>
          </PageContent>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <PageHeader
          title={`${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email}
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            {
              label: (
                <select
                  value="organisations"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'clubs') navigate('/clubs');
                    else if (value === 'users') navigate('/users');
                  }}
                  className={styles.breadcrumbSelect}
                >
                  <option value="organisations">Organisations</option>
                  <option value="clubs">Clubs</option>
                  <option value="users">Users</option>
                </select>
              ),
              current: false
            },
            {
              label: (
                <select
                  value={member.organisation.slug || member.organisation.id}
                  onChange={(e) => handleOrganisationSwitch({ id: e.target.value, label: '', slug: e.target.value })}
                  className={styles.breadcrumbSelect}
                >
                  {organisationOptions.map((org: { id: string; slug?: string; label: string }) => (
                    <option key={org.id} value={org.slug || org.id}>{org.label}</option>
                  ))}
                </select>
              ),
              current: false
            },
            {
              label: (
                <select
                  value={member.id}
                  onChange={(e) => {
                    navigate(routes.orgMemberDetail({ orgId: orgSlug!, memberId: e.target.value }));
                  }}
                  className={styles.breadcrumbSelect}
                >
                  {userOptions.map((u: { id: string; slug?: string; label: string }) => (
                    <option key={u.id} value={u.slug || u.id}>{u.label}</option>
                  ))}
                </select>
              ),
              current: true
            },
          ]}
          actions={
            <div className={styles.actions}>
                <Button variant="secondary" onClick={() => navigate(routes.orgDetailLegacy({ orgId: orgSlug! }))}>
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
                                    <div className={styles.editRow}>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className={styles.roleSelect}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
                                        </Button>
                                        <Button variant="secondary" onClick={() => {
                                            setIsEditing(false);
                                            setRole(member.role); // Reset role
                                        }}>
                                            Annuleren
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">{member.role}</Badge>
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
    </>
  );
};

export default MemberDetailPage;
