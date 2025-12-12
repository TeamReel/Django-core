import { http, HttpResponse } from 'msw';

// Mock data
const mockNotifications = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Data export completed',
    message: 'Your export of 1,234 records is ready for download.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    read: false,
    org_id: 'org-123',
    project_id: 'proj-456',
    metadata: { job_id: 'export-789', record_count: 1234 },
    action: {
      label: 'Download',
      type: 'navigate',
      target: '/exports/export-789',
    },
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'access.revoked',
    severity: 'WARNING',
    title: 'Access revoked',
    message: 'Your access to Project X has been revoked.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    org_id: 'org-123',
    project_id: 'proj-456',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    type: 'system.info',
    severity: 'INFO',
    title: 'System maintenance scheduled',
    message: 'System will be down for maintenance on Dec 15.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
    org_id: 'org-123',
  },
];

export const handlers = [
  // GET /api/notifications - List notifications
  http.get('/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const org = url.searchParams.get('org');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);

    let filtered = mockNotifications.filter(n => n.org_id === org);
    if (status === 'unread') filtered = filtered.filter(n => !n.read);
    if (status === 'read') filtered = filtered.filter(n => n.read);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = filtered.slice(start, end);

    return HttpResponse.json({
      results,
      count: filtered.length,
      next: end < filtered.length ? `/api/notifications?page=${page + 1}` : null,
      previous: page > 1 ? `/api/notifications?page=${page - 1}` : null,
    });
  }),

  // GET /api/notifications/:id - Get single notification
  http.get('/api/v1/notifications/:id', ({ params }) => {
    const notification = mockNotifications.find(n => n.id === params.id);
    if (!notification) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(notification);
  }),

  // PATCH /api/notifications/:id/read - Mark as read/unread
  http.patch('/api/v1/notifications/:id/read', async ({ request, params }) => {
    const body = await request.json() as { read: boolean };
    return HttpResponse.json({
      id: params.id,
      read: body.read,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /api/notifications/mark-all-read - Bulk mark as read
  http.post('/api/v1/notifications/mark-all-read', async ({ request }) => {
    const body = await request.json() as { org_id: string; project_id?: string };
    const unreadCount = mockNotifications.filter(
      n => n.org_id === body.org_id && !n.read
    ).length;

    return HttpResponse.json({
      updated_count: unreadCount,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/notifications/unread-count - Get unread count
  http.get('/api/v1/notifications/unread-count', ({ request }) => {
    const url = new URL(request.url);
    const org = url.searchParams.get('org');
    const count = mockNotifications.filter(n => n.org_id === org && !n.read).length;

    return HttpResponse.json({
      count,
      org_id: org,
      project_id: null,
      last_updated: new Date().toISOString(),
    });
  }),
];
