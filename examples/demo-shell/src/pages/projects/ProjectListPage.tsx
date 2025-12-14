import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
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
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context } = useContextSwitcher();

  useEffect(() => {
    if (!orgSlug) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    fetch(`${apiBaseUrl}/api/organisations/${orgSlug}/projects/`, {
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
        setProjects(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [orgSlug]);

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' 
        }}>
          {projects.map(project => (
            <div
              key={project.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <h3 style={{ marginTop: 0 }}>{project.name}</h3>
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
                <p style={{ color: '#666', fontSize: '14px' }}>{project.description}</p>
              )}
              <Link
                to={`/organisations/${orgSlug}/projects/${project.slug}`}
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
