/**
 * Resource types, mock data, and helpers for ResourceDisplayPage.
 */

export interface Resource {
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

export const getStatusBadgeType = (status: string): 'success' | 'default' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'default';
    case 'pending': return 'warning';
    case 'maintenance': return 'error';
    default: return 'info';
  }
};

// Mock data for demonstration
export const MOCK_RESOURCES: Resource[] = [
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
