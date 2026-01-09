import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { usePermissions } from '@django-core/permissions';
import AppShell from '../../components/AppShell';
import { canEditProject, canDeleteProject } from '../../utils/permissions';
import { MemberList } from '../../components/ProjectAccessControl/MemberList';
import { AuditLogViewer } from '../../components/ProjectAccessControl/AuditLogViewer';

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
}

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context, switchProject, organisations } = useContextSwitcher();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'activity'>('details');

  // Permission checks using centralized helper
  const isSuperAdmin = (user as any)?.role === 'superadmin';
  const currentOrgSlug = (orgId || context.organisation?.slug)?.toLowerCase();
  const currentOrg = organisations.find(o => o.slug?.toLowerCase() === currentOrgSlug);
  const permissionContext = {
    currentOrganisation: currentOrg as any,
    isSuperAdmin,
  };
  const userCanEdit = canEditProject(permissionContext);
  const userCanDelete = canDeleteProject(permissionContext);

  // Fetch organisation name
  useEffect(() => {
    if (!orgId) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setOrgName(data.name))
      .catch(() => setOrgName('Organisation'));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !projectId) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/projects/${projectId}/`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
      })
      .then(async data => {
        setProject(data);
        if (switchProject) {
          await switchProject(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [orgId, projectId]); // Remove switchProject from dependencies to prevent infinite loop

  if (isLoading) return <AppShell><p>Loading project...</p></AppShell>;

  if (error) {
    return (
      <AppShell>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--app-surface-2)',
          border: '1px solid #bd2130',
          borderRadius: '4px',
          color: '#dc3545',
          marginBottom: '16px'
        }}>
          {error}
        </div>
        <Link to={`/organisations/${orgId}/projects`}>Back to Projects</Link>
      </AppShell>
    );
  }

  if (!project) return <AppShell><p>Project not found</p></AppShell>;

  return (
    <AppShell>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
          <Link to="/organisations">Organisations</Link>
          {orgId && orgName && (
            <>
              {' '}/ <Link to={`/organisations/${orgId}`}>
                {orgName}
              </Link>
            </>
          )}
          {' '}/ <Link to={`/organisations/${orgId}/projects`}>Projects</Link> / {project.name}
        </nav>

        <h1 style={{ color: 'var(--app-text)' }}>{project.name}</h1>

        {project.status && (
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: 'var(--app-surface-2)',
            color: 'var(--app-text)',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            {project.status}
          </span>
        )}

        {project.description && (
          <p style={{ color: 'var(--app-muted-text)', marginTop: '16px', marginBottom: '24px' }}>
            {project.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <Link
            to={`/organisations/${orgId}/projects`}
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--app-border)'
            }}
          >
            ← Back to Projects
          </Link>
          <Link
            to={`/organisations/${orgId}`}
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #0056b3'
            }}
          >
            View Organisation
          </Link>

          {/* Permission-gated action buttons */}
          {userCanEdit && hasPermission('projects.update', {
            organizationId: context.organisation?.id?.toString(),
            projectId: project.id
          }) && (
            <button
              onClick={() => alert('Edit functionality not yet implemented')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--app-surface)',
                color: 'var(--app-text)',
                border: '1px solid #0056b3',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ✏️ Edit Project
            </button>
          )}

          {userCanDelete && hasPermission('projects.delete', {
            organizationId: context.organisation?.id?.toString(),
            projectId: project.id
          }) && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                  alert('Delete functionality not yet implemented');
                }
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--app-surface)',
                color: 'var(--app-text)',
                border: '1px solid #bd2130',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Project
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--app-border)', marginBottom: '24px', display: 'flex', gap: '24px' }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'details' ? '2px solid #0056b3' : '2px solid transparent',
              color: activeTab === 'details' ? '#0056b3' : 'var(--app-muted-text)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'members' ? '2px solid #0056b3' : '2px solid transparent',
              color: activeTab === 'members' ? '#0056b3' : 'var(--app-muted-text)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'activity' ? '2px solid #0056b3' : '2px solid transparent',
              color: activeTab === 'activity' ? '#0056b3' : 'var(--app-muted-text)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Activity
          </button>
        </div>

        {activeTab === 'details' && (
          <div style={{
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            padding: '24px',
            backgroundColor: 'var(--app-surface)'
          }}>
            <h2 style={{ color: 'var(--app-text)' }}>Project Details</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <strong style={{ color: 'var(--app-muted-text)' }}>Name:</strong> <span style={{ color: 'var(--app-text)' }}>{project.name}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--app-muted-text)' }}>Slug:</strong> <code style={{
                  backgroundColor: 'var(--app-surface-2)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  color: 'var(--app-text)'
                }}>{project.slug}</code>
              </div>
              <div>
                <strong style={{ color: 'var(--app-muted-text)' }}>ID:</strong> <code style={{
                  backgroundColor: 'var(--app-surface-2)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  color: 'var(--app-text)'
                }}>{project.id}</code>
              </div>
              {project.created_at && (
                <div>
                  <strong style={{ color: 'var(--app-muted-text)' }}>Created:</strong> <span style={{ color: 'var(--app-text)' }}>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <MemberList projectId={project.id} />
        )}

        {activeTab === 'activity' && (
          <AuditLogViewer projectId={project.id} />
        )}
      </div>
    </AppShell>
  );
}
