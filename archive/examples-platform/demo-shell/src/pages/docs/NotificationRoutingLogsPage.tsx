import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';

interface RoutingLog {
  id: string;
  timestamp: string;
  notification_type: string;
  recipient_count: number;
  organisation?: string;
  project?: string;
  decision: 'delivered' | 'filtered' | 'failed';
  delivery_channels: string[];
}

export const NotificationRoutingLogsPage: React.FC = () => {
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [logs, setLogs] = useState<RoutingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setDemoMode] = useState(false);
  const [editMode, setEditMode] = useState<'global' | 'org'>(
    () => (localStorage.getItem('routing-logs-edit-mode') as 'global' | 'org') || 'global'
  );

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';
  const isSuperAdmin = (user as any)?.role === 'superadmin';

  // Breadcrumb context switcher setup
  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  // Handler to switch organisation without page reload
  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    console.log('[NotificationRoutingLogsPage] Switching to org:', option.label, option.id);

    if (option.id === '' || option.label === 'Global') {
      // Clear org selection for global view
      localStorage.removeItem('django-core:currentOrgId');
      localStorage.removeItem('django-core:currentProjectId');
    } else {
      // Set specific org
      localStorage.setItem('django-core:currentOrgId', option.id);
      localStorage.removeItem('django-core:currentProjectId');
    }
    window.location.reload();
  };

  // Persist editMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('routing-logs-edit-mode', editMode);
  }, [editMode]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        setDemoMode(false);

        // Determine Base URL
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

        // Build URL with org filter
        let url = `${baseUrl}/api/v1/contextual-notifications/routing-logs/`;

        // In global mode, no org filter (show all)
        // In org mode, filter by currentOrgId
        if (editMode === 'org' && currentOrgId) {
          url += `?org_id=${currentOrgId}`;
        } else if (!isSuperAdmin && currentOrgId) {
          // Non-superadmins always filter by their org
          url += `?org_id=${currentOrgId}`;
        }

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();

          let rawResults: any[] = [];
          if (Array.isArray(data)) {
            rawResults = data;
          } else if (Array.isArray(data.results)) {
            rawResults = data.results;
          } else if (data.data && Array.isArray(data.data.results)) {
            rawResults = data.data.results;
          } else if (data.data && Array.isArray(data.data)) {
            rawResults = data.data;
          } else if (data.results) {
             // Handle DRF pagination where results is at top level
             rawResults = data.results;
          }

          // Map API response to RoutingLog interface
          const mappedResults: RoutingLog[] = rawResults.map((item: any) => ({
            id: item.id.toString(),
            timestamp: item.created_at,
            notification_type: item.metadata?.notification_type || item.event_type,
            recipient_count: item.metadata?.recipient_count || 0,
            organisation: item.organization_name,
            project: item.project_name,
            decision: item.metadata?.decision || 'unknown',
            delivery_channels: item.metadata?.delivery_channels || [],
          }));

          setLogs(mappedResults);
        } else if (response.status === 404) {
          // Demo mode: Use mock routing logs
          setDemoMode(true);
          const demoLogs: RoutingLog[] = [
            {
              id: '1',
              timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
              notification_type: 'project.created',
              recipient_count: 3,
              organisation: currentOrgName || 'KNVB',
              project: 'Eredivisie 2024',
              decision: 'delivered',
              delivery_channels: ['email', 'in_app'],
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
              notification_type: 'member.role_changed',
              recipient_count: 2,
              organisation: currentOrgName || 'KNVB',
              decision: 'filtered',
              delivery_channels: ['in_app'],
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
              notification_type: 'auth.login',
              recipient_count: 1,
              decision: 'delivered',
              delivery_channels: ['in_app'],
            },
          ];
          setLogs(demoLogs);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch routing logs');
        console.error('Routing logs fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentOrgId, isSuperAdmin, editMode]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getDecisionBadgeVariant = (decision: string) => {
    switch (decision) {
      case 'delivered': return 'success';
      case 'filtered': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <AppShell>
      <div>
        <PageHeader
          title="Notification Routing Logs"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Docs' },
            { label: 'Routing Logs' },
            ...(isSuperAdmin && editMode === 'global'
              ? [{ label: 'Global View' }]
              : [{
                  label: isSuperAdmin ? (
                    <BreadcrumbContextSwitcher
                      currentId={currentOrgId || ''}
                      options={organisationOptions}
                      onSelect={handleOrganisationSwitch}
                      hasDropdown={true}
                      type="organisation"
                    />
                  ) : (currentOrgName || 'Organisation')
                }]
            )
          ]}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Demo Helper: Show current mode */}
              <div style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: isSuperAdmin ? '#3b82f6' : '#a855f7',
                color: 'white',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'default',
              }}>
                {isSuperAdmin ? '👑 ADMIN' : '👤 ORG'}
              </div>

              {/* Scope Selector - Only for Superadmin */}
              {isSuperAdmin && (
                <>
                  <div style={{
                    height: '24px',
                    width: '1px',
                    backgroundColor: 'var(--app-border)',
                    opacity: 0.5,
                  }} />
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--app-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--app-border)' }}>
                    <button
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: editMode === 'global' ? '#3b82f6' : 'transparent',
                        color: editMode === 'global' ? 'white' : 'var(--app-text)',
                      }}
                      onClick={() => setEditMode('global')}
                    >
                      Global View
                    </button>
                    <button
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: editMode === 'org' ? '#a855f7' : 'transparent',
                        color: editMode === 'org' ? 'white' : 'var(--app-text)',
                      }}
                      onClick={() => setEditMode('org')}
                    >
                      Organisation Logs
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />
        <PageContent>
          <Alert variant="info" className="mb-4">
            This page shows recent notification routing decisions. Each log entry records how notifications
            were routed to recipients based on context and preferences.
          </Alert>

          {isDemoMode && (
            <Alert variant="info" className="mb-4">
              <strong>Demo Mode:</strong> Using mock data
            </Alert>
          )}

          {!isSuperAdmin && currentOrgName && (
            <Alert variant="info" className="mb-4">
              <strong>Filtered by Organisation:</strong> {currentOrgName}
            </Alert>
          )}

          {isSuperAdmin && editMode === 'global' && (
            <Alert variant="info" className="mb-4">
              <strong>Global View:</strong> Showing all routing logs across all organisations
            </Alert>
          )}

          {isSuperAdmin && editMode === 'org' && currentOrgId && (
            <Alert variant="info" className="mb-4">
              <strong>Filtered by Organisation:</strong> {currentOrgName}
            </Alert>
          )}

          {loading && (
            <Card>
              <div className="p-6 text-center">Loading routing logs...</div>
            </Card>
          )}

          {error && (
            <Alert variant="error" className="mb-4">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {!loading && !error && logs.length === 0 && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                No routing logs found. Notifications will appear here as they are generated.
              </div>
            </Card>
          )}

          {!loading && !error && logs.length > 0 && (
            <Card>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                      <th style={{ padding: '12px' }}>Timestamp</th>
                      <th style={{ padding: '12px' }}>Notification Type</th>
                      <th style={{ padding: '12px' }}>Organisation</th>
                      <th style={{ padding: '12px' }}>Project</th>
                      <th style={{ padding: '12px' }}>Decision</th>
                      <th style={{ padding: '12px' }}>Recipients</th>
                      <th style={{ padding: '12px' }}>Channels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--app-border)' }}>
                        <td style={{ fontSize: '0.85rem', padding: '12px' }}>{formatTimestamp(log.timestamp)}</td>
                        <td style={{ padding: '12px' }}>
                          <code style={{ fontSize: '0.85rem' }}>{log.notification_type}</code>
                        </td>
                        <td style={{ padding: '12px' }}>{log.organisation || '-'}</td>
                        <td style={{ padding: '12px' }}>{log.project || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <Badge variant={getDecisionBadgeVariant(log.decision)}>
                            {log.decision}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge variant="info">{log.recipient_count}</Badge>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {log.delivery_channels.map((channel) => (
                              <Badge key={channel} variant="default">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
};

export default NotificationRoutingLogsPage;
