import { useEffect, useState } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';

interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
  scope?: 'global' | 'organisation' | 'project';
}

interface PermissionsData {
  user_id: number;
  global_permissions: Permission[];
  organisation_permissions?: {
    org_id: number;
    org_name: string;
    permissions: Permission[];
  };
  project_permissions?: {
    project_id: number;
    project_name: string;
    permissions: Permission[];
  };
}

export default function PermissionsStatusPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/permissions/current/')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: PermissionsData) => {
        setPermissions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
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

  const renderPermissionTable = (perms: Permission[], title: string) => {
    if (!perms || perms.length === 0) {
      return (
        <p style={{ fontSize: '14px', color: '#666' }}>
          No {title.toLowerCase()} permissions defined
        </p>
      );
    }

    return (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Resource</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Scope</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Allowed</th>
          </tr>
        </thead>
        <tbody>
          {perms.map((perm, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '12px' }}>{perm.resource}</td>
              <td style={{ padding: '12px' }}>{perm.action}</td>
              <td style={{ padding: '12px' }}>{perm.scope || 'N/A'}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                {perm.allowed ? (
                  <span style={{ color: '#198754', fontWeight: 'bold' }}>✓ Yes</span>
                ) : (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>✗ No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

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
            <strong>User ID:</strong> {user?.id || permissions?.user_id}
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
            {renderPermissionTable(permissions?.global_permissions || [], 'Global')}
          </div>
        </div>

        {/* Organisation Permissions */}
        {permissions?.organisation_permissions && (
          <div style={{ marginBottom: '32px' }}>
            <h2>
              Organisation Permissions: {permissions.organisation_permissions.org_name}
            </h2>
            <div style={{
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              {renderPermissionTable(
                permissions.organisation_permissions.permissions || [],
                'Organisation'
              )}
            </div>
          </div>
        )}

        {/* Project Permissions */}
        {permissions?.project_permissions && (
          <div style={{ marginBottom: '32px' }}>
            <h2>
              Project Permissions: {permissions.project_permissions.project_name}
            </h2>
            <div style={{
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              {renderPermissionTable(
                permissions.project_permissions.permissions || [],
                'Project'
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
      </div>
    </AppShell>
  );
}
