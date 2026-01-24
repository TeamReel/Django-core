import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canPerformAction, PermissionContext } from '../../utils/permissions';

interface Organisation {
  id: string;
  slug: string;
  name: string;
  description?: string;
  user_role?: 'admin' | 'member';
  metadata?: {
    type?: string;
    country?: string;
    [key: string]: any;
  };
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

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: '',
    country: ''
  });
  const [saveError, setSaveError] = useState<string | null>(null);

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
      <p>Loading organisation...</p>
    );
  }

  if (error || !organisation) {
    return (
      <>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--app-surface-2)',
          border: '1px solid #bd2130',
          borderRadius: '4px',
          color: '#dc3545'
        }}>
          {error || 'Organisation not found'}
        </div>
        <Link to="/federations" style={{ display: 'inline-block', marginTop: '16px' }}>
          ← Back to Organisations
        </Link>
      </>
    );
  }

  // Split projects into clubs (parent=null) and teams (has parent)
  const clubs = projects.filter(p => !p.parent);
  const teams = projects.filter(p => p.parent);

  // Permission context for edit check
  const permissionContext: PermissionContext = {
    currentOrganisation: organisation || undefined,
    isSuperAdmin: false,
  };
  const canEdit = organisation && canPerformAction('update', 'organisation', permissionContext);

  // Handle edit mode toggle
  const handleEditClick = () => {
    if (!organisation) return;
    setEditFormData({
      name: organisation.name || '',
      type: organisation.metadata?.type || '',
      country: organisation.metadata?.country || ''
    });
    setSaveError(null);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!organisation) return;

    setIsSaving(true);
    setSaveError(null);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${organisation.slug}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          metadata: {
            ...organisation.metadata,
            type: editFormData.type || undefined,
            country: editFormData.country || undefined
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.name?.[0] || 'Failed to update organisation');
      }

      const updatedOrg = await response.json();
      setOrganisation(updatedOrg);
      setIsEditMode(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
          <Link to="/federations">Federations</Link> / {organisation.name}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: 'var(--app-text)' }}>Federation Details</h2>
              {!isEditMode && canEdit && (
                <button
                  onClick={handleEditClick}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0056b3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003d82'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                >
                  Edit
                </button>
              )}
            </div>

            {saveError && (
              <div style={{
                padding: '12px',
                backgroundColor: '#ffeef0',
                border: '1px solid #f5c2c7',
                borderRadius: '4px',
                color: '#dc3545',
                marginBottom: '16px'
              }}>
                {saveError}
              </div>
            )}

            {!isEditMode ? (
              // Read mode
              <>
                <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
                  <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Name:</dt>
                  <dd style={{ margin: 0, color: 'var(--app-text)' }}>{organisation.name}</dd>

                  <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Type:</dt>
                  <dd style={{ margin: 0, color: 'var(--app-text)' }}>
                    {organisation.metadata?.type || <span style={{ color: 'var(--app-muted-text)', fontStyle: 'italic' }}>Not set</span>}
                  </dd>

                  <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Country:</dt>
                  <dd style={{ margin: 0, color: 'var(--app-text)' }}>
                    {organisation.metadata?.country || <span style={{ color: 'var(--app-muted-text)', fontStyle: 'italic' }}>Not set</span>}
                  </dd>

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
              </>
            ) : (
              // Edit mode
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: 'var(--app-text)'
                    }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--app-surface)',
                        color: 'var(--app-text)',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter organisation name"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: 'var(--app-text)'
                    }}>
                      Type
                    </label>
                    <input
                      type="text"
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--app-surface)',
                        color: 'var(--app-text)',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., Federation, League, Association"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: 'var(--app-text)'
                    }}>
                      Country
                    </label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--app-surface)',
                        color: 'var(--app-text)',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., Netherlands, Germany, England"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editFormData.name.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isSaving ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isSaving || !editFormData.name.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSaving || !editFormData.name.trim() ? 0.6 : 1,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving && editFormData.name.trim()) {
                        e.currentTarget.style.backgroundColor = '#218838';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving && editFormData.name.trim()) {
                        e.currentTarget.style.backgroundColor = '#28a745';
                      }
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      color: 'var(--app-text)',
                      border: '1px solid var(--app-border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.6 : 1,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
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
                  const parentClubSlugOrId = (parentClub as any)?.slug || (parentClub as any)?.id || team.parent;
                  const teamSlugOrId = (team as any)?.slug || (team as any)?.id;
                  return (
                    <Link
                      key={team.id}
                      to={`/organisations/${organisation.slug}/projects/${parentClubSlugOrId}/teams/${teamSlugOrId}`}
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
    </>
  );
}
