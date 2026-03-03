import React from 'react';
import { Card, Button, Input } from '@django-core/design-system';
import { EVENT_TYPE_OPTIONS } from './usageEvents.types';

interface UsageEventsFiltersProps {
  eventType: string;
  userFilter: string;
  dateFrom: string;
  dateTo: string;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
}

/** Helper — set or delete a search param then reset to page 1. */
function updateParam(
  searchParams: URLSearchParams,
  setSearchParams: (p: URLSearchParams) => void,
  key: string,
  value: string,
) {
  if (value) {
    searchParams.set(key, value);
  } else {
    searchParams.delete(key);
  }
  searchParams.set('page', '1');
  setSearchParams(searchParams);
}

export const UsageEventsFilters: React.FC<UsageEventsFiltersProps> = ({
  eventType,
  userFilter,
  dateFrom,
  dateTo,
  searchParams,
  setSearchParams,
}) => {
  const hasFilters = eventType || userFilter || dateFrom || dateTo;

  return (
    <Card className="mb-4 min-w-0">
      <div className="flex-wrap gap-12 overflow-x-auto" style={{ display: 'flex' }}>
        <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
          <label className="block text-sm font-medium mb-1">Event Type</label>
          <select
            value={eventType}
            onChange={(e) => updateParam(searchParams, setSearchParams, 'event_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
          <label className="block text-sm font-medium mb-1">User Email</label>
          <Input
            type="text"
            placeholder="Search by email..."
            value={userFilter}
            onChange={(e) => updateParam(searchParams, setSearchParams, 'user', e.target.value)}
          />
        </div>

        <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateParam(searchParams, setSearchParams, 'date_from', e.target.value)}
          />
        </div>

        <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateParam(searchParams, setSearchParams, 'date_to', e.target.value)}
          />
        </div>

        {hasFilters && (
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
  );
};
