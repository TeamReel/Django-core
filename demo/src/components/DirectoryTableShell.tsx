/**
 * Wrapper component for all directory list tables.
 *
 * Handles the common loading → error → empty → Card + Table flow so each
 * directory page only provides the `<thead>` and `<tbody>` content.
 */

import React, { memo } from 'react';
import { Alert, Card } from '@django-core/design-system';
import { SkeletonTablePage } from './Skeleton';
import SmartEmptyState from './SmartEmptyState';
import type { EmptyStateType } from './SmartEmptyState';
import { Table } from '@/shims/design-system';

export interface DirectoryTableShellProps {
  /** Global options loading (orgs/clubs/teams from the hook). */
  isLoading: boolean;
  /** Global error. */
  error: string | null;
  /** Domain-specific loading (e.g. seasonsLoading, matchesLoading). */
  domainLoading: boolean;
  /** Message while domain data loads. */
  domainLoadingMessage: string;
  /** SmartEmptyState type for the empty state. */
  emptyStateType?: EmptyStateType;
  /** Custom title for the empty state. */
  emptyTitle?: string;
  /** Custom description for the empty state. */
  emptyDescription?: string;
  /** Hide default action buttons on the empty state. */
  hideActions?: boolean;
  /** Number of items to decide empty vs table. */
  itemCount: number;
  /** The `<thead>` + `<tbody>` to render inside the table. */
  children: React.ReactNode;
}

export const DirectoryTableShell = memo(function DirectoryTableShell({
  isLoading,
  error,
  domainLoading,
  emptyStateType = 'generic',
  emptyTitle,
  emptyDescription,
  hideActions,
  itemCount,
  children,
}: DirectoryTableShellProps) {
  return (
  <>
    {isLoading && <SkeletonTablePage rows={4} columns={4} showFilters={false} />}
    {error && <Alert variant="error">{error}</Alert>}

    {!isLoading && !error && domainLoading && (
      <SkeletonTablePage rows={3} columns={4} showFilters={false} />
    )}

    {!isLoading && !error && !domainLoading && itemCount === 0 && (
      <SmartEmptyState
        type={emptyStateType}
        title={emptyTitle}
        description={emptyDescription}
        hideActions={hideActions}
      />
    )}

    {!isLoading && !error && !domainLoading && itemCount > 0 && (
      <Card>
        <div className="overflow-x-auto">
          <Table className="dir-table">{children}</Table>
        </div>
      </Card>
    )}
    </>
  );
});
