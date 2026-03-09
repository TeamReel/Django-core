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
import { organisationsApi } from '../../api';

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
      const newOrg = await organisationsApi.create({ name, description } as any);
      // Navigate to the new organisation's dashboard
      if ((newOrg as any)?.slug || (newOrg as any)?.id) {
        navigate(`/organisations/${(newOrg as any).slug || (newOrg as any).id}`);
      } else {
        // Fallback if ID is missing
        navigate('/federations');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Create Organisation"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Create Organisation', current: true },
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
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'var(--font-medium)' }}>
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
              <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'var(--font-medium)' }}>
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
              <Button type="button" variant="secondary" onClick={() => navigate('/federations')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </>
  );
};
