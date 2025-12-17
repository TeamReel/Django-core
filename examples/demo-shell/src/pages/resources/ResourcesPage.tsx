import { useState, useEffect } from 'react';
import { ListDetail } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { useLocation, useNavigate } from 'react-router-dom';

interface Resource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'service';
  status: 'active' | 'inactive' | 'pending';
  description: string;
  created_at: string;
  usage: {
    current: number;
    limit: number;
  };
}

// Mock data for demonstration
const MOCK_RESOURCES: Resource[] = [
  {
    id: '1',
    name: 'Production API',
    type: 'api',
    status: 'active',
    description: 'Main production API endpoint for customer-facing applications',
    created_at: '2025-01-15T10:00:00Z',
    usage: { current: 15420, limit: 50000 }
  },
  {
    id: '2',
    name: 'Analytics Database',
    type: 'database',
    status: 'active',
    description: 'PostgreSQL database for analytics and reporting',
    created_at: '2025-02-01T14:30:00Z',
    usage: { current: 8200, limit: 10000 }
  },
  {
    id: '3',
    name: 'Email Service',
    type: 'service',
    status: 'active',
    description: 'Transactional email delivery service',
    created_at: '2025-02-10T09:15:00Z',
    usage: { current: 450, limit: 1000 }
  },
  {
    id: '4',
    name: 'Staging API',
    type: 'api',
    status: 'inactive',
    description: 'Development and testing API endpoint',
    created_at: '2025-01-20T11:00:00Z',
    usage: { current: 120, limit: 5000 }
  },
  {
    id: '5',
    name: 'Cache Service',
    type: 'service',
    status: 'pending',
    description: 'Redis cache for session and data caching',
    created_at: '2025-03-01T16:45:00Z',
    usage: { current: 0, limit: 2000 }
  }
];

export default function ResourcesPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize selectedId from URL hash or localStorage
  const getInitialSelection = () => {
    const hash = location.hash.replace('#', '');
    if (hash) return hash;
    return localStorage.getItem('demo_selected_resource') || null;
  };

  const [selectedId, setSelectedId] = useState<string | number | null>(getInitialSelection());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Update URL hash when selection changes
  useEffect(() => {
    if (selectedId) {
      navigate(`#${selectedId}`, { replace: true });
      localStorage.setItem('demo_selected_resource', String(selectedId));
    } else {
      navigate('', { replace: true });
      localStorage.removeItem('demo_selected_resource');
    }
  }, [selectedId, navigate]);

  // Filter resources based on search and type filter
  const filteredResources = MOCK_RESOURCES.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    return matchesSearch && matchesType;
  });

  const selectedResource = MOCK_RESOURCES.find(r => r.id === selectedId);

  const getStatusColor = (status: Resource['status']) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'pending': return '#ffc107';
      default: return '#666';
    }
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'api': return '🔌';
      case 'database': return '🗄️';
      case 'service': return '⚙️';
      default: return '📦';
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  return (
    <AppShell>
      <div style={{ height: 'calc(100vh - 120px)' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          splitRatio={[1, 2]}
          listMinWidth={320}
          isEmpty={filteredResources.length === 0}
          aria-label="Resources List-Detail View"
        >
          <ListDetail.List
            showSearch
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search resources..."
          >
            {/* Filter dropdown */}
            <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Types</option>
                <option value="api">APIs</option>
                <option value="database">Databases</option>
                <option value="service">Services</option>
              </select>
            </div>
            {filteredResources.map(resource => (
              <div
                key={resource.id}
                onClick={() => setSelectedId(resource.id)}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedId === resource.id ? '#f0f7ff' : 'white',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{getTypeIcon(resource.type)}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{resource.name}</h4>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: getStatusColor(resource.status) + '20',
                        color: getStatusColor(resource.status)
                      }}>
                        {resource.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                        {resource.type}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {resource.description}
                </p>
              </div>
            ))}
          </ListDetail.List>

          <ListDetail.Detail>
            {selectedResource ? (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '48px' }}>{getTypeIcon(selectedResource.type)}</span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '28px' }}>{selectedResource.name}</h2>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '14px',
                          fontWeight: 600,
                          backgroundColor: getStatusColor(selectedResource.status) + '20',
                          color: getStatusColor(selectedResource.status)
                        }}>
                          {selectedResource.status}
                        </span>
                        <span style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>
                          {selectedResource.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                    {selectedResource.description}
                  </p>
                </div>

                {/* Usage Metrics */}
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '24px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Usage Metrics</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Current Usage</span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {selectedResource.usage.current.toLocaleString()} / {selectedResource.usage.limit.toLocaleString()}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${getUsagePercentage(selectedResource.usage.current, selectedResource.usage.limit)}%`,
                        height: '100%',
                        backgroundColor: getUsagePercentage(selectedResource.usage.current, selectedResource.usage.limit) > 80 ? '#dc3545' : '#007bff',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      {getUsagePercentage(selectedResource.usage.current, selectedResource.usage.limit)}% of limit
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Details</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Resource ID
                      </div>
                      <code style={{
                        backgroundColor: '#f8f9fa',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '14px'
                      }}>
                        {selectedResource.id}
                      </code>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Created At
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        {new Date(selectedResource.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                    Configure
                  </button>
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                    View Logs
                  </button>
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                    Restart
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                fontSize: '16px'
              }}>
                Select a resource to view details
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    </AppShell>
  );
}
