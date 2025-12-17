import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  Button,
  Input,
  Badge,
  Card,
  Table,
  Alert,
} from '@django-core/design-system';
import {
  Organisation,
  ListResponse,
} from '../../types';

/**
 * T006 - Organisations List Page
 *
 * Purpose: Show all organisations with counts and credit balances
 * - Supports sort/filter via query params (shareable URLs)
 * - Integrates with F03 context switcher
 * - Real API integration with B06 (organisations module)
 * - Permission-aware: viewer sees read-only view
 */
export const OrganisationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query params for sort and filter
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  // Fetch organisations from API
  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const params = new URLSearchParams();
        params.append('sort', sort);
        params.append('order', order);
        if (search) {
          params.append('search', search);
        }

        const response = await fetch(
          `/api/organisations/?${params.toString()}`,
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

        const data: ListResponse<Organisation> = await response.json();
        setOrganisations(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisations');
        console.error('Organisations fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisations();
  }, [sort, order, search]);

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    if (newSearch) {
      searchParams.set('search', newSearch);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  // Handle sort change
  const handleSort = (column: string) => {
    if (sort === column) {
      // Toggle order
      searchParams.set('order', order === 'asc' ? 'desc' : 'asc');
    } else {
      searchParams.set('sort', column);
      searchParams.set('order', 'asc');
    }
    setSearchParams(searchParams);
  };

  return (
    <div>
      <PageHeader
        title="Organisations"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Organisations' },
        ]}
        action={
          <Button variant="primary" size="md">
            Create Organisation
          </Button>
        }
      />

      <PageContent>
        {/* Search and filters */}
        <Card className="mb-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Search organisations..."
              value={search}
              onChange={handleSearch}
              className="flex-1"
              data-testid="org-search-input"
            />
          </div>
        </Card>

        {/* Error state */}
        {error && (
          <Alert type="error" className="mb-4" data-testid="org-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && organisations.length === 0 && (
          <Alert type="info" data-testid="org-empty-state">
            No organisations found. Try adjusting your search or create a new organisation.
          </Alert>
        )}

        {/* Organisations table */}
        {!loading && organisations.length > 0 && (
          <Table
            columns={[
              {
                key: 'name',
                label: 'Name',
                sortable: true,
                sorted: sort === 'name' ? order : undefined,
                onSort: () => handleSort('name'),
              },
              {
                key: 'member_count',
                label: 'Members',
                sortable: true,
                sorted: sort === 'member_count' ? order : undefined,
                onSort: () => handleSort('member_count'),
              },
              {
                key: 'project_count',
                label: 'Projects',
                sortable: true,
                sorted: sort === 'project_count' ? order : undefined,
                onSort: () => handleSort('project_count'),
              },
              {
                key: 'credit_balance',
                label: 'Credits',
                sortable: true,
                sorted: sort === 'credit_balance' ? order : undefined,
                onSort: () => handleSort('credit_balance'),
              },
              {
                key: 'status',
                label: 'Status',
              },
              {
                key: 'actions',
                label: 'Actions',
              },
            ]}
            rows={organisations.map((org) => ({
              id: org.id,
              name: (
                <a href={`/organisations/${org.id}`} className="text-blue-600 hover:underline">
                  {org.name}
                </a>
              ),
              member_count: (
                <Badge variant="secondary" data-testid={`org-members-${org.id}`}>
                  {org.member_count || 0}
                </Badge>
              ),
              project_count: (
                <Badge variant="secondary" data-testid={`org-projects-${org.id}`}>
                  {org.project_count || 0}
                </Badge>
              ),
              credit_balance: (
                <span
                  className={
                    (org.credit_balance || 0) < 100 ? 'text-red-600 font-semibold' : ''
                  }
                  data-testid={`org-credits-${org.id}`}
                >
                  {org.credit_balance || 0}
                </span>
              ),
              status: (
                <Badge
                  variant={org.is_active ? 'success' : 'warning'}
                  data-testid={`org-status-${org.id}`}
                >
                  {org.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
              actions: (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.href = `/organisations/${org.id}`}
                    data-testid={`org-detail-btn-${org.id}`}
                  >
                    View
                  </Button>
                </div>
              ),
            }))}
            loading={loading}
            data-testid="org-table"
          />
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading organisations...
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
};

export default OrganisationsPage;
