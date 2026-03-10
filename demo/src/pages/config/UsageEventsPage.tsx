import React from 'react';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
} from '@django-core/page-templates';
import { Card, Alert, Button } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { useUsageEvents, formatTimestamp } from './useUsageEvents';
import { UsageEventsFilters } from './UsageEventsFilters';
import { UsageEventDetailModal } from './UsageEventDetailModal';
import styles from './UsageEventsPage.module.css';

export const UsageEventsPage: React.FC = () => {
  const d = useUsageEvents();

  return (
    <>
      <PageHeader
        title="Usage Events"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Usage Events' },
          ...(d.isSuperadmin && d.editMode === 'global'
            ? [{ label: 'Global View' }]
            : [{
                label: d.isSuperadmin ? (
                  <BreadcrumbContextSwitcher
                    currentId={d.currentOrgId || ''}
                    options={d.organisationOptions}
                    onSelect={d.handleOrganisationSwitch}
                    hasDropdown={true}
                    type="organisation"
                  />
                ) : (d.currentOrgName || 'Organisation')
              }]
          )
        ]}
        actions={
          <div className="flex-row gap-12">
            {/* Role badge */}
            <div className={`fs-11 rounded-6 fw-600 cursor-default ${styles.roleBadge}`} data-role={d.isSuperadmin ? 'admin' : 'org'}>
              {d.isSuperadmin ? '👑 ADMIN' : '👤 ORG'}
            </div>

            {/* Scope toggle — superadmin only */}
            {d.isSuperadmin && (
              <>
                <div className={`opacity-50 ${styles.scopeDivider}`} />
                <ScopeToggle editMode={d.editMode} onSetEditMode={d.setEditMode} />
              </>
            )}
          </div>
        }
      />

      <PageContent>
        <UsageEventsFilters
          eventType={d.eventType}
          userFilter={d.userFilter}
          dateFrom={d.dateFrom}
          dateTo={d.dateTo}
          searchParams={d.searchParams}
          setSearchParams={d.setSearchParams}
        />

        <AlertBanners
          isSuperadmin={d.isSuperadmin}
          editMode={d.editMode}
          currentOrgId={d.currentOrgId}
          currentOrgName={d.currentOrgName}
          currentProject={d.currentProject}
          demoMode={d.demoMode}
          success={d.success}
          error={d.error}
        />

        <Card className="mb-4">
          <div className="p-24 flex-row gap-16">
            <Button
              onClick={d.handleGenerateTestEvent}
              disabled={d.generating || !d.currentOrganisation}
              variant="primary"
            >
              {d.generating ? 'Generating...' : '🧪 Generate Test Usage Event'}
            </Button>
            <span className="fs-14 text-muted" />
          </div>
        </Card>

        {d.loading && (
          <Card><div className="p-6 text-center">Loading usage events...</div></Card>
        )}

        {!d.loading && d.events.length === 0 && (
          <Card>
            <div className="p-6 text-center text-gray-500">
              No usage events recorded yet. Generate a test event to see how they appear.
            </div>
          </Card>
        )}

        {!d.loading && d.events.length > 0 && (
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
                {d.events.map((event) => (
                  <tr key={event.id}>
                    <td className="fs-sm whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td>
                      <code className="fs-sm">{event.event_type}</code>
                    </td>
                    <td className="fs-sm">
                      {event.user_email || (typeof event.user === 'string' ? event.user : null) || '-'}
                    </td>
                    <td className="fs-sm">
                      {event.organization_name || (typeof event.organization === 'string' ? event.organization : null) || '-'}
                    </td>
                    <td className="fs-sm">
                      {event.project_name || (typeof event.project === 'string' ? event.project : null) || '-'}
                    </td>
                    <td className={styles.metadataCell}>
                      {event.metadata && Object.keys(event.metadata).length > 0 ? (
                        <code className="block truncate">
                          {JSON.stringify(event.metadata)}
                        </code>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => d.setSelectedEvent(event)}
                        className={`px-8 py-4 fs-12 border-none cursor-pointer bg-transparent ${styles.detailsButton}`}
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
        {!d.loading && d.events.length > 0 && (
          <div className={`flex-center gap-12 ${styles.pagination}`}>
            <Button
              variant="secondary"
              onClick={() => {
                const newPage = Math.max(1, parseInt(d.page) - 1);
                d.searchParams.set('page', newPage.toString());
                d.setSearchParams(d.searchParams);
              }}
              disabled={parseInt(d.page) <= 1}
            >
              Previous
            </Button>
            <span className="fs-14 text-muted">
              Page {d.page} of {d.totalPages} ({d.total} total events)
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                const newPage = parseInt(d.page) + 1;
                d.searchParams.set('page', newPage.toString());
                d.setSearchParams(d.searchParams);
              }}
              disabled={parseInt(d.page) >= d.totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Detail modal */}
        {d.selectedEvent && (
          <UsageEventDetailModal
            event={d.selectedEvent}
            onClose={() => d.setSelectedEvent(null)}
          />
        )}
      </PageContent>
    </>
  );
};

export default UsageEventsPage;

/* ─── local sub-components ─── */

const ScopeToggle: React.FC<{
  editMode: 'global' | 'org';
  onSetEditMode: (m: 'global' | 'org') => void;
}> = ({ editMode, onSetEditMode }) => (
  <div className={`gap-4 bg-surface rounded-6 border ${styles.scopeToggle}`}>
    {(['global', 'org'] as const).map((mode) => (
      <button
        key={mode}
        className="py-4 px-12 fs-12 fw-600 rounded-4 border-none cursor-pointer"
        style={{
          transition: 'all 0.2s',
          backgroundColor: editMode === mode
            ? (mode === 'global' ? 'var(--color-blue-500)' : '#a855f7')
            : 'transparent',
          color: editMode === mode ? 'white' : 'var(--app-text)',
        }}
        onClick={() => onSetEditMode(mode)}
      >
        {mode === 'global' ? 'Global View' : 'Organisation View'}
      </button>
    ))}
  </div>
);

const AlertBanners: React.FC<{
  isSuperadmin: boolean;
  editMode: string;
  currentOrgId: string | null;
  currentOrgName: string;
  currentProject: { id?: string; name?: string } | null;
  demoMode: boolean;
  success: boolean;
  error: string | null;
}> = ({ isSuperadmin, editMode, currentOrgId, currentOrgName, currentProject, demoMode, success, error }) => (
  <>
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
  </>
);
