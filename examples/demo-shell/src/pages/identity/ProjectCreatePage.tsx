import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
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

export const ProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { context, organisations } = useContextSwitcher();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedOrg = organisations.find(o => o.slug === orgId || o.id === orgId) || context.organisation;
  const currentOrgId = resolvedOrg?.id;
  const currentOrgSlug = resolvedOrg?.slug || orgId;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgSlug) {
      setError('Organisation context missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          slug: slug || undefined, // Optional if backend generates it
          description,
          organisation_id: currentOrgId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create project');
      }

      const project = await response.json();
      navigate(`/organisations/${currentOrgSlug}/projects/${project.slug || project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Create Project"
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
          },
          { label: 'Projects', onClick: () => navigate(`/organisations/${currentOrgSlug}/projects`) },
          { label: 'Create', current: true },
        ]}
      />
      <PageContent>
        <Card className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Website Redesign"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (Optional)
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. website-redesign"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}/projects`)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </AppShell>
  );
};

export default ProjectCreatePage;
