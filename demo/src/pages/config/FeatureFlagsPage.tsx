/**
 * T013 - Feature Flags Page (GLOBAL Management)
 *
 * Purpose: GLOBAL feature flags management for superadmins only
 * - Superadmin: Manages global defaults (master switches for the app)
 * - Org Admin: Redirected to organisation Settings page
 * - Resolution hierarchy: Global (disabled) > Org override > Project override
 */

import React from 'react';
import {
  Card,
  Badge,
  Alert,
  Button,
} from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useFeatureFlagsData } from './useFeatureFlagsData';
import styles from './FeatureFlagsPage.module.css';

export const FeatureFlagsPage: React.FC = () => {
  const d = useFeatureFlagsData();

  if (d.loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Feature Flags"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Feature Flags' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading feature flags...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Feature Flags - Global Management"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Feature Flags' },
          { label: 'Global Defaults' }
        ]}
        actions={
          <div className="flex-row gap-12">
            <div className={`fs-11 rounded-6 fw-600 cursor-default ${styles.superadminBadge}`}>
              👑 SUPERADMIN
            </div>
          </div>
        }
      />

      <PageContent>
        {d.seedMessage && (
          <Alert variant="info" className="mb-4">
            {d.seedMessage}
          </Alert>
        )}

        <Alert variant="info" className="mb-4">
          <strong>Global Feature Flags:</strong> These are master switches for the entire application.
          When a global flag is <strong>disabled</strong>, it overrides all organisation and project settings.
          Organisations can create more restrictive overrides (disable when global is enabled) but cannot enable when global is disabled.
          <br /><br />
          To manage organisation-specific overrides, go to <strong>Organisation → Settings tab</strong>.
        </Alert>

        {/* Filters */}
        <div className="flex-row flex-wrap gap-12 mb-16">
          <select
            value={d.filterType}
            onChange={(e) => d.setFilterType(e.target.value)}
            className="py-8 px-12 border rounded-4 fs-14 bg-surface"
          >
            <option value="all">Type: All</option>
            {d.uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={d.filterSubtype}
            onChange={(e) => d.setFilterSubtype(e.target.value)}
            className="py-8 px-12 border rounded-4 fs-14 bg-surface"
          >
            <option value="all">Subtype: All</option>
            {d.uniqueSubtypes.map((subtype) => (
              <option key={subtype} value={subtype}>{subtype}</option>
            ))}
          </select>
          <select
            value={d.filterStyle}
            onChange={(e) => d.setFilterStyle(e.target.value)}
            className="py-8 px-12 border rounded-4 fs-14 bg-surface"
          >
            <option value="all">Style: All</option>
            {d.uniqueStyles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
          <div className="ml-auto flex-row gap-8">
            {d.someSelected && (
              <>
                <span className="fs-13 text-muted">
                  {d.selectedIds.size} selected
                </span>
                <Button
                  variant="primary"
                  size="md"
                  disabled={d.bulkUpdating}
                  onClick={() => d.handleBulkUpdate(true)}
                >
                  {d.bulkUpdating ? '...' : 'Enable Selected'}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  disabled={d.bulkUpdating}
                  onClick={() => d.handleBulkUpdate(false)}
                >
                  {d.bulkUpdating ? '...' : 'Disable Selected'}
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={d.handleClearFilters}>
              Clear
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={d.syncing}
              onClick={d.handleSyncFlags}
            >
              {d.syncing ? 'Syncing...' : '🔄 Sync Templates'}
            </Button>
          </div>
        </div>

        {/* Flags Table */}
        <Card>
          {d.apiError ? (
            <div className="p-8 text-center">
              <div className="text-red-500 font-medium mb-2">Access Denied</div>
              <div className="text-gray-500 mb-4">{d.apiError}</div>
              <Button variant="primary" onClick={() => window.location.href = '/admin/login/?next=/config/feature-flags'}>
                Log in to Backend
              </Button>
              <div className="mt-4 text-xs text-gray-400">
                (Demo Shell requires a valid backend session for this page)
              </div>
            </div>
          ) : d.displayFlags.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {d.useApi ? (
                <p>No feature flags found in the database.</p>
              ) : (
                'No feature flags available. Check console for errors.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="dir-table">
                <thead>
                  <tr>
                    <th className={`dir-th ${styles.colCheckbox}`}>
                      <input
                        type="checkbox"
                        checked={d.allSelected}
                        onChange={d.handleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className={`dir-th ${styles.colType}`}>Type</th>
                    <th className={`dir-th ${styles.colSubtype}`}>Subtype</th>
                    <th className={`dir-th ${styles.colStyle}`}>Style</th>
                    <th className={`dir-th ${styles.colDescription}`}>Description</th>
                    <th className={`dir-th ${styles.colGlobal}`}>Global</th>
                    <th className={`dir-th ${styles.colActions}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.displayFlags.map((flag) => {
                    const parts = String(flag.key || '').split('__');
                    const type = parts[1] || '';
                    const subtype = parts[2] || '';
                    const styleIndex = parts.findIndex((p) => p === 'style');
                    const style = styleIndex >= 0 ? parts[styleIndex + 1] || '' : '';
                    const displayEnabled = flag.enabled;
                    const isSelected = d.selectedIds.has(flag.id);

                    return (
                      <tr key={flag.id}>
                        <td className="dir-td">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => d.handleSelectOne(flag.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="dir-td">{type || '—'}</td>
                        <td className="dir-td">{subtype || '—'}</td>
                        <td className="dir-td">{style || '—'}</td>
                        <td className={`dir-td ${styles.descriptionCell}`}>
                          {flag.description || '—'}
                        </td>
                        <td className="dir-td">
                          <Badge variant={displayEnabled ? 'success' : 'default'} className={`fs-11 ${styles.flagBadge}`}>
                            {displayEnabled ? 'On' : 'Off'}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <button
                            className={`action-btn${displayEnabled ? '' : ' action-btn-primary'}`}
                            title={displayEnabled ? 'Disable globally' : 'Enable globally'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              d.handleToggleFlag(flag);
                            }}
                          >
                            {displayEnabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Info Footer */}
        <Alert variant="info" className="mt-4">
          <strong>Hierarchy Rules:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li><strong>Global Setting (Master Switch)</strong>: When disabled, it overrides all organisation and project settings system-wide.</li>
            <li><strong>Organisation Overrides</strong>: Can be more restrictive (disable when global is enabled) but cannot be more permissive (enable when global is disabled).</li>
            <li><strong>Project Overrides</strong>: Follow the same rules relative to their organisation setting.</li>
            <li>To manage overrides, navigate to the <strong>Settings tab</strong> on Organisation or Club detail pages.</li>
          </ul>
        </Alert>
      </PageContent>
    </>
  );
};
