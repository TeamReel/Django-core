import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Alert,
  Badge,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
} from '../../shims/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';
import { Project } from '../../types';

export const ProjectEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { context, organisations, projects } = useContextSwitcher();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve org and project slugs
  const resolvedOrg = organisations.find(o => o.slug === orgId || o.id === orgId) || context.organisation;

  // Try to find project in context first (if loaded), otherwise use projectId as slug
  const resolvedProject = projects.find(p => (p as any).slug === projectId || p.id === projectId);
  const currentProjectSlug = (resolvedProject as any)?.slug || projectId; // Use slug for API calls

  const {
    organisationOptions,
    projectOptions,
    handleOrganisationSwitch,
    handleProjectSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: projects.map(p => ({
      id: String(p.id),
      name: p.name,
      slug: p.slug || '',
      organisation_id: String(p.organisation_id)
    })),
    users: [],
    context: {
      currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined,
      currentProjectId: resolvedProject?.id ? String(resolvedProject.id) : projectId,
    },
    basePath: '',
  });

  useEffect(() => {
    const fetchProject = async () => {
      if (context.isLoading) return;
      if (!currentProjectSlug) return;

      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        // Use nested route if we have org context
        const endpoint = resolvedOrg
          ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/`
          : `${apiBaseUrl}/api/v1/projects/${currentProjectSlug}/`;

        const response = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch project (${response.status})`);
        }

        const rawData = await response.json();
        // Handle B13 envelope pattern: {status: 'success', data: {...}}
        const data: Project = rawData.data || rawData;
        setName(data.name);
        setSlug(data.slug || ''); // Assuming backend returns slug now, or we use what we have
        setDescription(data.description || '');
        setIsActive(data.is_active);
        setIsPrivate(data.is_private || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [currentProjectSlug, context.isLoading, resolvedOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProjectSlug) return;

    try {
      setSaving(true);
      setError(null);

      // Use relative path to ensure we go through Vite proxy (if in dev)
      // or same origin (if in prod), so that cookies/CSRF work correctly.
      const apiBaseUrl = '';

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      // Use nested route if we have org context
      const endpoint = resolvedOrg
        ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/`
        : `${apiBaseUrl}/api/v1/projects/${currentProjectSlug}/`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description,
          is_active: isActive,
          is_private: isPrivate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update project');
      }

      await response.json();
      // Navigate back to project detail page
      const nextSlug = slug || currentProjectSlug;
      navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${nextSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading || context.isLoading) {
    return (
      <AppShell>
        <PageHeader
          title="Edit Project"
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Organisations', onClick: () => navigate('/organisations') },
            { label: resolvedOrg?.name || 'Organisation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}`) },
            { label: 'Projects', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`) },
            { label: 'Edit', current: true },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">Loading...</div>
          </Card>
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
                label={resolvedOrg?.name || 'Organisation'}
                currentId={resolvedOrg?.id || ''}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={organisationOptions.length > 1}
              />
            ),
          },
          { label: 'Projects', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`) },
          {
            label: (
              <BreadcrumbContextSwitcher
                type="project"
                label={name || projectId || 'Project'}
                currentId={resolvedProject?.id || projectId || ''}
                items={projectOptions}
                onSelect={handleProjectSwitch}
              />
            ),
            onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${projectId}`),
          },
          { label: 'Edit', current: true },
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="project-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL-friendly name. Changing this will change the project URL.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="is_private" className="text-sm font-medium text-gray-700">
                Private Project
              </label>
            </div>
            {isPrivate && (
              <Alert variant="warning">
                Private projects are only visible to project members and organisation admins.
              </Alert>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${projectId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </PageContent>
    </AppShell>
  );
};

export default ProjectEditPage;
