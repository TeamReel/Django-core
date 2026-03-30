import { useState, useEffect } from 'react';
import { ListDetail } from '@django-core/page-templates';
import { Badge, Button, Card } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import { useLocation, useNavigate } from 'react-router-dom';

interface Resource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'service' | 'queue' | 'storage';
  status: 'active' | 'inactive' | 'pending' | 'maintenance';
  description: string;
  created_at: string;
  updated_at: string;
  usage: {
    current: number;
    limit: number;
    unit: string;
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
    updated_at: '2025-12-20T14:30:00Z',
    usage: { current: 15420, limit: 50000, unit: 'req/min' }
  },
  {
    id: '2',
    name: 'Analytics Database',
    type: 'database',
    status: 'active',
    description: 'PostgreSQL database for analytics and reporting',
    created_at: '2025-02-01T14:30:00Z',
    updated_at: '2025-12-25T09:15:00Z',
    usage: { current: 820, limit: 1000, unit: 'GB' }
  },
  {
    id: '3',
    name: 'Email Service',
    type: 'service',
    status: 'maintenance',
    description: 'Transactional email delivery service',
    created_at: '2025-02-10T09:15:00Z',
    updated_at: '2025-12-26T11:00:00Z',
    usage: { current: 450, limit: 1000, unit: 'emails/hr' }
  },
  {
    id: '4',
    name: 'Staging API',
    type: 'api',
    status: 'inactive',
    description: 'Development and testing API endpoint',
    created_at: '2025-01-20T11:00:00Z',
    updated_at: '2025-11-15T16:20:00Z',
    usage: { current: 0, limit: 5000, unit: 'req/min' }
  },
  {
    id: '5',
    name: 'Session Cache',
    type: 'service',
    status: 'active',
    description: 'Redis cache for session and data caching',
    created_at: '2025-03-01T16:45:00Z',
    updated_at: '2025-12-27T08:00:00Z',
    usage: { current: 2.4, limit: 8, unit: 'GB' }
  },
  {
    id: '6',
    name: 'Image Storage',
    type: 'storage',
    status: 'active',
    description: 'S3-compatible object storage for user uploads',
    created_at: '2025-03-15T10:00:00Z',
    updated_at: '2025-12-22T13:45:00Z',
    usage: { current: 450, limit: 1000, unit: 'GB' }
  },
  {
    id: '7',
    name: 'Job Queue',
    type: 'queue',
    status: 'pending',
    description: 'Background job processing queue',
    created_at: '2025-12-27T09:00:00Z',
    updated_at: '2025-12-27T09:00:00Z',
    usage: { current: 0, limit: 100, unit: 'jobs/sec' }
  }
];

export function ResourceDisplayPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize selectedId from URL hash or localStorage, or default to first item
  const getInitialSelection = () => {
    const hash = location.hash.replace('#', '');
    if (hash) return hash;
    const stored = localStorage.getItem('demo_selected_resource');
    if (stored) return stored;
    return MOCK_RESOURCES.length > 0 ? MOCK_RESOURCES[0].id : null;
  };

  const [selectedId, setSelectedId] = useState<string | number | null>(getInitialSelection());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

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
    const matchesStatus = filterStatus === 'all' || resource.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  const selectedResource = MOCK_RESOURCES.find(r => r.id === selectedId);

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
    setSortBy('name');
  };

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'pending': return 'warning';
      case 'maintenance': return 'error';
      default: return 'info';
    }
  };

  return (
    <AppShell>
      <div style={{ height: 'calc(100vh - 64px)' }}>
        <ListDetail
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          listMinWidth={320}
        >
          <ListDetail.List
            showSearch
            searchPlaceholder="Search resources..."
            onSearchChange={setSearchQuery}
          >
            <div className="bg-blue-50 p-3 text-xs text-blue-800 border-b border-blue-100">
              This page demonstrates the standard <strong>List–Detail</strong> pattern used across the platform.
            </div>
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 text-sm border rounded"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="api">API</option>
                  <option value="database">Database</option>
                  <option value="service">Service</option>
                  <option value="queue">Queue</option>
                  <option value="storage">Storage</option>
                </select>
                <select
                  className="flex-1 p-2 text-sm border rounded"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <select
                  className="p-2 text-sm border rounded w-32"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="updated">Updated</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Showing {filteredResources.length} resources
              </div>
            </div>

            <div className="divide-y">
              {filteredResources.map(resource => (
                <div
                  key={resource.id}
                  onClick={() => setSelectedId(resource.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedId === resource.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-medium ${selectedId === resource.id ? 'text-blue-700' : 'text-gray-900'}`}>
                      {resource.name}
                    </h3>
                    <Badge variant={getStatusBadgeType(resource.status) as any} size="sm">
                      {resource.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    {resource.type}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {resource.description}
                  </p>
                </div>
              ))}

              {filteredResources.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No resources found matching your filters.
                </div>
              )}
            </div>
          </ListDetail.List>

          <ListDetail.Detail>
            {selectedResource ? (
              <div className="p-6 max-w-3xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="md:hidden mb-4 text-sm text-blue-600 flex items-center gap-1 hover:underline"
                    >
                      ← Back to List
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedResource.name}</h1>
                    <div className="flex gap-2 items-center">
                      <Badge variant={getStatusBadgeType(selectedResource.status) as any}>
                        {selectedResource.status}
                      </Badge>
                      <span className="text-gray-400">|</span>
                      <span className="text-sm text-gray-600 uppercase font-medium">{selectedResource.type}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Created: {new Date(selectedResource.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(selectedResource.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>

                <Card className="mb-6">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Overview</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedResource.description}
                    </p>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <div className="p-6">
                      <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Usage</h3>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{selectedResource.usage.current}</span>
                        <span className="text-sm text-gray-500 mb-1">/ {selectedResource.usage.limit} {selectedResource.usage.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                          className={`h-2 rounded-full ${
                            (selectedResource.usage.current / selectedResource.usage.limit) > 0.9 ? 'bg-red-500' :
                            (selectedResource.usage.current / selectedResource.usage.limit) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((selectedResource.usage.current / selectedResource.usage.limit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Configuration</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-600">Region</span>
                          <span className="font-mono">eu-west-1</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-600">Environment</span>
                          <span className="font-mono">Production</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-600">Backup Policy</span>
                          <span className="font-mono">Daily</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">👈</div>
                  <p>Select a resource to view details</p>
                </div>
              </div>
            )}
          </ListDetail.Detail>
        </ListDetail>
      </div>
    </AppShell>
  );
}
