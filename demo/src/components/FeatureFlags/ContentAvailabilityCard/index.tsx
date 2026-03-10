/**
 * ContentAvailabilityCard - Manage content template availability by type/subtype/style
 *
 * Scope-aware: Organisation or Project (Club)
 */
import React from 'react';
import { Alert, Card } from '@django-core/design-system';
import { useContentAvailabilityData } from './useContentAvailabilityData';
import { ContentAvailabilityFilters } from './ContentAvailabilityFilters';
import { ContentAvailabilityTable } from './ContentAvailabilityTable';
import type { ContentAvailabilityCardProps } from './types';

// Re-export types
export type { ContentAvailabilityCardProps } from './types';

export default function ContentAvailabilityCard(props: ContentAvailabilityCardProps) {
  const { scopeType, scopeName } = props;
  const data = useContentAvailabilityData(props);

  if (data.loading) {
    return (
      <Card>
        <div className="p-8 text-center">Loading content availability…</div>
      </Card>
    );
  }

  return (
    <Card>
      <Alert variant="info" className="mb-4">
        <strong>Content Availability:</strong> Control which template types are available for <strong>{scopeName}</strong>.
        Higher-level disabled settings override lower-level ones.
      </Alert>

      {data.error && (
        <Alert variant="error" className="mb-4">
          {data.error}
        </Alert>
      )}

      <ContentAvailabilityFilters
        filterType={data.filterType}
        setFilterType={data.setFilterType}
        filterSubtype={data.filterSubtype}
        setFilterSubtype={data.setFilterSubtype}
        filterStyle={data.filterStyle}
        setFilterStyle={data.setFilterStyle}
        uniqueTypes={data.uniqueTypes}
        uniqueSubtypes={data.uniqueSubtypes}
        uniqueStyles={data.uniqueStyles}
        selectedIds={data.selectedIds}
        bulkUpdating={data.bulkUpdating}
        onBulkUpdate={data.handleBulkUpdate}
        onClear={data.clearFilters}
      />

      <ContentAvailabilityTable
        scopeType={scopeType}
        filteredRows={data.filteredRows}
        selectedIds={data.selectedIds}
        allSelected={data.allSelected}
        updatingKey={data.updatingKey}
        onSelectAll={data.handleSelectAll}
        onSelectOne={data.handleSelectOne}
        onToggle={data.handleToggle}
        onReset={data.handleReset}
      />
    </Card>
  );
}
