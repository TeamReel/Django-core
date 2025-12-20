import { useEffect, useState } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { createApiClient } from '@django-core/api-client';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';

interface BackendPermissionsData {
  global: string[];
  organizations: {
    [key: string]: {
      name: string;
      permissions: string[];
      projects: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
  };
}

export default function PermissionsStatusPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const [permissions, setPermissions] = useState<BackendPermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const client = createApiClient({ baseUrl: apiBaseUrl });

    const fetchPermissions = async () => {
      try {
        const response = await client.get<BackendPermissionsData>('/api/v1/permissions/current/');

        if (response.error) {
          throw new Error(response.error.message || 'API request failed');
        }

        if (response.data) {
          setPermissions(response.data);
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Permissions fetch error:', err);
        setError(err.message || 'Failed to fetch permissions');
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [context.organisation, context.project]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '24px' }}>
          <h1>Permissions Status</h1>
          <p>Loading permissions data...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div style={{ padding: '24px' }}>
          <h1>Permissions Status</h1>
          <div style={{
            padding: '16px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c2c7',
            borderRadius: '4px',
            color: '#842029'
          }}>
            <strong>❌ Error:</strong> Unable to fetch permissions ({error})
          </div>
        </div>
      </AppShell>
    );
  }

  const renderPermissionList = (perms: string[], title: string) => {
    if (!perms || perms.length === 0) {
      return (
        <p style={{ fontSize: '14px', color: '#666' }}>
          No {title.toLowerCase()} permissions defined
        </p>
      );
    }

    return (
      <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
        {perms.map((perm, index) => (
          <li key={index} style={{
            padding: '8px 12px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#198754',
              marginRight: '12px'
            }}></span>
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{perm}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper to get current context permissions
  const getCurrentOrgPermissions = () => {
    if (!permissions || !context.organisation) return null;
    // Find org by ID (backend uses UUID as key)
    const orgData = permissions.organizations[context.organisation.id];
    return orgData;
  };

  const getCurrentProjectPermissions = () => {
    const orgData = getCurrentOrgPermissions();
    if (!orgData || !context.project) return null;

    const projectData = orgData.projects[context.project.id];
    return projectData;
  };

  const currentOrgData = getCurrentOrgPermissions();
  const currentProjectData = getCurrentProjectPermissions();

  return (
    <AppShell>
      <div style={{ padding: '24px' }}>
        <h1>Permissions Status</h1>

        {/* User Info */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d7ff',
          borderRadius: '4px'
        }}>
          <h2 style={{ marginTop: 0, fontSize: '18px' }}>Current User</h2>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            <strong>Email:</strong> {user?.email}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            <strong>User ID:</strong> {user?.id}
          </p>
          {context.organisation && (
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Organisation:</strong> {context.organisation.name}
            </p>
          )}
          {context.project && (
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Project:</strong> {context.project.name}
            </p>
          )}
        </div>

        {/* Global Permissions */}
        <div style={{ marginBottom: '32px' }}>
          <h2>Global Permissions</h2>
          <div style={{
            padding: '16px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            {renderPermissionList(permissions?.global || [], 'Global')}
          </div>
        </div>

        {/* Organisation Permissions */}
        {context.organisation && (
          <div style={{ marginBottom: '32px' }}>
            <h2>
              Organisation Permissions: {context.organisation.name}
            </h2>
            <div style={{
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              {currentOrgData ? (
                renderPermissionList(currentOrgData.permissions, 'Organisation')
              ) : (
                 <p style={{ fontSize: '14px', color: '#666' }}>
                  No permissions found for this organisation (ID: {context.organisation.id})
                </p>
              )}
            </div>
          </div>
        )}

        {/* Project Permissions */}
        {context.project && (
          <div style={{ marginBottom: '32px' }}>
            <h2>
              Project Permissions: {context.project.name}
            </h2>
            <div style={{
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              {currentProjectData ? (
                renderPermissionList(currentProjectData.permissions, 'Project')
              ) : (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  No permissions found for this project (ID: {context.project.id})
                </p>
              )}
            </div>
          </div>
        )}

        {/* Context Warning */}
        {!context.organisation && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            marginTop: '24px'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              <strong>Note:</strong> Select an organisation using the context switcher to see organisation and project permissions.
            </p>
          </div>
        )}

        {/* Debug Info */}
        <div style={{ marginTop: '48px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
            <details>
                <summary style={{ cursor: 'pointer', color: '#666' }}>Raw Permissions Data</summary>
                <pre style={{
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px'
                }}>
                    {JSON.stringify(permissions, null, 2)}
                </pre>
            </details>
        </div>
      </div>
    </AppShell>
  );
}
