import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import {
  Card,
  Badge,
  Alert,
  Button,
  Input,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import AppShell from '../../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';

interface UsageEvent {
  id: string;
  timestamp: string;
  event_type: string;
  user?: any;
  user_email?: string;
  user_full_name?: string;
  organization?: any;
  organization_name?: string;
  project?: any;
  project_name?: string;
  metadata: Record<string, any>;
}

export const UsageEventsPage: React.FC = () => {
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<UsageEvent | null>(null);
  const [editMode, setEditMode] = useState<'global' | 'org'>(
    () => (localStorage.getItem('usage-events-edit-mode') as 'global' | 'org') || 'org'
  );

  // Query params for filtering
  const eventType = searchParams.get('event_type') || '';
  const userFilter = searchParams.get('user') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = searchParams.get('page') || '1';
  const limit = 50;

  // Derived state from context switcher
  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';
  const currentOrganisation = context.organisation;
  const currentProject = context.project;

  // Check if user is superadmin
  const isSuperadmin = (user as any)?.is_superuser || (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin';

  console.log('[UsageEventsPage] User:', user, 'isSuperadmin:', isSuperadmin);

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

  // Custom handler to switch organisation without page reload
  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    console.log('[UsageEventsPage] Switching to org:', option.label, option.id);

    // Update localStorage and automatically switch to org mode
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    localStorage.setItem('usage-events-edit-mode', 'org'); // Auto-switch to org mode
    window.location.reload();
  };

  // Persist editMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('usage-events-edit-mode', editMode);
  }, [editMode]);

  // Force non-superadmins to org mode
  useEffect(() => {
    if (!isSuperadmin && currentOrgId && editMode !== 'org') {
      setEditMode('org');
    }
  }, [isSuperadmin, currentOrgId, editMode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params based on mode
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      let url = `${baseUrl}/api/v1/usage-events/`;
      const params = new URLSearchParams();

      // In org mode, filter by current organization
      if (editMode === 'org' && currentOrganisation) {
        params.append('organization_id', currentOrganisation.id);
      }
      // In global mode (superadmin only), fetch all events - no org filter

      // Add pagination
      params.append('page_size', limit.toString());
      params.append('page', page);

      // Add filters
      if (eventType) {
        params.append('event_type', eventType);
      }
      if (userFilter) {
        params.append('user__email__icontains', userFilter);
      }
      if (dateFrom) {
        params.append('timestamp__gte', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        params.append('timestamp__lte', `${dateTo}T23:59:59`);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('[UsageEventsPage] Fetching events from:', url, 'mode:', editMode);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      console.log('[UsageEventsPage] Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[UsageEventsPage] Response data:', result);
        console.log('[UsageEventsPage] result.data:', result.data);
        console.log('[UsageEventsPage] result.data.count:', result.data?.count);
        console.log('[UsageEventsPage] result.meta:', result.meta);

        // Extract from B13 envelope - handle DRF pagination
        let eventList: UsageEvent[] = [];
        let totalCount = 0;

        if (result.data?.data?.results) {
          // B13 wrapper + DRF pagination: {status, data: {data: {count, results}}, meta}
          eventList = result.data.data.results;
          totalCount = result.data.data.count || eventList.length;
        } else if (result.data?.data && Array.isArray(result.data.data)) {
          // B13 wrapper with nested data array: {status, data: {data: [...]}, meta}
          eventList = result.data.data;
          totalCount = result.data?.count || result.meta?.pagination?.count || eventList.length;
        } else if (result.data?.results) {
          // B13 wrapper with results: {status, data: {results}, meta}
          eventList = result.data.results;
          totalCount = result.data?.count || eventList.length;
        } else if (result.data && Array.isArray(result.data)) {
          // B13 wrapper with array: {status, data: [...], meta}
          eventList = result.data;
          totalCount = result.meta?.pagination?.count || eventList.length;
        } else if (Array.isArray(result)) {
          // Direct array
          eventList = result;
          totalCount = eventList.length;
        }

        console.log('[UsageEventsPage] Extracted events:', eventList, 'Total:', totalCount);
        setEvents(eventList);
        setTotal(totalCount);
        setDemoMode(false);
      } else if (response.status === 404) {
        // Demo mode: Use mock usage events
        const demoEvents: UsageEvent[] = [
          {
            id: 'demo-1',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            event_type: 'project.created',
            user_email: 'admin@example.com',
            user_full_name: 'Admin User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            project_name: currentProject?.name || 'Demo Project',
            metadata: { source: 'demo', action: 'create' },
          },
          {
            id: 'demo-2',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            event_type: 'user.login',
            user_email: 'coach@example.com',
            user_full_name: 'Coach User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            metadata: { source: 'demo', ip: '192.168.1.1' },
          },
          {
            id: 'demo-3',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            event_type: 'api.request',
            user_email: 'player@example.com',
            user_full_name: 'Player User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            project_name: currentProject?.name,
            metadata: { source: 'demo', endpoint: '/api/v1/projects/' },
          },
        ];
        setEvents(demoEvents);
        setDemoMode(true);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage events');
      console.error('Usage events fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentOrganisation, currentProject, editMode, eventType, userFilter, dateFrom, dateTo, page]);

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

  const handleGenerateTestEvent = async () => {
    // In org mode, ensure org is selected
    if (editMode === 'org' && !currentOrganisation) {
      setError('Please select an organisation first');
      return;
    }

    if (!user || !(user as any).id) {
      setError('User information not available');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const userId = (user as any).id;

      // In global mode, don't set organization or project
      const testEvent: any = {
        event_type: 'test_action',
        user_id: userId,
        metadata: { source: 'demo', mode: editMode },
      };

      // Only add organization/project in org mode
      if (editMode === 'org' && currentOrganisation) {
        testEvent.organization_id = currentOrganisation.id;
        testEvent.project_id = currentProject?.id || null;
      }

      // Optimistic update: add to UI immediately
      const optimisticEvent: UsageEvent = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'test_action',
        user_email: (user as any).email,
        user_full_name: (user as any).name || (user as any).email,
        organization_name: editMode === 'org' ? currentOrganisation?.name : undefined,
        project_name: editMode === 'org' ? currentProject?.name : undefined,
        metadata: { source: 'demo', mode: editMode },
      };
      setEvents([optimisticEvent, ...events]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (!demoMode) {
        // Try to POST to backend
        const csrfToken = getCookie('csrftoken');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/usage-events/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken || '',
          },
          credentials: 'include',
          body: JSON.stringify(testEvent),
        });

        if (response.ok) {
          // Backend accepted: refresh list to get real ID
          await fetchEvents();
        } else {
          // Log error for debugging
          const errorData = await response.json().catch(() => null);
          console.error('Backend error:', response.status, errorData);

          if (response.status === 404) {
            // Backend not available: keep optimistic update
            setDemoMode(true);
          } else {
            // Show error but keep optimistic update
            setError(`Backend error: ${response.status} - ${JSON.stringify(errorData)}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate test event:', err);
      // Keep optimistic update even if backend fails
    } finally {
      setGenerating(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  function getCookie(name: string) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  return (
    <AppShell>
      <PageHeader
        title="Usage Events"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Usage Events' },
          ...(isSuperadmin && editMode === 'global'
            ? [{ label: 'Global View' }]
            : [{
                label: isSuperadmin ? (
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
              backgroundColor: isSuperadmin ? '#3b82f6' : '#a855f7',
              color: 'white',
              fontWeight: 600,
              letterSpacing: '0.5px',
              cursor: 'default',
            }}>
              {isSuperadmin ? '👑 ADMIN' : '👤 ORG'}
            </div>

            {/* Scope Selector - Only for Superadmin */}
            {isSuperadmin && (
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
                    Organisation View
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <PageContent>
        {/* Filters */}
        <Card className="mb-4" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => {
                  if (e.target.value) {
                    searchParams.set('event_type', e.target.value);
                  } else {
                    searchParams.delete('event_type');
                  }
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Event Types</option>
                <option value="user.login">User Login</option>
                <option value="user.logout">User Logout</option>
                <option value="user.profile_updated">User Profile Updated</option>
                <option value="project.created">Project Created</option>
                <option value="project.updated">Project Updated</option>
                <option value="project.archived">Project Archived</option>
                <option value="project.deleted">Project Deleted</option>
                <option value="organization.settings_changed">Organization Settings Changed</option>
                <option value="organization.member_added">Organization Member Added</option>
                <option value="organization.member_removed">Organization Member Removed</option>
                <option value="api.request">API Request</option>
                <option value="feature.enabled">Feature Enabled</option>
                <option value="feature.disabled">Feature Disabled</option>
                <option value="notification.sent">Notification Sent</option>
                <option value="notification.read">Notification Read</option>
                <option value="document.uploaded">Document Uploaded</option>
                <option value="document.downloaded">Document Downloaded</option>
                <option value="search.performed">Search Performed</option>
                <option value="export.generated">Export Generated</option>
                <option value="import.completed">Import Completed</option>
                <option value="permission.granted">Permission Granted</option>
                <option value="permission.revoked">Permission Revoked</option>
                <option value="audit.log_viewed">Audit Log Viewed</option>
                <option value="session.expired">Session Expired</option>
              </select>
            </div>
            <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
              <label className="block text-sm font-medium mb-1">User Email</label>
              <Input
                type="text"
                placeholder="Search by email..."
                value={userFilter}
                onChange={(e) => {
                  if (e.target.value) {
                    searchParams.set('user', e.target.value);
                  } else {
                    searchParams.delete('user');
                  }
                  searchParams.set('page', '1');
                  setSearchParams(searchParams);
                }}
              />
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
              />
            </div>
            {(eventType || userFilter || dateFrom || dateTo) && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    searchParams.delete('event_type');
                    searchParams.delete('user');
                    searchParams.delete('date_from');
                    searchParams.delete('date_to');
                    searchParams.set('page', '1');
                    setSearchParams(searchParams);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Context Info */}
        {!isSuperadmin && currentOrgName && (
          <Alert variant="info" className="mb-4">
            <strong>Organisation Context:</strong> Viewing usage events for <strong>{currentOrgName}</strong>.
            {currentProject && ` / Project: ${currentProject.name}`}
          </Alert>
        )}

        {isSuperadmin && editMode === 'org' && !currentOrgId && (
          <Alert variant="info" className="mb-4">
            <strong>Select Organisation:</strong> Please select an organisation from the dropdown above to view its events.
          </Alert>
        )}

        {isSuperadmin && editMode === 'global' && (
          <Alert variant="info" className="mb-4">
            <strong>Global View Mode:</strong> Viewing all usage events across all organisations.
          </Alert>
        )}

        {demoMode && (
          <Alert variant="warning" className="mb-4">
            <strong>Demo Mode:</strong> Using mock data. Backend API not available.
          </Alert>
        )}

          {success && (
            <Alert variant="success" className="mb-4">
              Test usage event generated successfully!
            </Alert>
          )}

          {error && (
            <Alert variant="error" className="mb-4">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          <Card className="mb-4">
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button
                onClick={handleGenerateTestEvent}
                disabled={generating || !currentOrganisation}
                variant="primary"
              >
                {generating ? 'Generating...' : '🧪 Generate Test Usage Event'}
              </Button>
              <span style={{ fontSize: '0.875rem', color: 'var(--app-muted-text)' }}>
                Demo action: Creates a random usage event in the current context
              </span>
            </div>
          </Card>

          {loading && (
            <Card>
              <div className="p-6 text-center">Loading usage events...</div>
            </Card>
          )}

          {!loading && events.length === 0 && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                No usage events recorded yet. Generate a test event to see how they appear.
              </div>
            </Card>
          )}

          {!loading && events.length > 0 && (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>Organization</th>
                    <th>Project</th>
                    <th>Metadata</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(event.timestamp)}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{event.event_type}</code>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {event.user_email || event.user || '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {event.organization_name || event.organization || '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {event.project_name || event.project || '-'}
                      </td>
                      <td style={{ fontSize: '0.75rem', maxWidth: '200px' }}>
                        {event.metadata && Object.keys(event.metadata).length > 0 ? (
                          <code style={{
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {JSON.stringify(event.metadata)}
                          </code>
                        ) : (
                          '-'
                        )}
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
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          {/* Pagination */}
          {!loading && events.length > 0 && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const newPage = Math.max(1, parseInt(page) - 1);
                  searchParams.set('page', newPage.toString());
                  setSearchParams(searchParams);
                }}
                disabled={parseInt(page) <= 1}
              >
                Previous
              </Button>
              <span style={{ fontSize: '0.875rem', color: 'var(--app-muted-text)' }}>
                Page {page} of {Math.ceil(total / limit)} ({total} total events)
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  const newPage = parseInt(page) + 1;
                  searchParams.set('page', newPage.toString());
                  setSearchParams(searchParams);
                }}
                disabled={parseInt(page) >= Math.ceil(total / limit)}
              >
                Next
              </Button>
            </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--app-text)' }}>
                  Usage Event Details
                </h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    fontSize: '24px',
                    border: 'none',
                    background: 'none',
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
                    {selectedEvent.user_full_name || selectedEvent.user_email || selectedEvent.user || 'System'}
                    {selectedEvent.user_email && ` (${selectedEvent.user_email})`}
                  </div>
                </div>

                {selectedEvent.organization_name && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Organization</div>
                    <div style={{ fontSize: '14px', color: 'var(--app-text)' }}>
                      {selectedEvent.organization_name}
                    </div>
                  </div>
                )}

                {selectedEvent.project_name && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Project</div>
                    <div style={{ fontSize: '14px', color: 'var(--app-text)' }}>
                      {selectedEvent.project_name}
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

export default UsageEventsPage;
