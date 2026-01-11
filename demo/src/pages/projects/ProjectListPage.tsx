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
  // New API fields
  member_count?: number;
  seasons_count?: number;
  matches_count?: number;
  parent_id?: string | null;
  parent_name?: string | null;
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

    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/clubs/`, {
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
          <Link to="/federations">Organisations</Link>
          {orgId && orgName && (
            <>
              {' '}/ <Link to={`/federations/${orgId}`}>
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

        {!isLoading && !error && projects.length === 0 && (
          <DefaultEmpty
            title="No projects found"
            message="This organisation doesn't have any projects yet. Create your first project to get started."
          />
        )}

        {/* Group projects by parent (Club -> Teams) */}
        {!isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Render Root Projects (Clubs) */}
            {projects.filter(p => !p.parent_id).map(club => {
              const teams = projects.filter(p => p.parent_id === club.id);

              return (
                <div
                  key={club.id}
                  style={{
                    border: '1px solid var(--app-border)',
                    borderRadius: '8px',
                    padding: '24px',
                    backgroundColor: 'var(--app-surface)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '20px' }}>{club.name}</h3>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#666',
                          backgroundColor: '#eee',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>CLUB</span>
                      </div>
                      {club.description && (
                        <p style={{ color: 'var(--app-muted-text)', fontSize: '14px', marginTop: '8px', marginBottom: '0' }}>{club.description}</p>
                      )}
                    </div>
                    <div>
                       <Link
                        to={`/federations/${orgId}/clubs/${club.slug || club.id}`}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--app-primary, #007bff)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        Manage Club
                      </Link>
                    </div>
                  </div>

                  {/* Club Stats */}
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#555', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
                     <div><strong>{teams.length}</strong> Teams</div>
                     <div><strong>{club.member_count ?? 0}</strong> Direct Members</div>
                  </div>

                  {/* Teams Grid */}
                  {teams.length > 0 ? (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#888', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>Active Teams</h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '12px'
                      }}>
                        {teams.map(team => (
                          <div
                            key={team.id}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: 'rgba(0,0,0,0.02)',
                              border: '1px solid var(--app-border)',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                               <Link
                                 to={`/federations/${orgId}/clubs/${team.slug || team.id}`}
                                 style={{ fontWeight: 600, color: 'var(--app-text)', textDecoration: 'none', display: 'block' }}
                               >
                                 {team.name}
                               </Link>
                               <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                 {team.seasons_count ?? 0} Seasons • {team.matches_count ?? 0} Matches
                               </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text)' }}>{team.member_count ?? 0}</div>
                               <div style={{ fontSize: '10px', color: '#888' }}>PLAYERS</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '16px', fontStyle: 'italic', color: '#888', fontSize: '14px' }}>
                      No teams created for this club yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
