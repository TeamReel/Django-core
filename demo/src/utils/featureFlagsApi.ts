import { FeatureFlag } from './featureFlagStorage';
import { api } from '@/api';
import { logger } from '@/utils/logger';

const API_BASE = '/settings/feature-flags';

const debugLog = (...args: unknown[]) => {
};

export interface ApiFeatureFlag extends FeatureFlag {
  global_id: string;
  org_override_id: string | null;
  project_override_id?: string | null;
  global_value: boolean | null;
  org_value: boolean | null;
  project_value?: boolean | null;
}

export type ScopeType = 'GLOBAL' | 'ORGANISATION' | 'PROJECT';

/** Minimal shape for content template records from the API */
interface ContentTemplateRecord {
  name?: string;
  template_type?: string;
  template_subtype?: string;
  style_variant?: string;
  is_active?: boolean;
  is_latest?: boolean;
}

export async function fetchFlags(orgId: string | null, projectId?: string | null): Promise<ApiFeatureFlag[]> {
  const params: Record<string, string> = {};
  if (orgId) params.organisation_id = orgId;
  if (projectId) params.project_id = projectId;

  const data = await api.get<ApiFeatureFlag[] | { results: ApiFeatureFlag[] }>(`${API_BASE}/resolve-all/`, { params });
  // Handle various response shapes
  return ('results' in data && Array.isArray((data as { results?: ApiFeatureFlag[] }).results)) ? (data as { results: ApiFeatureFlag[] }).results : (Array.isArray(data) ? data : []);
}

export async function fetchFlagsForScope(scopeType: ScopeType, scopeId?: string): Promise<ApiFeatureFlag[]> {
  const params: Record<string, string> = {
    scope_type: scopeType,
  };

  if (scopeType === 'ORGANISATION' && scopeId) {
    params.organisation = scopeId;
  } else if (scopeType === 'PROJECT' && scopeId) {
    params.project = scopeId;
  }

  const allFlags = await api.listAll<ApiFeatureFlag>(`${API_BASE}/`, { params, pageSize: 200 });

  debugLog('[fetchFlagsForScope] Fetched', allFlags.length, 'flags for scope', scopeType);
  return allFlags;
}

export async function updateGlobalFlag(flagId: string, enabled: boolean): Promise<void> {
  await api.patch(`${API_BASE}/${flagId}/`, { enabled });
}

export async function createOrgOverride(orgId: string, key: string, enabled: boolean): Promise<void> {
  return createScopeOverride('ORGANISATION', orgId, key, enabled);
}

export async function createProjectOverride(projectId: string, key: string, enabled: boolean): Promise<void> {
  return createScopeOverride('PROJECT', projectId, key, enabled);
}

export async function createScopeOverride(scopeType: ScopeType, scopeId: string, key: string, enabled: boolean): Promise<void> {
  const body: Record<string, unknown> = {
    scope_type: scopeType,
    key: key,
    enabled: enabled,
  };

  if (scopeType === 'ORGANISATION') {
    body.organisation = scopeId;
  } else if (scopeType === 'PROJECT') {
    body.project = scopeId;
  }

  await api.post(`${API_BASE}/`, body);
}

export async function updateOrgOverride(overrideId: string, enabled: boolean): Promise<void> {
  debugLog('[featureFlagsApi] updateOrgOverride called:', { overrideId, enabled });

  const url = `${API_BASE}/${overrideId}/`;
  debugLog('[featureFlagsApi] Making PATCH request to:', url);

  try {
    await api.patch(url, { enabled });
    debugLog('[featureFlagsApi] updateOrgOverride completed successfully');
  } catch (error) {
    logger.error('Failed to update org override', error);
    throw error;
  }
}

export async function deleteOrgOverride(overrideId: string): Promise<void> {
  await api.delete(`${API_BASE}/${overrideId}/`);
}

