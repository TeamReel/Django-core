import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { usePermissions } from '@django-core/permissions';
import { canEditProject, canDeleteProject } from '../../utils/permissions';
import { AuditLogTable } from '../../components/AuditLog/AuditLogTable';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed';

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
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
  functional_role?: string;
  created_at?: string;
}

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context, switchProject, organisations } = useContextSwitcher();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'activity'>('overview');
  const [memberFilter, setMemberFilter] = useState<'all' | 'admin' | 'player' | 'staff'>('all');
  const [displayLimit, setDisplayLimit] = useState(10);

  // Permission checks
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || (user as any)?.role === 'Superadmin';
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

    // Fetch project details
    fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/projects/${projectId}/`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
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

        // Fetch members
        return fetch(`${apiBaseUrl}/api/v1/projects/${data.id}/members/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      })
      .then(res => res.json())
      .then(membersData => {
        setMembers(membersData.results || membersData);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [orgId, projectId]);

  // Filter members based on role
  useEffect(() => {
    let filtered = members;

    if (memberFilter === 'admin') {
      filtered = members.filter(m =>
        m.role?.toLowerCase().includes('admin') ||
        m.role?.toLowerCase().includes('manager')
      );
    } else if (memberFilter === 'player') {
      filtered = members.filter(m =>
        m.functional_role?.toLowerCase().includes('player') ||
        m.functional_role?.toLowerCase().includes('keeper') ||
        m.functional_role?.toLowerCase().includes('speler')
      );
    } else if (memberFilter === 'staff') {
      filtered = members.filter(m =>
        m.functional_role?.toLowerCase().includes('coach') ||
        m.functional_role?.toLowerCase().includes('trainer') ||
        m.functional_role?.toLowerCase().includes('assistent')
      );
    }

    setFilteredMembers(filtered);
    setDisplayLimit(10); // Reset limit when filter changes
  }, [members, memberFilter]);

  if (isLoading) return <p>Loading project...</p>;

  if (error) {
    return (
      <>
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
      </>
    );
  }

  if (!project) return <p>Project not found</p>;

  const isClub = !project.parent;
  const displayedMembers = filteredMembers.slice(0, displayLimit);

  return (
    <>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
          <Link to="/federations">Federations</Link>
          {orgId && orgName && (
            <>
              {' '}/ <Link to={`/organisations/${orgId}`}>{orgName}</Link>
            </>
          )}
          {' '}/ <Link to={`/organisations/${orgId}/projects`}>Projects</Link> / {project.name}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h1 style={{ color: 'var(--app-text)', margin: 0 }}>{project.name}</h1>
          {project.status && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              border: '1px solid var(--app-border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              {project.status}
            </span>
          )}
          <span style={{
            padding: '4px 12px',
            backgroundColor: isClub ? '#e3f2fd' : '#f3e5f5',
            color: isClub ? '#1976d2' : '#7b1fa2',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {isClub ? '🏢 Club' : '⚽ Team'}
          </span>
        </div>

        {project.description && (
          <p style={{ color: 'var(--app-muted-text)', marginTop: '8px', marginBottom: '24px' }}>
            {project.description}
          </p>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--app-border)',
          marginBottom: '32px'
        }}>
          {['overview', 'roster', 'activity'].map((tab) => (
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

        {activeTab === 'overview' && (
          <>
            <div style={{
              border: '1px solid var(--app-border)',
              borderRadius: '8px',
              padding: '24px',
              backgroundColor: 'var(--app-surface)',
              marginBottom: '24px'
            }}>
              <h2 style={{ marginTop: 0, color: 'var(--app-text)' }}>Details</h2>
              <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
                <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Name:</dt>
                <dd style={{ margin: 0, color: 'var(--app-text)' }}>{project.name}</dd>

                <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Slug:</dt>
                <dd style={{ margin: 0, fontFamily: 'monospace', color: 'var(--app-text)' }}>{project.slug}</dd>

                <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Type:</dt>
                <dd style={{ margin: 0, color: 'var(--app-text)' }}>{isClub ? 'Club' : 'Team'}</dd>

                <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Members:</dt>
                <dd style={{ margin: 0, color: 'var(--app-text)' }}>{members.length}</dd>

                {project.created_at && (
                  <>
                    <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Created:</dt>
                    <dd style={{ margin: 0, color: 'var(--app-text)' }}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </dd>
                  </>
                )}
              </dl>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Link
                  to={`/organisations/${orgId}/projects`}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    border: '1px solid var(--app-border)'
                  }}
                >
                  ← Back to Projects
                </Link>

                {userCanEdit && (
                  <button
                    onClick={() => alert('Edit functionality not yet implemented')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0056b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>

            <ActivityFeed projectId={project.id} title="Recent Activity" limit={10} />
          </>
        )}

        {activeTab === 'roster' && (
          <div>
            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All', count: members.length },
                { key: 'admin', label: 'Admins', count: members.filter(m => m.role?.toLowerCase().includes('admin')).length },
                { key: 'player', label: 'Players', count: members.filter(m => m.functional_role?.toLowerCase().includes('player') || m.functional_role?.toLowerCase().includes('speler')).length },
                { key: 'staff', label: 'Staff', count: members.filter(m => m.functional_role?.toLowerCase().includes('coach') || m.functional_role?.toLowerCase().includes('trainer')).length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setMemberFilter(key as any)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: memberFilter === key ? '#0056b3' : 'var(--app-surface-2)',
                    color: memberFilter === key ? 'white' : 'var(--app-text)',
                    border: memberFilter === key ? 'none' : '1px solid var(--app-border)',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: memberFilter === key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Members Grid */}
            {filteredMembers.length === 0 ? (
              <p style={{ color: 'var(--app-muted-text)', padding: '40px', textAlign: 'center' }}>
                No {memberFilter !== 'all' ? memberFilter + 's' : 'members'} found.
              </p>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {displayedMembers.map(member => (
                    <div
                      key={member.id}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--app-surface)',
                        border: '1px solid var(--app-border)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--app-surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'var(--app-text)'
                        }}>
                          {(member.user.first_name?.[0] || member.user.email[0]).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--app-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {member.user.first_name && member.user.last_name
                              ? `${member.user.first_name} ${member.user.last_name}`
                              : member.user.email}
                          </h4>
                          <p style={{
                            margin: 0,
                            fontSize: '13px',
                            color: 'var(--app-muted-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {member.role && (
                          <span style={{
                            padding: '3px 8px',
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}>
                            {member.role}
                          </span>
                        )}
                        {member.functional_role && (
                          <span style={{
                            padding: '3px 8px',
                            backgroundColor: '#f3e5f5',
                            color: '#7b1fa2',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}>
                            {member.functional_role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {filteredMembers.length > displayLimit && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 20)}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: 'var(--app-surface-2)',
                        color: 'var(--app-text)',
                        border: '1px solid var(--app-border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Load More ({filteredMembers.length - displayLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <AuditLogTable projectId={project.id} />
        )}
      </div>
    </>
  );
}
