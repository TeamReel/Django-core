import React from 'react';
import { Input, Badge, Card, Alert, Button } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useAuditLogData, eventTypeColorMap, getEventOutcome } from './useAuditLogData';
import { AuditLogDetailModal } from './AuditLogDetailModal';
import type { AuditEvent } from '../../types';
import styles from './AuditLogPage.module.css';

/**
 * T012 - Audit Log Page
 *
 * Purpose: Present audit events with type/user/date filters
 * - Supports query params for shareable URLs
 * - Uses F03 context headers for org-scoped data
 * - WebSocket real-time updates
 */
export const AuditLogPage: React.FC = () => {
  const d = useAuditLogData();

  return (
    <>
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
        <Card className="mb-4 min-w-0">
          <div className={styles.filterRow}>
            <div className={styles.filterColWide}>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                value={d.eventType}
                onChange={(e) => d.handleEventTypeFilter(e.target.value)}
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
            <div className={styles.filterColWide}>
              <label className="block text-sm font-medium mb-1">User</label>
              <Input
                type="text"
                placeholder="Search by user name..."
                value={d.user}
                onChange={d.handleUserFilter}
                data-testid="audit-user-filter"
              />
            </div>
            <div className={styles.filterColMedium}>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select
                value={d.outcome}
                onChange={(e) => {
                  if (e.target.value) d.searchParams.set('outcome', e.target.value);
                  else d.searchParams.delete('outcome');
                  d.searchParams.set('page', '1');
                  d.setSearchParams(d.searchParams);
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
            <div className={styles.filterColMedium}>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <Input
                type="date"
                value={d.dateFrom}
                onChange={(e) => {
                  if (e.target.value) d.searchParams.set('date_from', e.target.value);
                  else d.searchParams.delete('date_from');
                  d.searchParams.set('page', '1');
                  d.setSearchParams(d.searchParams);
                }}
                data-testid="audit-date-from-filter"
              />
            </div>
            <div className={styles.filterColMedium}>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <Input
                type="date"
                value={d.dateTo}
                onChange={(e) => {
                  if (e.target.value) d.searchParams.set('date_to', e.target.value);
                  else d.searchParams.delete('date_to');
                  d.searchParams.set('page', '1');
                  d.setSearchParams(d.searchParams);
                }}
                data-testid="audit-date-to-filter"
              />
            </div>
            <div className={styles.filterColNarrow}>
              <label className={`block text-sm font-medium mb-1 ${styles.hiddenLabel}`}>Clear</label>
              <button
                onClick={() => {
                  d.searchParams.delete('event_type');
                  d.searchParams.delete('user');
                  d.searchParams.delete('outcome');
                  d.searchParams.delete('date_from');
                  d.searchParams.delete('date_to');
                  d.searchParams.set('page', '1');
                  d.setSearchParams(d.searchParams);
                }}
                className={styles.clearButton}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </Card>

        {/* Error */}
        {d.error && !d.loading && (
          <Alert variant="error" className="mb-4" data-testid="audit-error-alert">{d.error}</Alert>
        )}

        {/* Empty */}
        {!d.loading && !d.error && d.events.length === 0 && (
          <Alert variant="info" data-testid="audit-empty-state">
            {d.eventType || d.user ? 'No audit events found matching your filters.' : 'No audit events recorded yet.'}
          </Alert>
        )}

        {/* Events table */}
        {!d.loading && d.events.length > 0 && (
          <>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Timestamp</th><th>Event Type</th><th>User</th>
                    <th>Outcome</th><th>Target</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.events.map((event) => (
                    <AuditRow
                      key={event.id}
                      event={event}
                      onSelect={() => d.setSelectedEvent(event)}
                    />
                  ))}
                </tbody>
              </Table>
            </Card>

            {/* Pagination */}
            <div className={`flex-center gap-12 ${styles.pagination}`}>
              <Button
                variant="secondary"
                onClick={() => d.handlePageChange(d.currentPage - 1)}
                disabled={d.currentPage <= 1}
                data-testid="audit-prev-page"
              >
                Previous
              </Button>
              <span className={styles.paginationText}>
                Page {d.currentPage} of {d.totalPages} ({d.total} total events)
              </span>
              <Button
                variant="secondary"
                onClick={() => d.handlePageChange(d.currentPage + 1)}
                disabled={d.currentPage >= d.totalPages}
                data-testid="audit-next-page"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Loading */}
        {d.loading && (
          <Card>
            <div className="text-center py-8 text-gray-500">Loading audit events...</div>
          </Card>
        )}

        {/* Details modal */}
        <AuditLogDetailModal
          event={d.selectedEvent}
          onClose={() => d.setSelectedEvent(null)}
        />
      </PageContent>
    </>
  );
};

export default AuditLogPage;

/* ─── Extracted table row (DRY: keeps per-row render helpers local) ─── */

const AuditRow: React.FC<{ event: AuditEvent; onSelect: () => void }> = ({ event, onSelect }) => {
  const permissionGranted = event.event_type === 'permission.checked' ? event.metadata?.granted : null;
  const outcomeField = (event as any).outcome || (event as any).result || event.metadata?.decision || null;

  const outcomeBadge = (() => {
    if (permissionGranted !== null && permissionGranted !== undefined) {
      return <Badge variant={permissionGranted ? 'success' : 'error'} data-testid={`audit-outcome-${event.id}`}>{permissionGranted ? 'allowed' : 'denied'}</Badge>;
    }
    const successTypes = ['auth.login', 'auth.logout', 'resource.created', 'role.assigned', 'config.updated'];
    const failureTypes = ['auth.login_failed'];
    if (successTypes.includes(event.event_type)) return <Badge variant="success" data-testid={`audit-outcome-${event.id}`}>success</Badge>;
    if (failureTypes.includes(event.event_type)) return <Badge variant="error" data-testid={`audit-outcome-${event.id}`}>failed</Badge>;
    if (!outcomeField) return <span className="text-sm text-gray-500">–</span>;
    const s = String(outcomeField).toLowerCase();
    const v = s === 'success' || s === 'allowed' ? 'success' : s === 'failed' || s === 'denied' ? 'error' : 'default' as const;
    return <Badge variant={v} data-testid={`audit-outcome-${event.id}`}>{outcomeField}</Badge>;
  })();

  const target = (() => {
    if ((event as any).resource_display) return (event as any).resource_display;
    if (event.metadata?.resource_type) {
      return event.metadata.resource_id ? `${event.metadata.resource_type} #${event.metadata.resource_id}` : event.metadata.resource_type;
    }
    return '–';
  })();

  return (
    <tr>
      <td className="fs-sm whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td>
      <td>
        <Badge variant={eventTypeColorMap[event.event_type] || 'secondary' as any} data-testid={`audit-type-${event.id}`}>
          {event.event_type.replace(/_/g, ' ')}
        </Badge>
      </td>
      <td className="fs-sm">{event.user?.name || 'System'}</td>
      <td>{outcomeBadge}</td>
      <td className="fs-sm">{target}</td>
      <td>
        <button
          onClick={onSelect}
          className={styles.detailsButton}
          data-testid={`audit-details-${event.id}`}
        >
          Details
        </button>
      </td>
    </tr>
  );
};