export async function seedDefaultFlags(): Promise<{ total: number; created: number; failed: number }> {

  const normalizeKey = (value: string): string =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const titleCase = (value: string): string =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

  // Build flag info with description from template
  const buildTemplateFlagInfo = (template: ContentTemplateRecord): Array<{ key: string; description: string }> => {
    const type = normalizeKey(template?.template_type || '');
    const subtype = normalizeKey(template?.template_subtype || template?.template_type || '');
    const style = normalizeKey(template?.style_variant || '');
    const templateName = template?.name || '';

    if (!type || !subtype) return [];

    const results: Array<{ key: string; description: string }> = [];

    // Type-level flag
    results.push({
      key: `content__${type}`,
      description: `${titleCase(type)} content templates`,
    });

    // Subtype-level flag
    results.push({
      key: `content__${type}__${subtype}`,
      description: templateName || `${titleCase(type)} - ${titleCase(subtype)}`,
    });

    // Style-level flag
    if (style) {
      results.push({
        key: `content__${type}__${subtype}__style__${style}`,
        description: templateName || `${titleCase(type)} - ${titleCase(subtype)} (${titleCase(style)})`,
      });
    }

    return results;
  };

  const fetchTemplates = async (): Promise<ContentTemplateRecord[]> => {
    try {
      const allTemplates = await api.listAll<ContentTemplateRecord>('/content-generation/templates/', { pageSize: 200 });
      debugLog('[seedDefaultFlags] Fetched templates:', allTemplates.length);
      return allTemplates;
    } catch (err) {
      logger.debug('Failed to fetch templates for seeding flags', err);
      return [];
    }
  };

  const templates = await fetchTemplates();

  // Build flags with descriptions from templates
  const flagMap = new Map<string, { key: string; description: string }>();
  templates.forEach((template) => {
    buildTemplateFlagInfo(template).forEach((info) => {
      // Keep the first (most specific) description for each key
      if (!flagMap.has(info.key)) {
        flagMap.set(info.key, info);
      }
    });
  });

  const defaults = Array.from(flagMap.values());

  debugLog('[seedDefaultFlags] Will seed flags:', defaults.length);

  let created = 0;
  let failed = 0;
  for (const flag of defaults) {
    try {
      await api.post(`${API_BASE}/`, {
        scope_type: 'GLOBAL',
        key: flag.key,
        description: flag.description,
        enabled: true,
      });
      created += 1;
    } catch (e) {
      logger.debug(`Failed to seed flag ${flag.key} (might already exist)`, e);
      failed += 1;
    }
  }

  return { total: defaults.length, created, failed };
}

/**
 * Sync feature flags with templates - creates missing flags and updates descriptions
 * This ensures flags stay in sync when new templates are added
 */
export async function syncFlags(): Promise<{ total: number; created: number; updated: number; failed: number }> {

  const normalizeKey = (value: string): string =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const titleCase = (value: string): string =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

  const buildTemplateFlagInfo = (template: ContentTemplateRecord): Array<{ key: string; description: string }> => {
    const type = normalizeKey(template?.template_type || '');
    const subtype = normalizeKey(template?.template_subtype || template?.template_type || '');
    const style = normalizeKey(template?.style_variant || '');
    const templateName = template?.name || '';

    if (!type || !subtype) return [];

    const results: Array<{ key: string; description: string }> = [];
    results.push({ key: `content__${type}`, description: `${titleCase(type)} content templates` });
    results.push({ key: `content__${type}__${subtype}`, description: templateName || `${titleCase(type)} - ${titleCase(subtype)}` });
    if (style) {
      results.push({ key: `content__${type}__${subtype}__style__${style}`, description: templateName || `${titleCase(type)} - ${titleCase(subtype)} (${titleCase(style)})` });
    }
    return results;
  };

  // Fetch only active + latest templates (matches backend canonical set)
  const fetchTemplates = async (): Promise<ContentTemplateRecord[]> => {
    try {
      return await api.listAll<ContentTemplateRecord>('/content-generation/templates/', {
        params: { is_active: 'true', is_latest: 'true' },
        pageSize: 200,
      });
    } catch (err) {
      logger.debug('Failed to fetch templates', err);
      return [];
    }
  };

  // Fetch existing GLOBAL flags
  const existingFlags = await fetchFlagsForScope('GLOBAL');
  const existingFlagMap = new Map<string, ApiFeatureFlag>();
  existingFlags.forEach((f) => existingFlagMap.set(f.key, f));

  // Build desired flags from templates
  const templates = await fetchTemplates();
  const desiredFlagMap = new Map<string, { key: string; description: string }>();
  templates.forEach((template) => {
    buildTemplateFlagInfo(template).forEach((info) => {
      if (!desiredFlagMap.has(info.key)) {
        desiredFlagMap.set(info.key, info);
      }
    });
  });

  debugLog('[syncFlags] Existing flags:', existingFlagMap.size, 'Desired flags:', desiredFlagMap.size);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const [key, info] of desiredFlagMap) {
    const existing = existingFlagMap.get(key);

    if (existing) {
      // Update description if different
      if (existing.description !== info.description) {
        try {
          await api.patch(`${API_BASE}/${existing.id}/`, { description: info.description });
          updated++;
        } catch { failed++; }
      }
    } else {
      // Create new flag
      try {
        await api.post(`${API_BASE}/`, { scope_type: 'GLOBAL', key: info.key, description: info.description, enabled: true });
        created++;
      } catch { failed++; }
    }
  }

  return { total: desiredFlagMap.size, created, updated, failed };
}
