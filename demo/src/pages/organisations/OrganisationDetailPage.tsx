import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';

interface Organisation {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

interface Project {
  id: string;
  slug: string;
  name: string;
  parent?: string | null;
}

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  role?: string;
}

export default function OrganisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clubs' | 'teams'>('overview');
  const { switchContext } = useContextSwitcher();

  useEffect(() => {
    if (!id) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // Fetch organisation details
    fetch(`${apiBaseUrl}/api/v1/organisations/${id}/`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch organisation');
        return res.json();
      })
      .then(async data => {
        setOrganisation(data);
        await switchContext(data);

        // Fetch projects for this organisation
        return fetch(`${apiBaseUrl}/api/v1/organisations/${data.slug}/projects/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      })
      .then(res => res.json())
      .then(projectsData => {
        setProjects(projectsData.results || projectsData);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <AppShell>
        <p>Loading organisation...</p>
      </AppShell>
    );
  }

  if (error || !organisation) {
    return (
      <AppShell>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--app-surface-2)',
          border: '1px solid #bd2130',
          borderRadius: '4px',
          color: '#dc3545'
        }}>
          {error || 'Organisation not found'}
        </div>
        <Link to="/organisations" style={{ display: 'inline-block', marginTop: '16px' }}>
          ← Back to Organisations
        </Link>
      </AppShell>
    );
  }

  // Split projects into clubs (parent=null) and teams (has parent)
  const clubs = projects.filter(p => !p.parent);
  const teams = projects.filter(p => p.parent);

  return (
    <AppShell>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
          <Link to="/organisations">Federations</Link> / {organisation.name}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <h1 style={{ color: 'var(--app-text)', margin: 0 }}>{organisation.name}</h1>
          <span style={{
            padding: '4px 12px',
            backgroundColor: 'var(--app-surface-2)',
            color: 'var(--app-muted-text)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            {clubs.length} clubs • {teams.length} teams
          </span>
        </div>

        {organisation.description && (
          <p style={{ color: 'var(--app-muted-text)', fontSize: '16px', marginBottom: '32px' }}>
            {organisation.description}
          </p>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--app-border)',
          marginBottom: '32px'
        }}>
          {['overview', 'clubs', 'teams'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: activeTab === tab ? 'var(--app-text)' : 'var(--app-muted-text)',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0056b3' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: activeTab === tab ? 600 : 400,
                transition: 'all 0.2s',
                marginBottom: '-2px',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div style={{
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            padding: '24px',
            backgroundColor: 'var(--app-surface)'
          }}>
            <h2 style={{ marginTop: 0, color: 'var(--app-text)' }}>Federation Details</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
              <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Name:</dt>
              <dd style={{ margin: 0, color: 'var(--app-text)' }}>{organisation.name}</dd>

              <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Slug:</dt>
              <dd style={{ margin: 0, fontFamily: 'monospace', color: 'var(--app-text)' }}>{organisation.slug}</dd>

              <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Clubs:</dt>
              <dd style={{ margin: 0, color: 'var(--app-text)' }}>{clubs.length}</dd>

              <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Teams:</dt>
              <dd style={{ margin: 0, color: 'var(--app-text)' }}>{teams.length}</dd>

              <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>ID:</dt>
              <dd style={{ margin: 0, fontFamily: 'monospace', color: 'var(--app-text)' }}>{organisation.id}</dd>
            </dl>

            <Link
              to={`/organisations/${organisation.slug}/projects`}
              style={{
                display: 'inline-block',
                marginTop: '24px',
                padding: '10px 20px',
                backgroundColor: '#0056b3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              View All Projects →
            </Link>
          </div>
        )}

        {activeTab === 'clubs' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {clubs.length === 0 ? (
                <p style={{ color: 'var(--app-muted-text)' }}>No clubs found in this federation.</p>
              ) : (
                clubs.map(club => (
                  <Link
                    key={club.id}
                    to={`/organisations/${organisation.slug}/projects/${club.slug}`}
                    style={{
                      display: 'block',
                      padding: '20px',
                      backgroundColor: 'var(--app-surface)',
                      border: '1px solid var(--app-border)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'var(--app-text)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{club.name}</h3>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: 'var(--app-muted-text)',
                      fontFamily: 'monospace'
                    }}>
                      {club.slug}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            {teams.length === 0 ? (
              <p style={{ color: 'var(--app-muted-text)' }}>No teams found.</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px'
              }}>
                {teams.map(team => {
                  const parentClub = clubs.find(c => c.id === team.parent);
                  return (
                    <Link
                      key={team.id}
                      to={`/organisations/${organisation.slug}/projects/${team.slug}`}
                      style={{
                        display: 'block',
                        padding: '16px',
                        backgroundColor: 'var(--app-surface)',
                        border: '1px solid var(--app-border)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: 'var(--app-text)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0056b3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--app-border)';
                      }}
                    >
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{team.name}</h4>
                      {parentClub && (
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '13px',
                          color: 'var(--app-muted-text)'
                        }}>
                          {parentClub.name}
                        </p>
                      )}
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--app-muted-text)',
                        fontFamily: 'monospace'
                      }}>
                        {team.slug}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
