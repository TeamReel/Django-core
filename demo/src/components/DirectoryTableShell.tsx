/**
 * Wrapper component for all directory list tables.
 *
 * Handles the common loading → error → empty → Card + Table flow so each
 * directory page only provides the `<thead>` and `<tbody>` content.
 */

import React from 'react';
import { Alert, Card } from '@django-core/design-system';
import { SkeletonTablePage } from './Skeleton';
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
  /** Message when no rows are found after loading. */
  emptyMessage: string;
  /** Number of items to decide empty vs table. */
  itemCount: number;
  /** The `<thead>` + `<tbody>` to render inside the table. */
  children: React.ReactNode;
}

export const DirectoryTableShell: React.FC<DirectoryTableShellProps> = ({
  isLoading,
  error,
  domainLoading,
  emptyMessage,
  itemCount,
  children,
}) => (
  <>
    {isLoading && <SkeletonTablePage rows={4} columns={4} showFilters={false} />}
    {error && <Alert variant="error">{error}</Alert>}

    {!isLoading && !error && domainLoading && (
      <SkeletonTablePage rows={3} columns={4} showFilters={false} />
    )}

    {!isLoading && !error && !domainLoading && itemCount === 0 && (
      <Alert variant="info">{emptyMessage}</Alert>
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
