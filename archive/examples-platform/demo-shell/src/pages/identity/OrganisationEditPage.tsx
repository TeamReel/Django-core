import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
} from '../../shims/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';
import { Organisation } from '../../types';

/**
 * Organisation Edit Page
 *
 * Purpose: Allow users to edit an existing organisation.
 */
export const OrganisationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organisations } = useContextSwitcher();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve slug from ID if needed
  const resolvedOrg = organisations.find(o => o.slug === id || o.id === id);
  const currentOrgSlug = resolvedOrg?.slug || id; // Use slug for API calls
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  const {
    organisationOptions,
    handleOrganisationSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  useEffect(() => {
    const fetchOrg = async () => {
      if (!currentOrgSlug) return;

      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch organisation (${response.status})`);
        }

        const rawData = await response.json();
        // Handle B13 envelope pattern: {status: 'success', data: {...}}
        const data: Organisation = rawData.data || rawData;
        setName(data.name);
        setDescription(data.description || '');
        setIsActive(data.is_active !== undefined ? data.is_active : true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentOrgSlug) {
      fetchOrg();
    }
  }, [currentOrgSlug, currentOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': String(currentOrgId || ''),
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update organisation';
        try {
          const data = await response.json();
          errorMessage = data.detail || JSON.stringify(data);
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      navigate(`/organisations/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          title="Edit Organisation"
          breadcrumbs={[
            { label: 'Organisations', onClick: () => navigate('/organisations') },
            { label: 'Edit' },
          ]}
        />
        <PageContent>
          <Card>Loading...</Card>
        </PageContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`Edit ${name}`}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Organisations', onClick: () => navigate('/organisations') },
          {
            label: (
              <BreadcrumbContextSwitcher
                type="organisation"
                currentId={resolvedOrg?.id || ''}
                items={organisationOptions}
                onSelect={handleOrganisationSwitch}
              />
            ),
            onClick: () => navigate(`/organisations/${id}`),
          },
          { label: 'Edit', current: true },
        ]}
      />
      <PageContent>
        <Card>
          <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
            {error && (
              <Alert variant="error" title="Error" style={{ marginBottom: '1rem' }}>
                {error}
              </Alert>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                required
                disabled={saving}
                className="w-full"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Description
              </label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={saving}
                className="w-full"
              />
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
                style={{ width: '1rem', height: '1rem' }}
              />
              <label htmlFor="is_active" style={{ fontWeight: 500 }}>
                Active
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(`/organisations/${id}`)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </AppShell>
  );
};
