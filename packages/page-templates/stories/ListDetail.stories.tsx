import type { Meta, StoryObj } from '@storybook/react';
import { ListDetail } from '../src/components/ListDetail';
import React from 'react';

const meta: Meta<typeof ListDetail> = {
  title: 'Templates/ListDetail',
  component: ListDetail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ListDetail>;

// Mock list item component
const ListItem = ({
  id,
  title,
  description,
  selected,
  onClick,
}: {
  id: string;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: '1rem',
      border: 'none',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: selected ? '#e3f2fd' : 'white',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }}
  >
    <div style={{ fontWeight: selected ? 600 : 400, marginBottom: '0.25rem' }}>{title}</div>
    <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>
  </button>
);

// Mock projects data
const projects = [
  { id: '1', title: 'E-Commerce Platform', description: 'Full-stack React + Node.js' },
  { id: '2', title: 'Mobile App', description: 'React Native cross-platform' },
  { id: '3', title: 'Dashboard Analytics', description: 'Data visualization with D3.js' },
  { id: '4', title: 'CMS System', description: 'Headless CMS with GraphQL' },
  { id: '5', title: 'API Gateway', description: 'Microservices architecture' },
];

/**
 * Basic List-Detail template with 5 items
 */
export const Basic: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>('1');
    const selectedProject = projects.find((p) => p.id === selectedId);

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          splitRatio={[1, 2]}
        >
          <ListDetail.List>
            {projects.map((project) => (
              <ListItem
                key={project.id}
                {...project}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </ListDetail.List>
          <ListDetail.Detail>
            {selectedProject ? (
              <div style={{ padding: '2rem' }}>
                <h1 style={{ marginTop: 0 }}>{selectedProject.title}</h1>
                <p style={{ color: '#666', marginBottom: '2rem' }}>
                  {selectedProject.description}
                </p>
                <h2>Details</h2>
                <p>
                  This is the detail view for <strong>{selectedProject.title}</strong>.
                  In a real application, this area would show comprehensive information
                  about the selected item.
                </p>
                <h2>Features</h2>
                <ul>
                  <li>Responsive design</li>
                  <li>Mobile-friendly layout</li>
                  <li>Keyboard navigation</li>
                  <li>Accessible markup</li>
                </ul>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Select a project from the list to view details
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
};

/**
 * List-Detail with loading states
 */
export const Loading: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>('2');

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
        >
          <ListDetail.List loading>
            {projects.map((project) => (
              <ListItem key={project.id} {...project} />
            ))}
          </ListDetail.List>
          <ListDetail.Detail loading>
            <div>Detail content</div>
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
};

/**
 * Empty list with custom action
 */
export const Empty: Story = {
  render: () => {
    return (
      <div style={{ height: '600px' }}>
        <ListDetail>
          <ListDetail.List isEmpty>
            <div>No items</div>
          </ListDetail.List>
          <ListDetail.Detail>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No project selected
            </div>
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
};

/**
 * Mobile overlay mode - detail slides over list
 */
export const MobileOverlay: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const selectedProject = projects.find((p) => p.id === selectedId);

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          mobileLayout="overlay"
        >
          <ListDetail.List>
            {projects.map((project) => (
              <ListItem
                key={project.id}
                {...project}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </ListDetail.List>
          <ListDetail.Detail
            showBackButton
            onBack={() => setSelectedId(null)}
          >
            {selectedProject ? (
              <div style={{ padding: '2rem' }}>
                <h1>{selectedProject.title}</h1>
                <p>{selectedProject.description}</p>
                <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '2rem' }}>
                  On mobile, the detail view slides over the list. Click the back button
                  to return to the list.
                </p>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Select an item from the list
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Mobile stack mode - list and detail stack vertically
 */
export const MobileStack: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>('3');
    const selectedProject = projects.find((p) => p.id === selectedId);

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          mobileLayout="stack"
        >
          <ListDetail.List>
            {projects.map((project) => (
              <ListItem
                key={project.id}
                {...project}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </ListDetail.List>
          <ListDetail.Detail>
            {selectedProject ? (
              <div style={{ padding: '1rem' }}>
                <h2 style={{ marginTop: 0 }}>{selectedProject.title}</h2>
                <p>{selectedProject.description}</p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  Stack mode shows list and detail stacked vertically. List takes 40% height,
                  detail takes 60%.
                </p>
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Select an item
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * List-Detail with search functionality
 */
export const WithSearch: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>('4');
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredProjects = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedProject = projects.find((p) => p.id === selectedId);

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
        >
          <ListDetail.List
            showSearch
            searchPlaceholder="Search projects..."
            onSearchChange={setSearchQuery}
            isEmpty={filteredProjects.length === 0}
          >
            {filteredProjects.map((project) => (
              <ListItem
                key={project.id}
                {...project}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </ListDetail.List>
          <ListDetail.Detail>
            {selectedProject ? (
              <div style={{ padding: '2rem' }}>
                <h1>{selectedProject.title}</h1>
                <p style={{ color: '#666' }}>{selectedProject.description}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '2rem' }}>
                  Try searching for "React", "API", or "Mobile" in the search bar above.
                </p>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Select a project to view details
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
};

/**
 * Custom split ratio (1:3 - narrow list, wide detail)
 */
export const CustomSplit: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>('5');
    const selectedProject = projects.find((p) => p.id === selectedId);

    return (
      <div style={{ height: '600px' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          splitRatio={[1, 3]}
          listMinWidth={250}
        >
          <ListDetail.List>
            {projects.map((project) => (
              <ListItem
                key={project.id}
                {...project}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </ListDetail.List>
          <ListDetail.Detail>
            {selectedProject ? (
              <div style={{ padding: '2rem' }}>
                <h1 style={{ marginTop: 0 }}>{selectedProject.title}</h1>
                <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: '2rem' }}>
                  {selectedProject.description}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h3>Column 1</h3>
                    <p>
                      Wide detail area (75% width) allows for more complex layouts and
                      multiple columns of content.
                    </p>
                  </div>
                  <div>
                    <h3>Column 2</h3>
                    <p>
                      The narrow list (25% width) provides quick navigation while maximizing
                      detail space.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Select a project
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    );
  },
};

// ============================================================================
// State Override Stories
// ============================================================================

export const CustomLoadingState: Story = {
  name: 'Custom Loading State',
  render: () => (
    <div style={{ height: '600px' }}>
      <ListDetail
        loading
        renderLoading={() => (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>Loading projects...</p>
            </div>
          </div>
        )}
      >
        <ListDetail.List>{/* Content */}</ListDetail.List>
        <ListDetail.Detail>{/* Content */}</ListDetail.Detail>
      </ListDetail>
    </div>
  ),
};

export const CustomEmptyState: Story = {
  name: 'Custom Empty State',
  render: () => (
    <div style={{ height: '600px' }}>
      <ListDetail
        isEmpty
        renderEmpty={() => (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No Projects Yet</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Create your first project to get started with your work.
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Create Project
              </button>
            </div>
          </div>
        )}
      >
        <ListDetail.List>{/* Content */}</ListDetail.List>
        <ListDetail.Detail>{/* Content */}</ListDetail.Detail>
      </ListDetail>
    </div>
  ),
};

export const CustomErrorState: Story = {
  name: 'Custom Error State',
  render: () => (
    <div style={{ height: '600px' }}>
      <ListDetail
        error={new Error('Failed to fetch projects')}
        renderError={(error) => (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
              <h3 style={{ marginBottom: '0.5rem', color: '#dc2626' }}>Error Loading Projects</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                {error?.message || 'An unexpected error occurred'}
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      >
        <ListDetail.List>{/* Content */}</ListDetail.List>
        <ListDetail.Detail>{/* Content */}</ListDetail.Detail>
      </ListDetail>
    </div>
  ),
};

export const CustomPermissionDeniedState: Story = {
  name: 'Custom Permission Denied State',
  render: () => (
    <div style={{ height: '600px' }}>
      <ListDetail
        permissionDenied
        renderPermissionDenied={() => (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Access Denied</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                You need elevated permissions to view projects. Contact your team administrator.
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Request Access
              </button>
            </div>
          </div>
        )}
      >
        <ListDetail.List>{/* Content */}</ListDetail.List>
        <ListDetail.Detail>{/* Content */}</ListDetail.Detail>
      </ListDetail>
    </div>
  ),
};
