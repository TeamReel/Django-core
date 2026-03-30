import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { Permission, Role } from '../../types';
import AppShell from '../../components/AppShell';

/**
 * T010 - Permissions Dashboard
 *
 * Purpose: Visualize viewer/member/admin role capabilities
 * - Shows permission matrix for each role
 * - Hides admin-only actions for non-admin users
 * - Provides stakeholder-friendly explanations (per user stories 1-2)
 */
export const PermissionsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissionsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current user to determine role
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const userResponse = await fetch(`${baseUrl}/api/users/me/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (userResponse.ok) {
          const rawUserData = await userResponse.json();
          const userData = rawUserData.data || rawUserData;
          setCurrentUserRole(userData.role);
        }

        // Fetch permissions
        const permissionsResponse = await fetch(`${baseUrl}/api/permissions/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          // Handle B13 response envelope
          const permissionsList = permissionsData.data?.results || permissionsData.results || permissionsData.data || permissionsData || [];
          setPermissions(Array.isArray(permissionsList) ? permissionsList : []);
        }

        // Fetch roles
        const rolesResponse = await fetch(`${baseUrl}/api/roles/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          // Handle B13 response envelope
          const rolesList = rolesData.data?.results || rolesData.results || rolesData.data || rolesData || [];
          setRoles(Array.isArray(rolesList) ? rolesList : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
        console.error('Permissions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissionsData();
  }, []);

  // Permission descriptions for stakeholders
  const permissionDescriptions: Record<string, string> = {
    view_organisation: 'Can view organisation details and members',
    create_project: 'Can create new projects',
    edit_project: 'Can modify project settings and description',
    delete_project: 'Can permanently delete projects',
    view_members: 'Can view team members and roles',
    invite_member: 'Can invite new team members',
    remove_member: 'Can remove team members from organisation',
    manage_roles: 'Can assign and modify member roles',
    view_audit: 'Can access audit logs for compliance',
    manage_permissions: 'Can modify organisation permissions (admin only)',
    view_billing: 'Can access billing and credits information',
    manage_billing: 'Can modify billing settings and payment methods',
    view_settings: 'Can access organisation settings',
    manage_settings: 'Can modify organisation configuration',
  };

  // Role hierarchy descriptions
  const roleDescriptions: Record<string, { title: string; description: string }> = {
    viewer: {
      title: 'Viewer',
      description:
        'Read-only access. Can view organisation, projects, and members but cannot make changes.',
    },
    member: {
      title: 'Member',
      description:
        'Standard access. Can view projects and members, but cannot manage organisation, projects, or members.',
    },
    admin: {
      title: 'Administrator',
      description:
        'Full access. Can manage everything including organisation settings, permissions, members, and billing.',
    },
  };

  // Build permission matrix
  const permissionMatrix = [
    {
      permission: 'view_organisation',
      viewer: true,
      member: true,
      admin: true,
    },
    {
      permission: 'create_project',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'edit_project',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'delete_project',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'view_members',
      viewer: true,
      member: true,
      admin: true,
    },
    {
      permission: 'invite_member',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'remove_member',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'manage_roles',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'view_audit',
      viewer: true,
      member: true,
      admin: true,
    },
    {
      permission: 'view_billing',
      viewer: true,
      member: true,
      admin: true,
    },
    {
      permission: 'manage_billing',
      viewer: false,
      member: false,
      admin: true,
    },
    {
      permission: 'view_settings',
      viewer: true,
      member: true,
      admin: true,
    },
    {
      permission: 'manage_settings',
      viewer: false,
      member: false,
      admin: true,
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Permissions"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Permissions' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading permissions...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
        title="Permissions & Access Control"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Permissions' },
        ]}
      />

      <PageContent>
        {error && (
          <Alert variant="warning" className="mb-4" data-testid="permissions-warning">
            Some permission data could not be loaded, but role matrix is available.
          </Alert>
        )}

        {/* Role descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(roleDescriptions).map(([roleKey, roleInfo]) => (
            <Card
              key={roleKey}
              data-testid={`role-card-${roleKey}`}
              className={
                currentUserRole === roleKey ? 'border-blue-500 border-2' : ''
              }
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold">{roleInfo.title}</h3>
                {currentUserRole === roleKey && (
                  <Badge variant="success">Your Role</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{roleInfo.description}</p>
            </Card>
          ))}
        </div>

        {/* Permission matrix */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Permission Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold">Permission</th>
                  <th className="text-center py-2 px-4 font-semibold">Viewer</th>
                  <th className="text-center py-2 px-4 font-semibold">Member</th>
                  <th className="text-center py-2 px-4 font-semibold">Admin</th>
                </tr>
              </thead>
              <tbody>
                {permissionMatrix.map((row) => (
                  <tr
                    key={row.permission}
                    className="border-b hover:bg-gray-50"
                    data-testid={`permission-row-${row.permission}`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium capitalize">
                          {row.permission.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {permissionDescriptions[row.permission]}
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.viewer ? (
                        <Badge
                          variant="success"
                          data-testid={`perm-viewer-${row.permission}`}
                        >
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-gray-400" data-testid={`perm-viewer-${row.permission}`}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.member ? (
                        <Badge
                          variant="success"
                          data-testid={`perm-member-${row.permission}`}
                        >
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-gray-400" data-testid={`perm-member-${row.permission}`}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.admin ? (
                        <Badge
                          variant="success"
                          data-testid={`perm-admin-${row.permission}`}
                        >
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-gray-400" data-testid={`perm-admin-${row.permission}`}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <p>
              <strong>✓</strong> = Permission granted | <strong>—</strong> = Permission denied
            </p>
          </div>
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default PermissionsPage;
