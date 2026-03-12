import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
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
import type { OrganisationDetail } from '../../types/api';
import { organisationsApi } from '../../api';
import { routes } from '../../routes';
import styles from './OrganisationEditPage.module.css';

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
        const data = await organisationsApi.get(currentOrgSlug);
        setName(data.name);
        setDescription(data.description || '');
        setIsActive(data.is_active !== undefined ? data.is_active : true);
      } catch (err: unknown) {
        logger.error('Failed to load organisation', err);
        setError(err instanceof Error ? err.message : 'Failed to load organisation');
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
      const updated = await organisationsApi.update(currentOrgSlug!, {
        name,
        description,
        is_active: isActive,
      } as Partial<OrganisationDetail>);
      const slugOrId = updated?.slug || updated?.id || resolvedOrg?.slug || id;
      navigate(routes.orgDetailLegacy({ orgId: String(slugOrId) }));
    } catch (err: unknown) {
      logger.error('Failed to update organisation', err);
      setError(err instanceof Error ? err.message : 'Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Edit Organisation"
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Edit Organisation', current: true },
          ]}
        />
        <PageContent>
          <Card>Loading...</Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${name}`}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          {
            label: (
              <BreadcrumbContextSwitcher
                type="organisation"
                currentId={resolvedOrg?.id || ''}
                items={organisationOptions}
                onSelect={handleOrganisationSwitch}
              />
            ),
            onClick: () => navigate(routes.orgDetailLegacy({ orgId: resolvedOrg?.slug || id! })),
          },
          { label: 'Edit', current: true },
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

            <div className={styles.fieldGroup}>
              <label htmlFor="name" className={styles.fieldLabel}>
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

            <div className={styles.fieldGroupLarge}>
              <label htmlFor="description" className={styles.fieldLabel}>
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

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
                className={styles.checkbox}
              />
              <label htmlFor="is_active" className={styles.checkboxLabel}>
                Active
              </label>
            </div>

            <div className={styles.buttonGroup}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(routes.orgDetailLegacy({ orgId: id! }))} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </>
  );
};
