import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '../../shims/page-templates';
import AppShell from '../../components/AppShell';

/**
 * Organisation Create Page
 *
 * Purpose: Allow users to create a new organisation.
 */
export const OrganisationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create organisation';
        try {
          const data = await response.json();
          errorMessage = data.detail || JSON.stringify(data);
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const newOrg = await response.json();
      // Navigate to the new organisation's dashboard
      if (newOrg.id) {
        navigate(`/organisations/${newOrg.id}`);
      } else {
        // Fallback if ID is missing
        navigate('/organisations');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Create Organisation"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Organisations', href: '/organisations' },
          { label: 'Create', current: true },
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
                disabled={loading}
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
                disabled={loading}
                className="w-full"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Organisation'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/organisations')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </AppShell>
  );
};
