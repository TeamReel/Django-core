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
import styles from './OrganisationCreatePage.module.css';
import { routes } from '../../routes';
import { logger } from '@/utils/logger';

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
      const newOrg = await organisationsApi.create({ name, description } as Partial<import('../../types/api').OrganisationDetail>);
      // Navigate to the new organisation's dashboard
      if (newOrg?.slug || newOrg?.id) {
        navigate(routes.orgDetailLegacy({ orgId: newOrg.slug || newOrg.id }));
      } else {
        // Fallback if ID is missing
        navigate('/federations');
      }
    } catch (err: unknown) {
      logger.error('Failed to create organisation', err);
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
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <Alert variant="error" title="Error" className={styles.errorAlert}>
                {error}
              </Alert>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
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

            <div className={styles.formGroupLarge}>
              <label htmlFor="description" className={styles.label}>
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

            <div className={styles.buttonRow}>
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
