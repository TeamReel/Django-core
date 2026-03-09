import { FeatureFlag } from './featureFlagStorage';
import { getApiBaseUrl } from './apiBase';
import { getCsrfToken as _getCsrfTokenShared } from './csrf';

const API_BASE = '/api/v1/settings/feature-flags';

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
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${API_BASE}/resolve-all/`, window.location.origin);
  if (orgId) {
    url.searchParams.append('organisation_id', orgId);
  }
  if (projectId) {
    url.searchParams.append('project_id', projectId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch flags: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // Handle B13 response envelope
  return data.data?.results || data.results || data.data || data || [];
}

export async function fetchFlagsForScope(scopeType: ScopeType, scopeId?: string): Promise<ApiFeatureFlag[]> {
  const baseUrl = getApiBaseUrl();
  const allFlags: ApiFeatureFlag[] = [];

  // Use pagination to fetch ALL flags
  let nextUrl: string | null = `${baseUrl}${API_BASE}/?scope_type=${scopeType}&page_size=200`;

  if (scopeType === 'ORGANISATION' && scopeId) {
    nextUrl += `&organisation=${scopeId}`;
  } else if (scopeType === 'PROJECT' && scopeId) {
    nextUrl += `&project=${scopeId}`;
  }

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch flags: ${response.status} ${response.statusText}`);
    }

    const data: Record<string, any> = await response.json();
    const results = data.data?.results || data.results || data.data || data || [];
    allFlags.push(...(Array.isArray(results) ? results : []));

    // Check for next page
    nextUrl = data.data?.next || data.next || null;
    if (nextUrl && !nextUrl.startsWith('http')) {
      nextUrl = `${baseUrl}${nextUrl}`;
    }
  }

  debugLog('[fetchFlagsForScope] Fetched', allFlags.length, 'flags for scope', scopeType);
  return allFlags;
}

export async function updateGlobalFlag(flagId: string, enabled: boolean): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${API_BASE}/${flagId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update global flag: ${response.statusText}`);
  }
}

export async function createOrgOverride(orgId: string, key: string, enabled: boolean): Promise<void> {
  return createScopeOverride('ORGANISATION', orgId, key, enabled);
}

export async function createProjectOverride(projectId: string, key: string, enabled: boolean): Promise<void> {
  return createScopeOverride('PROJECT', projectId, key, enabled);
}

export async function createScopeOverride(scopeType: ScopeType, scopeId: string, key: string, enabled: boolean): Promise<void> {
  const baseUrl = getApiBaseUrl();
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

  const response = await fetch(`${baseUrl}${API_BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create ${scopeType.toLowerCase()} override: ${response.statusText} - ${errorText}`);
  }
}

export async function updateOrgOverride(overrideId: string, enabled: boolean): Promise<void> {
  debugLog('[featureFlagsApi] updateOrgOverride called:', { overrideId, enabled });

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${API_BASE}/${overrideId}/`;
  debugLog('[featureFlagsApi] Making PATCH request to:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error('[featureFlagsApi] Request timeout after 10 seconds');
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    debugLog('[featureFlagsApi] updateOrgOverride response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[featureFlagsApi] updateOrgOverride error response:', errorText);
      throw new Error(`Failed to update org override: ${response.statusText} - ${errorText}`);
    }

    debugLog('[featureFlagsApi] updateOrgOverride completed successfully');
  } catch (error) {
    console.error(error);
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - server not responding');
    }
    throw error;
  }
}

export async function deleteOrgOverride(overrideId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${API_BASE}/${overrideId}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete org override: ${response.statusText}`);
  }
}

export async function seedDefaultFlags(): Promise<{ total: number; created: number; failed: number }> {
  const baseUrl = getApiBaseUrl();

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
  const buildTemplateFlagInfo = (template: any): Array<{ key: string; description: string }> => {
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
      const allTemplates: ContentTemplateRecord[] = [];
      // Fetch ALL templates (not just active) to ensure we get everything
      let nextUrl: string | null = `${baseUrl}/api/v1/content-generation/templates/?page_size=200`;

      while (nextUrl) {
        const res: Response = await fetch(nextUrl, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) break;
        const data: any = await res.json();
        const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
        const list = Array.isArray(rawResults) ? rawResults : [];
        allTemplates.push(...list);

        // Check for next page
        nextUrl = data?.data?.next || data?.next || null;
        if (nextUrl && !nextUrl.startsWith('http')) {
          nextUrl = `${baseUrl}${nextUrl}`;
        }
      }

      debugLog('[seedDefaultFlags] Fetched templates:', allTemplates.length);
      return allTemplates;
    } catch (err) {
      console.error(err);
      console.warn('Failed to fetch templates for seeding flags', err);
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
      const res = await fetch(`${baseUrl}${API_BASE}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          scope_type: 'GLOBAL',
          key: flag.key,
          description: flag.description,
          enabled: true,
        }),
      });
      if (res.ok) {
        created += 1;
      } else {
        failed += 1;
      }
    } catch (e) {
      console.error(e);
      failed += 1;
      console.warn(`Failed to seed flag ${flag.key} (might already exist)`);
    }
  }

  return { total: defaults.length, created, failed };
}

/**
 * Sync feature flags with templates - creates missing flags and updates descriptions
 * This ensures flags stay in sync when new templates are added
 */
export async function syncFlags(): Promise<{ total: number; created: number; updated: number; failed: number }> {
  const baseUrl = getApiBaseUrl();

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

  const buildTemplateFlagInfo = (template: any): Array<{ key: string; description: string }> => {
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
      const allTemplates: ContentTemplateRecord[] = [];
      let nextUrl: string | null = `${baseUrl}/api/v1/content-generation/templates/?page_size=200&is_active=true&is_latest=true`;
      while (nextUrl) {
        const res: Response = await fetch(nextUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) break;
        const data: any = await res.json();
        const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
        allTemplates.push(...(Array.isArray(rawResults) ? rawResults : []));
        nextUrl = data?.data?.next || data?.next || null;
        if (nextUrl && !nextUrl.startsWith('http')) nextUrl = `${baseUrl}${nextUrl}`;
      }
      return allTemplates;
    } catch (err) {
      console.error(err);
      console.warn('Failed to fetch templates', err);
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
          const res = await fetch(`${baseUrl}${API_BASE}/${existing.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
            credentials: 'include',
            body: JSON.stringify({ description: info.description }),
          });
          if (res.ok) updated++;
          else failed++;
        } catch { failed++; }
      }
    } else {
      // Create new flag
      try {
        const res = await fetch(`${baseUrl}${API_BASE}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
          credentials: 'include',
          body: JSON.stringify({ scope_type: 'GLOBAL', key: info.key, description: info.description, enabled: true }),
        });
        if (res.ok) created++;
        else failed++;
      } catch { failed++; }
    }
  }

  return { total: desiredFlagMap.size, created, updated, failed };
}

function getCsrfToken(): string {
  const value = _getCsrfTokenShared();
  debugLog('[featureFlagsApi] CSRF token:', value ? `${value.substring(0, 10)}...` : 'NOT FOUND');
  return value;
}
