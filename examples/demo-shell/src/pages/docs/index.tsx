import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
// Temporary: Import directly from dist until shim exports are fixed
import { PageHeader } from '../../../../../packages/page-templates/src/components/PageHeader';
import { PageContent } from '../../../../../packages/page-templates/src/components/PageContent';
import { Button, Card, Badge, Input, Alert, Spinner } from '@django-core/design-system';

export function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [beatSchedule, setBeatSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async (isInitialLoad = false) => {
      try {
        // Only show full loading spinner on initial load
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl}/api/v1/tasks/`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[TasksPage] API response:', data);

        // Handle DRF envelope response format: {status: 'success', data: {...}}
        const taskData = data.data || data;
        console.log('[TasksPage] Task data:', taskData);

        // Combine active, scheduled, and reserved tasks from API response
        const allTasks = [
          ...(taskData.active || []).map((t: any) => ({ ...t, status: 'running' })),
          ...(taskData.scheduled || []).map((t: any) => ({ ...t, status: 'scheduled' })),
          ...(taskData.reserved || []).map((t: any) => ({ ...t, status: 'pending' })),
        ];

        console.log('[TasksPage] Combined tasks:', allTasks);
        setTasks(allTasks);

        // Store beat schedule separately
        setBeatSchedule(taskData.beat_schedule || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Using demo data.');

        // Fallback to mock data on error
        setTasks([
          { id: '1', name: 'Send welcome emails', status: 'running', time_start: Date.now() / 1000 },
          { id: '2', name: 'Generate monthly reports', status: 'failed', time_start: Date.now() / 1000 - 3600 },
          { id: '3', name: 'Cleanup old sessions', status: 'success', time_start: Date.now() / 1000 - 7200 },
        ]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    // Initial load
    fetchTasks(true);

    // Refresh every 10 seconds (background refresh)
    const interval = setInterval(() => fetchTasks(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="success">Success</Badge>;
      case 'running': return <Badge variant="warning">Running</Badge>;
      case 'failed': return <Badge variant="error">Failed</Badge>;
      case 'pending': return <Badge variant="info">Pending</Badge>;
      case 'scheduled': return <Badge variant="default">Scheduled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell>
      <PageHeader
        title="Background Tasks"
        subtitle={
          isRefreshing
            ? "B15 Task Scheduling & Monitoring • Refreshing..."
            : "B15 Task Scheduling & Monitoring"
        }
      />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="tasks-page">
          {error && (
            <Alert variant="warning" style={{ marginBottom: '16px' }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{tasks.length}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Running</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.running || 0}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.pending || 0}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Scheduled</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.scheduled || 0}</div>
                </Card>
              </div>

              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Task Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Worker</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                            No tasks currently running or queued
                          </td>
                        </tr>
                      ) : (
                        tasks.map(task => (
                          <tr key={task.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                            <td style={{ padding: '12px' }}>{task.name}</td>
                            <td style={{ padding: '12px' }}>{getStatusBadge(task.status)}</td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                              {task.worker || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                              {task.time_start ? new Date(task.time_start * 1000).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Periodic Tasks (Beat Schedule) */}
              {beatSchedule.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
                    ⏰ Periodic Tasks (Celery Beat Schedule)
                  </h2>
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Task Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Schedule</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beatSchedule.map((task, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '14px' }}>
                                {task.name}
                              </td>
                              <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                {task.schedule || 'N/A'}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <Badge variant="success">Enabled</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      // Handle B13 response envelope
      const results = data.data?.results || data.results || data.data || data || [];
      setNotifications(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    setMarking(id);
    const newReadStatus = !currentReadStatus;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Get CSRF token
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        body: JSON.stringify({ is_read: newReadStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update notification: ${response.status}`);
      }

      const updated = await response.json();

      // Update local state with server response
      setNotifications(prev =>
        prev.map(n => n.id === id ? updated : n)
      );

      // Trigger badge refresh in header
      window.dispatchEvent(new CustomEvent('notificationChanged'));
    } catch (err) {
      console.error('Failed to toggle notification:', err);
      alert(err instanceof Error ? err.message : 'Failed to update notification');
    } finally {
      setMarking(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/mark-all-read/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Refetch notifications
      await fetchNotifications();

      // Trigger event for badge update
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      console.error('Error marking all as read:', err);
      alert('Failed to mark all as read');
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="In-App Notifications with Persistent Read/Unread Status" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="notifications-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : error ? (
            <Card style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={fetchNotifications}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #007bff',
                  backgroundColor: 'var(--app-surface)',
                  color: '#007bff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Retry
              </button>
            </Card>
          ) : (
            <>
              <Card style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--app-text)' }}>Unread: {unreadCount}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--app-muted-text)' }}>
                      Total: {notifications.length} notifications
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setFilter('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: filter === 'all' ? '1px solid #007bff' : '1px solid #6c757d',
                        backgroundColor: 'var(--app-surface)',
                        color: filter === 'all' ? '#007bff' : '#6c757d',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('unread')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: filter === 'unread' ? '1px solid #007bff' : '1px solid #6c757d',
                        backgroundColor: 'var(--app-surface)',
                        color: filter === 'unread' ? '#007bff' : '#6c757d',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #6c757d',
                        backgroundColor: 'var(--app-surface)',
                        color: '#6c757d',
                        cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: unreadCount === 0 ? 0.5 : 1,
                      }}
                    >
                      Mark All Read
                    </button>
                  </div>
                </div>
              </Card>

              {filtered.length === 0 ? (
                <Card style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <p style={{ color: 'var(--app-muted-text)' }}>
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </p>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filtered.map(notif => (
                    <Card key={notif.id} style={{ padding: '16px', backgroundColor: notif.is_read ? 'var(--app-surface)' : 'var(--app-surface-2)', border: '1px solid var(--app-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Badge variant={
                              notif.level === 'error' ? 'error' :
                              notif.level === 'warning' ? 'warning' :
                              notif.level === 'success' ? 'success' :
                              'info'
                            }>
                              {notif.level}
                            </Badge>
                            {!notif.is_read && <Badge variant="info">NEW</Badge>}
                          </div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: 'var(--app-text)' }}>{notif.title}</h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--app-muted-text)' }}>{notif.message}</p>
                          <div style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
                            {new Date(notif.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleRead(notif.id, notif.is_read)}
                          disabled={marking === notif.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #6c757d',
                            backgroundColor: 'var(--app-surface)',
                            color: '#6c757d',
                            cursor: marking === notif.id ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 500,
                            opacity: marking === notif.id ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {marking === notif.id
                            ? 'Updating...'
                            : notif.is_read
                              ? 'Mark Unread'
                              : 'Mark Read'}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}

export function DeploymentPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

    fetch(`${baseUrl}/api/observability/demo-health/`)
      .then(r => r.json())
      .then(data => {
        setServices([
          {
            name: 'Backend API',
            status: (data.core_services?.auth?.status === 'active' || data.core_services?.auth?.status === 'healthy') ? 'healthy' : 'degraded',
            version: '1.0.0',
            type: 'Service',
            detail: data.core_services?.auth?.message
          },
          {
            name: 'Frontend',
            status: 'healthy',
            version: '1.0.0',
            type: 'Client',
            detail: 'Active Session'
          },
          {
            name: 'PostgreSQL',
            status: data.core_services?.database?.status === 'healthy' ? 'healthy' : 'degraded',
            version: '16.0',
            type: 'Database',
            detail: data.core_services?.database?.latency_ms ? `${data.core_services.database.latency_ms}ms latency` : undefined
          },
          {
            name: 'Redis',
            status: data.core_services?.cache?.status === 'healthy' ? 'healthy' : 'degraded',
            version: '7.2',
            type: 'Cache',
            detail: data.core_services?.cache?.latency_ms ? `${data.core_services.cache.latency_ms}ms latency` : undefined
          },
        ]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        // Fallback to basic info if fetch fails
        setServices([
          { name: 'Backend API', status: 'down', version: '1.0.0', type: 'Service' },
          { name: 'Frontend', status: 'healthy', version: '1.0.0', type: 'Client' },
        ]);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'active':
        return <Badge variant="success">Healthy</Badge>;
      case 'degraded': return <Badge variant="warning">Degraded</Badge>;
      case 'down':
      case 'error':
      case 'unhealthy':
        return <Badge variant="error">Down</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <PageHeader title="Deployment Status" subtitle="B19 Container & Service Health" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="deployment-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <Alert variant="info" style={{ marginBottom: '24px' }}>
                <strong>Environment:</strong> Demo / Production
                <br />
                <strong>Deployment:</strong> Railway (Backend) + Vercel (Frontend)
              </Alert>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {services.map(service => (
                  <Card key={service.name} style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{service.name}</h4>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          {service.type} • v{service.version}
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '12px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280' }}>Status Detail:</span>
                        <span>{service.detail || 'Running'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card style={{ padding: '16px', marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Quick Links</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => window.location.href = '/health'}>
                    View Health Details
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/observability'}>
                    Metrics Dashboard
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}

export function DocsPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - /api/docs/metadata/
    setTimeout(() => {
      setModules([
        { id: 'B01', name: 'Health Check', status: 'complete', docs: true },
        { id: 'B04', name: 'Internationalization', status: 'complete', docs: true },
        { id: 'B05', name: 'Authentication', status: 'complete', docs: true },
        { id: 'B06', name: 'Organizations', status: 'complete', docs: true },
        { id: 'B07', name: 'Projects', status: 'complete', docs: true },
        { id: 'B08', name: 'Authorization', status: 'complete', docs: true },
        { id: 'B09', name: 'Audit Logging', status: 'complete', docs: true },
        { id: 'B12', name: 'Preferences', status: 'complete', docs: true },
        { id: 'B13', name: 'API Foundation', status: 'complete', docs: true },
        { id: 'B15', name: 'Task Scheduling', status: 'complete', docs: true },
        { id: 'B16', name: 'Notifications Baseline', status: 'complete', docs: true },
        { id: 'B17', name: 'Notification Extensions', status: 'complete', docs: true },
        { id: 'B18', name: 'Observability', status: 'complete', docs: true },
        { id: 'B19', name: 'Deployment', status: 'complete', docs: true },
        { id: 'B20', name: 'Scaffolding CLI', status: 'complete', docs: true },
        { id: 'B21', name: 'Documentation', status: 'complete', docs: true },
        { id: 'F01', name: 'Design System', status: 'complete', docs: true },
        { id: 'F02', name: 'Auth UI', status: 'complete', docs: true },
        { id: 'F03', name: 'Context Switcher', status: 'complete', docs: true },
        { id: 'F07', name: 'Theme System', status: 'complete', docs: true },
        { id: 'F09', name: 'Integration Guides', status: 'complete', docs: true },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return <Badge variant="success">Complete</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'planned': return <Badge variant="info">Planned</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <PageHeader title="Documentation Browser" subtitle="B21 Module Documentation & Status" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="docs-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: 'var(--app-text)' }}>Documentation Resources</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.open('http://localhost:8001/docs', '_blank')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #007bff',
                      backgroundColor: 'var(--app-surface)',
                      color: '#007bff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    📚 MkDocs Site
                  </button>
                  <button
                    onClick={() => window.location.href = '/api-docs'}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #6c757d',
                      backgroundColor: 'var(--app-surface)',
                      color: '#6c757d',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    📖 API Documentation
                  </button>
                  <button
                    onClick={() => window.open('https://github.com', '_blank')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #6c757d',
                      backgroundColor: 'var(--app-surface)',
                      color: '#6c757d',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    🔗 GitHub Repository
                  </button>
                </div>
              </Card>

              <Card style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Module Status Matrix</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Module ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Docs Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(module => (
                        <tr key={module.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{module.id}</td>
                          <td style={{ padding: '12px' }}>{module.name}</td>
                          <td style={{ padding: '12px' }}>{getStatusBadge(module.status)}</td>
                          <td style={{ padding: '12px' }}>
                            {module.docs ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}

export function I18nPage() {
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  const translations = {
    en: {
      welcome: 'Welcome to the Internationalization Demo',
      description: 'This page demonstrates language switching with B04 i18n utilities and B12 preferences persistence.',
      currentLang: 'Current Language',
      selectLang: 'Select Language',
      sampleText: 'Sample Translated Text',
      greeting: 'Hello! This text would be translated based on your language selection.',
    },
    nl: {
      welcome: 'Welkom bij de Internationalisatie Demo',
      description: 'Deze pagina toont taalwisseling met B04 i18n hulpmiddelen en B12 voorkeuren persistentie.',
      currentLang: 'Huidige Taal',
      selectLang: 'Selecteer Taal',
      sampleText: 'Voorbeeld Vertaalde Tekst',
      greeting: 'Hallo! Deze tekst zou worden vertaald op basis van uw taalkeuze.',
    },
    fr: {
      welcome: 'Bienvenue dans la Démo d\'Internationalisation',
      description: 'Cette page démontre le changement de langue avec les utilitaires i18n B04 et la persistance des préférences B12.',
      currentLang: 'Langue Actuelle',
      selectLang: 'Sélectionner la Langue',
      sampleText: 'Exemple de Texte Traduit',
      greeting: 'Bonjour! Ce texte serait traduit en fonction de votre sélection de langue.',
    },
    de: {
      welcome: 'Willkommen bei der Internationalisierungs-Demo',
      description: 'Diese Seite demonstriert Sprachwechsel mit B04 i18n Utilities und B12 Präferenzen Persistenz.',
      currentLang: 'Aktuelle Sprache',
      selectLang: 'Sprache Auswählen',
      sampleText: 'Beispiel Übersetzter Text',
      greeting: 'Hallo! Dieser Text würde basierend auf Ihrer Sprachauswahl übersetzt.',
    },
  };

  const handleLanguageChange = (langCode: string) => {
    setSaving(true);
    setLanguage(langCode);
    setSavedMessage('');

    // Simulate POST /api/preferences/ to save language
    setTimeout(() => {
      setSaving(false);
      setSavedMessage(`Language preference saved: ${languages.find(l => l.code === langCode)?.name}`);
      setTimeout(() => setSavedMessage(''), 3000);
    }, 500);
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  const currentLangInfo = languages.find(l => l.code === language);

  return (
    <AppShell>
      <PageHeader title="Internationalization" subtitle="B04 i18n & B12 Language Preferences" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="i18n-page">
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0' }}>{t.welcome}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{t.description}</p>
          </Card>

          {savedMessage && (
            <Alert variant="success" style={{ marginBottom: '24px' }}>
              {savedMessage}
            </Alert>
          )}

          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.currentLang}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontSize: '32px' }}>{currentLangInfo?.flag}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{currentLangInfo?.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Code: {language.toUpperCase()}</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.selectLang}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={saving}
                  style={{
                    padding: '16px',
                    border: language === lang.code ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                    borderRadius: '8px',
                    backgroundColor: language === lang.code ? '#eff6ff' : '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{lang.flag}</div>
                  <div style={{ fontWeight: 600 }}>{lang.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang.code.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.sampleText}</h3>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '16px' }}>{t.greeting}</p>
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
              <p style={{ margin: 0 }}>
                <strong>Note:</strong> In production, this would integrate with B04 gettext utilities for comprehensive translation
                management and B12 preferences API for persistent language storage across sessions.
              </p>
            </div>
          </Card>
        </div>
      </PageContent>
    </AppShell>
  );
}
