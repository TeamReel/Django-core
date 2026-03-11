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
import { SkeletonDetailPage } from '../../components/Skeleton';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';
import { api, organisationsApi, projectsApi } from '../../api';
import { logger } from '@/utils/logger';
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
  const resolvedProject = projects.find(p => p.slug === projectId || p.id === projectId);
  const currentProjectSlug = resolvedProject?.slug || projectId; // Use slug for API calls

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

        // Use nested route if we have org context
        const rawData = resolvedOrg
          ? await organisationsApi.getProject(resolvedOrg.slug, currentProjectSlug)
          : await projectsApi.get(currentProjectSlug);
        // Handle B13 envelope pattern: {status: 'success', data: {...}}
        const data: Project = ((rawData as unknown as Record<string, unknown>).data || rawData) as Project;
        setName(data.name);
        setSlug(data.slug || '');
        setDescription(data.description || '');
        setIsActive(data.is_active);
        setIsPrivate(data.is_private || false);
      } catch (err) {
        logger.error('Failed to load project', err);
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

      // Use nested route if we have org context
      const endpoint = resolvedOrg
        ? `/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/`
        : `/projects/${currentProjectSlug}/`;

      const response = await api.patch<any>(endpoint, {
          name,
          slug: slug || undefined,
          description,
          is_active: isActive,
          is_private: isPrivate,
      });

      // Navigate back to project detail page
      const nextSlug = slug || currentProjectSlug;
      navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${nextSlug}`);
    } catch (err) {
      logger.error('Failed to save project', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading || context.isLoading) {
    return (
      <div className="p-6">
        <SkeletonDetailPage tabCount={0} contentLines={6} />
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
                label={resolvedOrg?.name || 'Organisation'}
                currentId={resolvedOrg?.id || ''}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={organisationOptions.length > 1}
              />
            ),
          },
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
    </>
  );
};

export default ProjectEditPage;
