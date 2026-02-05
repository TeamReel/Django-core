import { FeatureFlag } from './featureFlagStorage';
import { getApiBaseUrl } from './apiBase';

const API_BASE = '/api/v1/settings/feature-flags';

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
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
  const url = new URL(`${baseUrl}${API_BASE}/`, window.location.origin);
  url.searchParams.append('scope_type', scopeType);

  if (scopeType === 'ORGANISATION' && scopeId) {
    url.searchParams.append('organisation', scopeId);
  } else if (scopeType === 'PROJECT' && scopeId) {
    url.searchParams.append('project', scopeId);
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
  return data.data?.results || data.results || data.data || data || [];
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

export async function seedDefaultFlags(): Promise<{ total: number; created: number }> {
  const baseUrl = getApiBaseUrl();

  const normalizeKey = (value: string): string =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/_/g, '-')
      .replace(/[^a-z0-9.-]/g, '');

  const buildTemplateFlagKeys = (template: any): string[] => {
    const type = normalizeKey(template?.template_type || '');
    const subtype = normalizeKey(template?.template_subtype || template?.template_type || '');
    const style = normalizeKey(template?.style_variant || '');

    if (!type || !subtype) return [];

    const keys = new Set<string>();
    keys.add(`content.${type}`);
    keys.add(`content.${type}.${subtype}`);
    if (style) keys.add(`content.${type}.${subtype}.style.${style}`);
    return Array.from(keys);
  };

  const fetchTemplates = async (): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('page_size', '500');
      const res = await fetch(`${baseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      return Array.isArray(rawResults) ? rawResults : [];
    } catch (err) {
      console.warn('Failed to fetch templates for seeding flags', err);
      return [];
    }
  };

  const templates = await fetchTemplates();
  const flagKeys = new Set<string>();
  templates.forEach((template) => {
    buildTemplateFlagKeys(template).forEach((key) => flagKeys.add(key));
  });

  const defaults = Array.from(flagKeys).map((key) => ({
    key,
    description: `Content template availability: ${key}`,
    enabled: true,
  }));

  let created = 0;
  for (const flag of defaults) {
    // Check if exists first (optional, but good for idempotency if we had a check endpoint)
    // For now, just try to create. If it fails (unique constraint), we ignore.
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
          enabled: flag.enabled,
        }),
      });
      if (res.ok) created += 1;
    } catch (e) {
      console.warn(`Failed to seed flag ${flag.key} (might already exist)`);
    }
  }

  return { total: defaults.length, created };
}

function getCsrfToken(): string {
  const name = 'csrftoken';
  let cookieValue = '';
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  debugLog('[featureFlagsApi] CSRF token:', cookieValue ? `${cookieValue.substring(0, 10)}...` : 'NOT FOUND');
  return cookieValue;
}
