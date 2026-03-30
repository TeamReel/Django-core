import { FeatureFlag } from './featureFlagStorage';

const API_BASE = '/api/v1/settings/feature-flags';

export interface ApiFeatureFlag extends FeatureFlag {
  global_id: string;
  org_override_id: string | null;
  global_value: boolean | null;
  org_value: boolean | null;
}

export async function fetchFlags(orgId: string | null): Promise<ApiFeatureFlag[]> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const url = new URL(`${baseUrl}${API_BASE}/resolve-all/`);
  if (orgId) {
    url.searchParams.append('organisation_id', orgId);
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

export async function updateGlobalFlag(flagId: string, enabled: boolean): Promise<void> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const response = await fetch(`${baseUrl}${API_BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({
      scope_type: 'ORGANISATION',
      organisation: orgId,
      key: key,
      enabled: enabled,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create org override: ${response.statusText}`);
  }
}

export async function updateOrgOverride(overrideId: string, enabled: boolean): Promise<void> {
  console.log('[featureFlagsApi] updateOrgOverride called:', { overrideId, enabled });

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseUrl}${API_BASE}/${overrideId}/`;
  console.log('[featureFlagsApi] Making PATCH request to:', url);

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

    console.log('[featureFlagsApi] updateOrgOverride response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[featureFlagsApi] updateOrgOverride error response:', errorText);
      throw new Error(`Failed to update org override: ${response.statusText} - ${errorText}`);
    }

    console.log('[featureFlagsApi] updateOrgOverride completed successfully');
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - server not responding');
    }
    throw error;
  }
}

export async function deleteOrgOverride(overrideId: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
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

export async function seedDefaultFlags(): Promise<void> {
  const defaults = [
    { key: 'dark_mode', description: 'Enable dark mode theme support', enabled: true },
  ];

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

  for (const flag of defaults) {
    // Check if exists first (optional, but good for idempotency if we had a check endpoint)
    // For now, just try to create. If it fails (unique constraint), we ignore.
    try {
      await fetch(`${baseUrl}${API_BASE}/`, {
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
    } catch (e) {
      console.warn(`Failed to seed flag ${flag.key} (might already exist)`);
    }
  }
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
  console.log('[featureFlagsApi] CSRF token:', cookieValue ? `${cookieValue.substring(0, 10)}...` : 'NOT FOUND');
  return cookieValue;
}
