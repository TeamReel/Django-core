import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  Input,
  Badge,
  Card,
  Table,
  Alert,
  Button,
} from '@django-core/design-system';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Query params for filtering
  const eventType = searchParams.get('event_type') || '';
  const user = searchParams.get('user') || '';
  const page = searchParams.get('page') || '1';
  const limit = 50;

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

        const response = await fetch(
          `/api/audit/?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ListResponse<AuditEvent> = await response.json();
        setEvents(data.results || []);
        setTotal(data.count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit events');
        console.error('Audit fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditEvents();
  }, [eventType, user, page]);

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
    <div>
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
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => handleEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="audit-event-type-filter"
              >
                <option value="">All Events</option>
                <option value="user_login">User Login</option>
                <option value="user_logout">User Logout</option>
                <option value="org_created">Organisation Created</option>
                <option value="project_created">Project Created</option>
                <option value="permission_changed">Permission Changed</option>
                <option value="user_invited">User Invited</option>
                <option value="user_removed">User Removed</option>
                <option value="credits_used">Credits Used</option>
                <option value="credits_refunded">Credits Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter by User</label>
              <Input
                type="text"
                placeholder="Search by user name..."
                value={user}
                onChange={handleUserFilter}
                data-testid="audit-user-filter"
              />
            </div>
          </div>
        </Card>

        {/* Error state */}
        {error && (
          <Alert type="error" className="mb-4" data-testid="audit-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <Alert type="info" data-testid="audit-empty-state">
            No audit events found matching your filters.
          </Alert>
        )}

        {/* Audit events table */}
        {!loading && events.length > 0 && (
          <>
            <Table
              columns={[
                {
                  key: 'timestamp',
                  label: 'Time',
                },
                {
                  key: 'event_type',
                  label: 'Event',
                },
                {
                  key: 'user',
                  label: 'User',
                },
                {
                  key: 'resource',
                  label: 'Resource',
                },
                {
                  key: 'status',
                  label: 'Status',
                },
              ]}
              rows={events.map((event) => ({
                id: event.id,
                timestamp: (
                  <span
                    className="text-sm text-gray-600"
                    data-testid={`audit-timestamp-${event.id}`}
                  >
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                ),
                event_type: (
                  <Badge
                    variant={eventTypeColorMap[event.event_type] || 'secondary'}
                    data-testid={`audit-type-${event.id}`}
                  >
                    {event.event_type.replace(/_/g, ' ')}
                  </Badge>
                ),
                user: (
                  <span data-testid={`audit-user-${event.id}`}>
                    {event.user?.name || 'System'}
                  </span>
                ),
                resource: (
                  <span className="text-sm" data-testid={`audit-resource-${event.id}`}>
                    {String(event.metadata?.resource_type ?? '-')}
                  </span>
                ),
                status: (
                  <Badge
                    variant={
                      event.metadata?.status === 'success' ? 'success' : 'warning'
                    }
                    data-testid={`audit-status-${event.id}`}
                  >
                    {event.metadata?.status || 'unknown'}
                  </Badge>
                ),
              }))}
              loading={loading}
              data-testid="audit-table"
            />

            {/* Pagination */}
            <Card className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * limit + 1} to{' '}
                  {Math.min(currentPage * limit, total)} of {total} events
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    data-testid="audit-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm py-2 px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    data-testid="audit-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
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
      </PageContent>
    </div>
  );
};

export default AuditLogPage;
