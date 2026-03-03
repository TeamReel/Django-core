import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Badge, Alert, Spinner } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

export function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [beatSchedule, setBeatSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) setLoading(true);
        else setIsRefreshing(true);
        setError(null);

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/tasks/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const taskData = data.data || data;

        const allTasks = [
          ...(taskData.active || []).map((t: any) => ({ ...t, status: 'running' })),
          ...(taskData.scheduled || []).map((t: any) => ({ ...t, status: 'scheduled' })),
          ...(taskData.reserved || []).map((t: any) => ({ ...t, status: 'pending' })),
        ];
        setTasks(allTasks);
        setBeatSchedule(taskData.beat_schedule || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Using demo data.');
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

    fetchTasks(true);
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
        subtitle={isRefreshing ? "B15 Task Scheduling & Monitoring • Refreshing..." : "B15 Task Scheduling & Monitoring"}
      />
      <PageContent>
        <div className="page-container" data-testid="tasks-page">
          {error && <Alert variant="warning" className="mb-16">{error}</Alert>}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner /></div>
          ) : (
            <>
              <div className="grid gap-16 mb-24" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <Card className="p-16"><div className="fs-12 mb-4" style={{ color: '#6b7280' }}>Total</div><div className="fs-24 fw-700">{tasks.length}</div></Card>
                <Card className="p-16"><div className="fs-12 mb-4" style={{ color: '#6b7280' }}>Running</div><div className="fs-24 fw-700">{statusCounts.running || 0}</div></Card>
                <Card className="p-16"><div className="fs-12 mb-4" style={{ color: '#6b7280' }}>Pending</div><div className="fs-24 fw-700">{statusCounts.pending || 0}</div></Card>
                <Card className="p-16"><div className="fs-12 mb-4" style={{ color: '#6b7280' }}>Scheduled</div><div className="fs-24 fw-700">{statusCounts.scheduled || 0}</div></Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th className="p-12 text-left fs-12 fw-600">Task Name</th>
                        <th className="p-12 text-left fs-12 fw-600">Status</th>
                        <th className="p-12 text-left fs-12 fw-600">Worker</th>
                        <th className="p-12 text-left fs-12 fw-600">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr><td colSpan={4} className="p-24 text-center" style={{ color: '#6b7280' }}>No tasks currently running or queued</td></tr>
                      ) : tasks.map(task => (
                        <tr key={task.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                          <td className="p-12">{task.name}</td>
                          <td className="p-12">{getStatusBadge(task.status)}</td>
                          <td className="p-12 fs-14" style={{ color: '#6b7280' }}>{task.worker || '-'}</td>
                          <td className="p-12 fs-14" style={{ color: '#6b7280' }}>{task.time_start ? new Date(task.time_start * 1000).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {beatSchedule.length > 0 && (
                <div className="mt-24">
                  <h2 className="fs-18 fw-600 mb-12">⏰ Periodic Tasks (Celery Beat Schedule)</h2>
                  <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                            <th className="p-12 text-left fs-12 fw-600">Task Name</th>
                            <th className="p-12 text-left fs-12 fw-600">Schedule</th>
                            <th className="p-12 text-left fs-12 fw-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beatSchedule.map((task, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td className="p-12 fs-14" style={{ fontFamily: 'monospace' }}>{task.name}</td>
                              <td className="p-12 fs-14" style={{ color: '#6b7280' }}>{task.schedule || 'N/A'}</td>
                              <td className="p-12"><Badge variant="success">Enabled</Badge></td>
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
