/**
 * ContentAvailabilityCard - Manage content template availability by type/subtype/style
 *
 * Scope-aware: Organisation or Project (Club)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import {
  createScopeOverride,
  deleteOrgOverride,
  fetchFlags,
  updateOrgOverride,
  type ApiFeatureFlag,
  type ScopeType,
} from '../../utils/featureFlagsApi';

interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  style_variant: string | null;
  organisation?: number | null;
  project?: number | null;
}

interface ContentAvailabilityCardProps {
  scopeType: 'ORGANISATION' | 'PROJECT';
  organisationId: string;
  projectId?: string | null;
  scopeName: string;
}

const slugify = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const titleCase = (value: string): string =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

const buildTemplateFlagKeys = (template: ContentTemplate): string[] => {
  const type = slugify(template.template_type);
  const subtype = slugify(template.template_subtype || template.template_type);
  const style = slugify(template.style_variant || '');
  if (!type || !subtype) return [];
  const keys: string[] = [];
  if (style) keys.push(`content.${type}.${subtype}.style.${style}`);
  keys.push(`content.${type}.${subtype}`);
  keys.push(`content.${type}`);
  return keys;
};

const getFlagKeyForTemplate = (template: ContentTemplate): string => {
  const type = slugify(template.template_type);
  const subtype = slugify(template.template_subtype || template.template_type);
  const style = slugify(template.style_variant || '');
  if (style) return `content.${type}.${subtype}.style.${style}`;
  return `content.${type}.${subtype}`;
};

export default function ContentAvailabilityCard({
  scopeType,
  organisationId,
  projectId,
  scopeName,
}: ContentAvailabilityCardProps) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [flags, setFlags] = useState<ApiFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    params.append('is_active', 'true');
    params.append('page_size', '500');

    const response = await fetch(`${baseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates (${response.status})`);
    }

    const data = await response.json();
    const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
    const list: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

    const filtered = list.filter((t) => {
      const templateOrg = t.organisation ?? null;
      const templateProject = t.project ?? null;

      if (templateOrg && String(templateOrg) !== String(organisationId)) return false;

      if (scopeType === 'ORGANISATION') {
        // Org settings should not include project-scoped templates
        if (templateProject) return false;
      }

      if (scopeType === 'PROJECT') {
        if (templateProject && String(templateProject) !== String(projectId || '')) return false;
      }

      return true;
    });

    setTemplates(filtered);
  }, [organisationId, projectId, scopeType]);

  const fetchAvailabilityFlags = useCallback(async () => {
    const scopedFlags = await fetchFlags(organisationId, scopeType === 'PROJECT' ? projectId || undefined : undefined);
    setFlags(scopedFlags.filter((flag) => String(flag.key || '').startsWith('content.')));
  }, [organisationId, projectId, scopeType]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchTemplates(), fetchAvailabilityFlags()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content availability');
    } finally {
      setLoading(false);
    }
  }, [fetchAvailabilityFlags, fetchTemplates]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const flagMap = useMemo(() => {
    const map = new Map<string, ApiFeatureFlag>();
    flags.forEach((flag) => {
      map.set(flag.key, flag);
    });
    return map;
  }, [flags]);

  const rows = useMemo(() => {
    const seen = new Set<string>();

    return templates
      .map((template) => {
        const key = getFlagKeyForTemplate(template);
        if (seen.has(key)) return null;
        seen.add(key);

        const flag = flagMap.get(key);
        const globalValue = flag?.global_value ?? null;
        const orgValue = flag?.org_value ?? null;
        const projectValue = flag?.project_value ?? null;
        const effectiveValue = flag?.enabled ?? true;

        const isGlobalDisabled = globalValue === false;
        const isOrgDisabled = orgValue === false;

        const disableEnable = scopeType === 'PROJECT'
          ? (isGlobalDisabled || isOrgDisabled)
          : isGlobalDisabled;

        let disabledReason = '';
        if (disableEnable) {
          disabledReason = isGlobalDisabled
            ? 'Cannot enable: Global setting is disabled.'
            : 'Cannot enable: Organisation setting is disabled.';
        }

        return {
          id: key,
          key,
          type: titleCase(template.template_type),
          subtype: titleCase(template.template_subtype || template.template_type),
          style: template.style_variant ? titleCase(template.style_variant) : '—',
          globalValue,
          orgValue,
          projectValue,
          effectiveValue,
          disableEnable,
          disabledReason,
          overrideId:
            scopeType === 'PROJECT'
              ? flag?.project_override_id || null
              : flag?.org_override_id || null,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        key: string;
        type: string;
        subtype: string;
        style: string;
        globalValue: boolean | null;
        orgValue: boolean | null;
        projectValue: boolean | null | undefined;
        effectiveValue: boolean;
        disableEnable: boolean;
        disabledReason: string;
        overrideId: string | null;
      }>;
  }, [flagMap, scopeType, templates]);

  const handleToggle = async (row: typeof rows[number]) => {
    if (updatingKey) return;

    const nextValue = !row.effectiveValue;
    if (nextValue && row.disableEnable) {
      alert(row.disabledReason);
      return;
    }

    setUpdatingKey(row.key);
    try {
      if (row.overrideId) {
        await updateOrgOverride(row.overrideId, nextValue);
      } else {
        await createScopeOverride(scopeType as ScopeType, scopeType === 'PROJECT' ? String(projectId) : String(organisationId), row.key, nextValue);
      }
      await fetchAvailabilityFlags();
    } catch (err) {
      console.error('Failed to update availability flag:', err);
      alert('Failed to update availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleReset = async (row: typeof rows[number]) => {
    if (!row.overrideId) return;
    setUpdatingKey(row.key);
    try {
      await deleteOrgOverride(row.overrideId);
      await fetchAvailabilityFlags();
    } catch (err) {
      console.error('Failed to reset availability flag:', err);
      alert('Failed to reset availability. Check console for details.');
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">Loading content availability…</div>
      </Card>
    );
  }

  return (
    <Card>
      <Alert variant="info" className="mb-4">
        <strong>Content Availability:</strong> Control which template types are available for <strong>{scopeName}</strong>.
        Higher-level disabled settings override lower-level ones.
      </Alert>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No templates found.</div>
      ) : (
        <Table
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'subtype', label: 'Subtype' },
            { key: 'style', label: 'Style' },
            { key: 'global', label: 'Global' },
            ...(scopeType === 'PROJECT'
              ? [{ key: 'org', label: 'Org' }, { key: 'project', label: 'Project' }]
              : [{ key: 'org', label: 'Org' }]),
            { key: 'effective', label: 'Effective' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={rows.map((row) => {
            const isUpdating = updatingKey === row.key;
            const orgDisplay = row.orgValue;
            const projectDisplay = row.projectValue;

            return {
              id: row.id,
              type: row.type,
              subtype: row.subtype,
              style: row.style,
              global: (
                <Badge variant={row.globalValue ? 'success' : 'default'}>
                  {row.globalValue === null ? '—' : row.globalValue ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              org: (
                <Badge variant={orgDisplay ? 'success' : 'default'}>
                  {orgDisplay === null ? '—' : orgDisplay ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              project: scopeType === 'PROJECT' ? (
                projectDisplay === null || projectDisplay === undefined ? (
                  <span className="text-gray-500 text-sm italic">Inherited</span>
                ) : (
                  <Badge variant={projectDisplay ? 'success' : 'default'}>
                    {projectDisplay ? 'Enabled' : 'Disabled'}
                  </Badge>
                )
              ) : null,
              effective: (
                <Badge variant={row.effectiveValue ? 'success' : 'default'}>
                  {row.effectiveValue ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              actions: (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant={row.effectiveValue ? 'outline' : 'primary'}
                    disabled={isUpdating || (row.disableEnable && !row.effectiveValue)}
                    title={row.disableEnable && !row.effectiveValue ? row.disabledReason : undefined}
                    onClick={() => handleToggle(row)}
                  >
                    {isUpdating ? '...' : row.effectiveValue ? 'Disable' : 'Enable'}
                  </Button>
                  {row.overrideId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset(row)}
                      disabled={isUpdating}
                      title="Reset to higher-level defaults"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              ),
            };
          })}
        />
      )}
    </Card>
  );
}
