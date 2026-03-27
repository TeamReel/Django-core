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
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { api, ApiError } from '@/api';
import styles from './NotificationRoutingLogsPage.module.css';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';

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
  const debugLog = (...args: unknown[]) => {
  };
  const [logs, setLogs] = useState<RoutingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setDemoMode] = useState(false);
  const [editMode, setEditMode] = useState<'global' | 'org'>(
    () => (localStorage.getItem('routing-logs-edit-mode') as 'global' | 'org') || 'global'
  );

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';
  const isSuperAdmin = Boolean(user?.is_superuser) || user?.role === 'superadmin';

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
    debugLog('[NotificationRoutingLogsPage] Switching to org:', option.label, option.id);

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

        // Build URL with org filter
        let path = `/contextual-notifications/routing-logs/`;

        // In global mode, no org filter (show all)
        // In org mode, filter by currentOrgId
        if (editMode === 'org' && currentOrgId) {
          path += `?org_id=${currentOrgId}`;
        } else if (!isSuperAdmin && currentOrgId) {
          // Non-superadmins always filter by their org
          path += `?org_id=${currentOrgId}`;
        }

        const data = await api.get<Record<string, unknown>>(path);

          let rawResults: Record<string, unknown>[] = [];
          const dataObj = data as Record<string, unknown>;
          if (Array.isArray(data)) {
            rawResults = data;
          } else if (Array.isArray(dataObj.results)) {
            rawResults = dataObj.results;
          } else if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).results)) {
            rawResults = (dataObj.data as Record<string, unknown>).results as Record<string, unknown>[];
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            rawResults = dataObj.data as Record<string, unknown>[];
          } else if (dataObj.results) {
             // Handle DRF pagination where results is at top level
             rawResults = dataObj.results as Record<string, unknown>[];
          }

          // Map API response to RoutingLog interface
          const mappedResults = rawResults.map((item): RoutingLog => {
            const rec = item as Record<string, unknown>;
            const meta = (rec.metadata || {}) as Record<string, unknown>;
            return {
              id: String(rec.id),
              timestamp: (rec.created_at as string) ?? '',
              notification_type: (meta.notification_type as string) || (rec.event_type as string) || '',
              recipient_count: (meta.recipient_count as number) || 0,
              organisation: (rec.organization_name as string) || undefined,
              project: (rec.project_name as string) || undefined,
              decision: ((meta.decision as string) || 'unknown') as RoutingLog['decision'],
              delivery_channels: (meta.delivery_channels as string[]) || [],
            };
          });

          setLogs(mappedResults);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
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
        logger.error('Routing logs fetch error', err);
        setError(getErrorMessage(err));
        }
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
    <>
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
            <div className="flex-row gap-12">
              {/* Demo Helper: Show current mode */}
              <div
                className={`fs-11 rounded-6 fw-600 cursor-default ${styles.roleBadge}`}
                data-role={isSuperAdmin ? 'admin' : 'org'}
              >
                {isSuperAdmin ? 'ADMIN' : 'ORG'}
              </div>

              {/* Scope Selector - Only for Superadmin */}
              {isSuperAdmin && (
                <>
                  <div className={`opacity-50 ${styles.divider}`} />
                  <div className={`gap-4 bg-surface rounded-6 border ${styles.scopeWrapper}`}>
                    <button
                      className={`py-4 px-12 fs-12 fw-600 rounded-4 border-none cursor-pointer ${styles.scopeBtn}`}
                      data-active={editMode === 'global'}
                      data-variant="global"
                      onClick={() => setEditMode('global')}
                    >
                      Global View
                    </button>
                    <button
                      className={`py-4 px-12 fs-12 fw-600 rounded-4 border-none cursor-pointer ${styles.scopeBtn}`}
                      data-active={editMode === 'org'}
                      data-variant="org"
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
              <div className="overflow-x-auto">
                <table className={`w-full text-left ${styles.logsTable}`}>
                  <thead>
                    <tr className="border-bottom">
                      <th className="p-12">Timestamp</th>
                      <th className="p-12">Notification Type</th>
                      <th className="p-12">Organisation</th>
                      <th className="p-12">Project</th>
                      <th className="p-12">Decision</th>
                      <th className="p-12">Recipients</th>
                      <th className="p-12">Channels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-bottom">
                        <td className="fs-sm p-12">{formatTimestamp(log.timestamp)}</td>
                        <td className="p-12">
                          <code className="fs-sm">{log.notification_type}</code>
                        </td>
                        <td className="p-12">{log.organisation || '-'}</td>
                        <td className="p-12">{log.project || '-'}</td>
                        <td className="p-12">
                          <Badge variant={getDecisionBadgeVariant(log.decision)}>
                            {log.decision}
                          </Badge>
                        </td>
                        <td className="p-12">
                          <Badge variant="info">{log.recipient_count}</Badge>
                        </td>
                        <td className="p-12">
                          <div className={`gap-4 flex-wrap ${styles.channelsFlex}`}>
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
    </>
  );
};

export default NotificationRoutingLogsPage;
