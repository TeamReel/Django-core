import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
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
import { Organisation } from '../../types';
import type { OrganisationDetail } from '../../types/api';
import { organisationsApi } from '@/api';
import { routes } from '../../routes';
import { useFormFields } from '@/hooks/useFormFields';
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

  const { fields: form, setField, setFields } = useFormFields({
    name: '',
    description: '',
    isActive: true as boolean,
  });
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
        setFields({
          name: data.name,
          description: data.description || '',
          isActive: data.is_active !== undefined ? data.is_active : true,
        });
      } catch (err: unknown) {
        logger.error('Failed to load organisation', err);
        setError(getErrorMessage(err));
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
        name: form.name,
        description: form.description,
        is_active: form.isActive,
      } as Partial<OrganisationDetail>);
      const slugOrId = updated?.slug || updated?.id || resolvedOrg?.slug || id;
      navigate(routes.orgDetailLegacy({ orgId: String(slugOrId) }));
    } catch (err: unknown) {
      logger.error('Failed to update organisation', err);
      setError(getErrorMessage(err));
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
            { label: 'Dashboard', onClick: () => navigate(routes.dashboard()) },
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
        title={`Edit ${form.name}`}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate(routes.dashboard()) },
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
          { label: 'Bewerken', current: true },
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
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
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
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Optional description"
                disabled={saving}
                className="w-full"
              />
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="is_active"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
                disabled={saving}
                className={styles.checkbox}
              />
              <label htmlFor="is_active" className={styles.checkboxLabel}>
                Active
              </label>
            </div>

            <div className={styles.buttonGroup}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(routes.orgDetailLegacy({ orgId: id! }))} disabled={saving}>
                Annuleren
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </>
  );
};

export default OrganisationEditPage;
