import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
}

export default function ProjectDetailPage() {
  const { orgSlug, projectSlug } = useParams<{ orgSlug: string; projectSlug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context, switchProject } = useContextSwitcher();

  useEffect(() => {
    if (!orgSlug || !projectSlug) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    fetch(`${apiBaseUrl}/api/organisations/${orgSlug}/projects/${projectSlug}/`, {
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
        await switchProject(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [orgSlug, projectSlug, switchProject]);

  if (isLoading) return <AppShell><p>Loading project...</p></AppShell>;

  if (error) {
    return (
      <AppShell>
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
        <Link to={`/organisations/${orgSlug}/projects`}>Back to Projects</Link>
      </AppShell>
    );
  }

  if (!project) return <AppShell><p>Project not found</p></AppShell>;

  return (
    <AppShell>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
          <Link to="/organisations">Organisations</Link> /
          {context.organisation && (
            <>
              {' '}<Link to={`/organisations/${context.organisation.slug}`}>
                {context.organisation.name}
              </Link>
            </>
          )}
          {' '}/ <Link to={`/organisations/${orgSlug}/projects`}>Projects</Link> / {project.name}
        </nav>

        <h1>{project.name}</h1>

        {project.status && (
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: project.status === 'active' ? '#d4edda' : '#f8d7da',
            color: project.status === 'active' ? '#155724' : '#721c24',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            {project.status}
          </span>
        )}

        {project.description && (
          <p style={{ color: '#666', marginTop: '16px', marginBottom: '24px' }}>
            {project.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <Link
            to={`/organisations/${orgSlug}/projects`}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            ← Back to Projects
          </Link>
          <Link
            to={`/organisations/${orgSlug}`}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            View Organisation
          </Link>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '24px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2>Project Details</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <strong>Name:</strong> {project.name}
            </div>
            <div>
              <strong>Slug:</strong> <code style={{ 
                backgroundColor: '#fff', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>{project.slug}</code>
            </div>
            <div>
              <strong>ID:</strong> <code style={{ 
                backgroundColor: '#fff', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>{project.id}</code>
            </div>
            {project.created_at && (
              <div>
                <strong>Created:</strong> {new Date(project.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
