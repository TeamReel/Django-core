import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import {
  Input,
  Badge,
  Card,
  Alert,
  Button,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { AuditEvent, ListResponse } from '../../types';

/**
 * T012 - Audit Log Page
 *
 * Purpose: Present audit events with type/user/date filters
 * - Shows 200+ seed events with pagination
 * - Supports query params for shareable URLs
 * - Uses F03 context headers for org-scoped data
 */
export const AuditLogPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Query params for filtering
  const eventType = searchParams.get('event_type') || '';
  const user = searchParams.get('user') || '';
  const outcome = searchParams.get('outcome') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = searchParams.get('page') || '1';
  const limit = 50;

  // Helper to determine event outcome
  const getEventOutcome = (event: AuditEvent): string => {
    const metadata = event.metadata || {};
    const permissionGranted = metadata.granted;

    if (event.event_type === 'permission.checked' && permissionGranted !== undefined) {
      return permissionGranted ? 'allowed' : 'denied';
    }

    const successEvents = ['auth.login', 'auth.logout', 'resource.created', 'role.assigned', 'config.updated'];
    const failureEvents = ['auth.login_failed'];

    if (successEvents.includes(event.event_type)) return 'success';
    if (failureEvents.includes(event.event_type)) return 'failed';

    return '';
  };

  // Fetch audit events
  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', ((parseInt(page) - 1) * limit).toString());
        if (eventType) {
          params.append('event_type', eventType);
        }
        if (user) {
          params.append('user__name__icontains', user);
        }
        if (dateFrom) {
          // Convert to ISO datetime format for Django
          params.append('created_at__gte', `${dateFrom}T00:00:00`);
        }
        if (dateTo) {
          // Convert to ISO datetime format for Django (end of day)
          params.append('created_at__lte', `${dateTo}T23:59:59`);
        }

        // Use relative URL to leverage Vite proxy (handles cookies correctly)
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(
          `${baseUrl}/api/v1/activity/?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Audit API error:', response.status, errorText);
          throw new Error(`Failed to load audit log. Backend error: ${response.status}`);
        }

        const rawData = await response.json();
        // Handle B13 response envelope
        const data = rawData.data || rawData;
        let filteredEvents = data.results || [];

        // Apply outcome filter client-side
        if (outcome) {
          filteredEvents = filteredEvents.filter((event: AuditEvent) => {
            const eventOutcome = getEventOutcome(event);
            return eventOutcome === outcome;
          });
        }

        setEvents(filteredEvents);
        setTotal(outcome ? filteredEvents.length : (data.count || 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log. Backend error.');
        console.error('Audit fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditEvents();
  }, [eventType, user, outcome, dateFrom, dateTo, page]);

  // WebSocket Integration for Real-time Updates
  useEffect(() => {
    // Only connect if we are on the first page and not filtering by date (live view)
    // Also wait for authUser to be loaded to ensure we have a session
    if (page !== '1' || dateFrom || dateTo || !authUser) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let isMounted = true;

    const connect = async () => {
      try {
        // Fetch WebSocket token via Vite proxy (handles cookies correctly)
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const tokenResponse = await fetch(`${baseUrl}/api/ws/token/`, {
            credentials: 'include',
        });

        if (!tokenResponse.ok) {
            console.error('[AuditLog] Failed to get WebSocket token', tokenResponse.status);
            reconnectTimer = setTimeout(connect, 5000);
            return;
        }

        const { token } = await tokenResponse.json();
        if (!isMounted) return;

        // Connect directly to backend (token-based auth bypasses CORS issues)
        // Replace http/https with ws/wss
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;

        console.log(`[AuditLog] Connecting to WebSocket at ${wsUrl}...`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[AuditLog] Connected to real-time updates');
        };

        ws.onmessage = (event) => {
          try {
            console.log('[AuditLog] Received message:', event.data);
            const data = JSON.parse(event.data);
            // Check if this is an audit event
            if (data.type === 'audit.created' && data.payload) {
              const newEvent = data.payload as AuditEvent;

              // Apply client-side filtering if needed
              if (eventType && newEvent.event_type !== eventType) return;

              setEvents(prev => {
                // Deduplicate based on ID
                if (prev.some(e => e.id === newEvent.id)) return prev;
                return [newEvent, ...prev].slice(0, limit);
              });
              setTotal(prev => prev + 1);
            }
          } catch (e) {
            console.error('[AuditLog] Failed to parse WebSocket message', e);
          }
        };

        ws.onclose = () => {
          console.log('[AuditLog] Disconnected');
          if (isMounted) {
            // Simple reconnect logic
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
      } catch (e) {
        console.error('[AuditLog] Connection failed', e);
        if (isMounted) {
            reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, [page, dateFrom, dateTo, eventType, authUser]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedEvent]);

  // Event type colors
  const eventTypeColorMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    user_login: 'success',
    user_logout: 'info',
    org_created: 'success',
    project_created: 'success',
    permission_changed: 'warning',
    user_invited: 'info',
    user_removed: 'error',
    credits_used: 'warning',
    credits_refunded: 'success',
  };

  const handleEventTypeFilter = (type: string) => {
    if (type) {
      searchParams.set('event_type', type);
    } else {
      searchParams.delete('event_type');
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleUserFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      searchParams.set('user', e.target.value);
    } else {
      searchParams.delete('user');
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handlePageChange = (newPage: number) => {
    searchParams.set('page', newPage.toString());
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page);

  return (
    <AppShell>
      <PageHeader
        title="Audit Log"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Audit Log' },
        ]}
      />

      <PageContent>
        {/* Filters */}
        <Card className="mb-4" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
            <div style={{ minWidth: '180px', flex: '0 0 180px' }}>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => handleEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="audit-event-type-filter"
              >
                <option value="">All Events</option>
                <option value="auth.login">Auth Login</option>
                <option value="auth.logout">Auth Logout</option>
                <option value="auth.login_failed">Auth Login Failed</option>
                <option value="permission.checked">Permission Checked</option>
                <option value="role.assigned">Role Assigned</option>
                <option value="config.updated">Config Updated</option>
                <option value="resource.created">Resource Created</option>
              </select>
            </div>
            <div style={{ minWidth: '180px', flex: '0 0 180px' }}>
              <label className="block text-sm font-medium mb-1">User</label>
              <Input
                type="text"
                placeholder="Search by user name..."
                value={user}
                onChange={handleUserFilter}
                data-testid="audit-user-filter"
              />
            </div>
            <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => {
                  if (e.target.value) {
                    searchParams.set('outcome', e.target.value);
                  } else {
                    searchParams.delete('outcome');
                  }
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="audit-outcome-filter"
              >
                <option value="">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
              </select>
            </div>
            <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  if (e.target.value) {
                    searchParams.set('date_from', e.target.value);
                  } else {
                    searchParams.delete('date_from');
                  }
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
                data-testid="audit-date-from-filter"
              />
            </div>
            <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  if (e.target.value) {
                    searchParams.set('date_to', e.target.value);
                  } else {
                    searchParams.delete('date_to');
                  }
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
                data-testid="audit-date-to-filter"
              />
            </div>
            <div style={{ minWidth: '120px', flex: '0 0 120px' }}>
              <label className="block text-sm font-medium mb-1" style={{ visibility: 'hidden' }}>Clear</label>
              <button
                onClick={() => {
                  searchParams.delete('event_type');
                  searchParams.delete('user');
                  searchParams.delete('outcome');
                  searchParams.delete('date_from');
                  searchParams.delete('date_to');
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #6c757d',
                  backgroundColor: 'var(--app-surface)',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  width: '100%',
                  height: '38px',
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </Card>

        {/* Error state */}
        {error && !loading && (
          <Alert variant="error" className="mb-4" data-testid="audit-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <Alert variant="info" data-testid="audit-empty-state">
            {eventType || user
              ? 'No audit events found matching your filters.'
              : 'No audit events recorded yet.'}
          </Alert>
        )}

        {/* Audit events table */}
        {!loading && events.length > 0 && (
          <>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>Outcome</th>
                    <th>Target</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    // Extract outcome from various possible sources
                    const outcome =
                      (event as any).outcome ||
                      (event as any).result ||
                      event.metadata?.decision ||
                      null;

                    // Special handling for permission.checked events
                    const permissionGranted = event.event_type === 'permission.checked'
                      ? event.metadata?.granted
                      : null;

                    const getOutcomeBadge = () => {
                      // Handle permission.checked specifically
                      if (permissionGranted !== null && permissionGranted !== undefined) {
                        return (
                          <Badge
                            variant={permissionGranted ? 'success' : 'error'}
                            data-testid={`audit-outcome-${event.id}`}
                          >
                            {permissionGranted ? 'allowed' : 'denied'}
                          </Badge>
                        );
                      }

                      // Infer success from event type for certain events
                      const successEventTypes = ['auth.login', 'auth.logout', 'resource.created', 'role.assigned', 'config.updated'];
                      const failureEventTypes = ['auth.login_failed'];

                      if (successEventTypes.includes(event.event_type)) {
                        return (
                          <Badge variant="success" data-testid={`audit-outcome-${event.id}`}>
                            success
                          </Badge>
                        );
                      }

                      if (failureEventTypes.includes(event.event_type)) {
                        return (
                          <Badge variant="error" data-testid={`audit-outcome-${event.id}`}>
                            failed
                          </Badge>
                        );
                      }

                      // Handle other outcome fields
                      if (!outcome) {
                        return <span className="text-sm text-gray-500">–</span>;
                      }

                      const outcomeStr = String(outcome).toLowerCase();
                      let variant: 'success' | 'error' | 'default' = 'default';

                      if (outcomeStr === 'success' || outcomeStr === 'allowed') {
                        variant = 'success';
                      } else if (outcomeStr === 'failed' || outcomeStr === 'denied') {
                        variant = 'error';
                      }

                      return (
                        <Badge variant={variant} data-testid={`audit-outcome-${event.id}`}>
                          {outcome}
                        </Badge>
                      );
                    };

                    // Get target display
                    const getTargetDisplay = () => {
                      // Prefer resource_display if available
                      if ((event as any).resource_display) {
                        return (event as any).resource_display;
                      }

                      // Show resource_type with ID if available
                      if (event.metadata?.resource_type) {
                        return event.metadata.resource_id
                          ? `${event.metadata.resource_type} #${event.metadata.resource_id}`
                          : event.metadata.resource_type;
                      }

                      return '–';
                    };

                    return (
                      <tr key={event.id}>
                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <Badge
                            variant={eventTypeColorMap[event.event_type] || 'secondary'}
                            data-testid={`audit-type-${event.id}`}
                          >
                            {event.event_type.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {event.user?.name || 'System'}
                        </td>
                        <td>{getOutcomeBadge()}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {getTargetDisplay()}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedEvent(event)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              color: '#007bff',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                            data-testid={`audit-details-${event.id}`}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            {/* Pagination */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                data-testid="audit-prev-page"
              >
                Previous
              </Button>
              <span style={{ fontSize: '0.875rem', color: 'var(--app-muted-text)' }}>
                Page {currentPage} of {totalPages} ({total} total events)
              </span>
              <Button
                variant="secondary"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                data-testid="audit-next-page"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading audit events...
            </div>
          </Card>
        )}

        {/* Details Modal */}
        {selectedEvent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedEvent(null)}
            data-testid="audit-details-modal"
          >
            <div
              style={{
                backgroundColor: 'var(--app-surface)',
                borderRadius: '8px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                padding: '24px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--app-text)' }}>
                  Audit Event Details
                </h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: 'var(--app-text)',
                    padding: '0 8px',
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Event ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--app-text)' }}>{selectedEvent.id}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Timestamp (ISO)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--app-text)' }}>
                    {new Date(selectedEvent.timestamp).toISOString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Event Type</div>
                  <div style={{ fontSize: '14px', color: 'var(--app-text)' }}>{selectedEvent.event_type}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>User</div>
                  <div style={{ fontSize: '14px', color: 'var(--app-text)' }}>
                    {selectedEvent.user?.name || 'System'}
                    {selectedEvent.user?.email && ` (${selectedEvent.user.email})`}
                  </div>
                </div>

                {selectedEvent.organisation_id && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Organisation ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--app-text)' }}>
                      {selectedEvent.organisation_id}
                    </div>
                  </div>
                )}

                {selectedEvent.project_id && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Project ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--app-text)' }}>
                      {selectedEvent.project_id}
                    </div>
                  </div>
                )}

                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Metadata</div>
                    <pre style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      backgroundColor: 'var(--app-surface-2)',
                      padding: '12px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '300px',
                      color: 'var(--app-text)',
                      border: '1px solid var(--app-border)',
                    }}>
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </AppShell>
  );
};

export default AuditLogPage;
