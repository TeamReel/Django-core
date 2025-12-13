import { useState } from 'react';
import { ListDetail } from '@django-core/page-templates';

// Mock projects data
const projects = [
  { id: 1, name: 'Website Redesign', status: 'active', members: 5 },
  { id: 2, name: 'Mobile App', status: 'planning', members: 3 },
  { id: 3, name: 'API Integration', status: 'active', members: 4 },
  { id: 4, name: 'Marketing Campaign', status: 'completed', members: 6 },
  { id: 5, name: 'Database Migration', status: 'active', members: 2 },
];

export default function ListDetailDemo() {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div style={{ height: 'calc(100vh - 80px)' }}>
      <ListDetail
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
        loading={loading}
        isEmpty={filteredProjects.length === 0}
      >
        <ListDetail.List
          showSearch
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search projects..."
        >
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer',
                background: selectedId === project.id ? '#eff6ff' : 'white',
                borderLeft: selectedId === project.id ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {project.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {project.status} • {project.members} members
              </div>
            </div>
          ))}
        </ListDetail.List>

        <ListDetail.Detail>
          {selectedProject ? (
            <div style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {selectedProject.name}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      background: selectedProject.status === 'active' ? '#dcfce7' : '#e0e7ff',
                      color: selectedProject.status === 'active' ? '#166534' : '#3730a3',
                    }}
                  >
                    {selectedProject.status}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {selectedProject.members} team members
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Project Details
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Description
                    </div>
                    <div>
                      This is a sample project description. In a real app, this would contain
                      detailed information about the project goals, timeline, and deliverables.
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Progress
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: '65%',
                            height: '100%',
                            background: '#3b82f6',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>65%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Actions
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: '#3b82f6',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Edit Project
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    View Team
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              Select a project to view details
            </div>
          )}
        </ListDetail.Detail>
      </ListDetail>
    </div>
  );
}
