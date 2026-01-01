import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { useContextSwitcher } from '@django-core/context-switcher';
import { DefaultEmpty } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
}

export default function ProjectListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { context } = useContextSwitcher();
  const [orgName, setOrgName] = useState<string>('');

  // Fetch organisation name first
  useEffect(() => {
    if (!orgId) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setOrgName(data.name))
      .catch(() => setOrgName('Organisation'));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/projects/`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
      })
      .then(data => {
        // Handle both paginated (DRF) and non-paginated responses
        let projectsList = data;
        if (data.results && Array.isArray(data.results)) {
          projectsList = data.results;
        }
        setProjects(projectsList);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [orgId]);

  return (
    <AppShell>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
          <Link to="/organisations">Organisations</Link>
          {orgId && orgName && (
            <>
              {' '}/ <Link to={`/organisations/${orgId}`}>
                {orgName}
              </Link>
            </>
          )}
          {' '}/ Projects
        </nav>

        <h1>Projects</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Select a project to view its details and resources.
        </p>

        {isLoading && <p>Loading projects...</p>}

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <DefaultEmpty
            title="No projects found"
            message="This organisation doesn't have any projects yet. Create your first project to get started."
          />
        )}

        <div style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'
        }}>
          {projects.map(project => (
            <div
              key={project.id}
              style={{
                border: '1px solid var(--app-border)',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: 'var(--app-surface)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <h3 style={{ marginTop: 0, color: 'var(--app-text)' }}>{project.name}</h3>
              {project.status && (
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  backgroundColor: project.status === 'active' ? '#d4edda' : '#f8d7da',
                  color: project.status === 'active' ? '#155724' : '#721c24',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px'
                }}>
                  {project.status}
                </span>
              )}
              {project.description && (
                <p style={{ color: 'var(--app-muted-text)', fontSize: '14px' }}>{project.description}</p>
              )}
              <Link
                to={`/organisations/${orgId}/projects/${project.slug || project.id}`}
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
