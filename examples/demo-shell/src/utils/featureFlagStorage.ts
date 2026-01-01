/**
 * Tenant-aware feature flag storage for demo mode
 *
 * Structure:
 * {
 *   global: { flag_key: boolean, ... },      // Global defaults (Superadmin)
 *   orgs: {
 *     [orgId]: { flag_key: boolean, ... }    // Org-specific overrides (Org Admin)
 *   }
 * }
 *
 * Resolution priority: Org override > Global > Default
 */

const STORAGE_KEY = 'feature_flags_tenant_aware';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  provisioned?: boolean;
  resolutionSource?: 'global' | 'override' | 'provisioning_restriction' | 'global_disabled' | 'organisation';
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface FlagStorage {
  global: Record<string, boolean>;
  orgs: Record<string, Record<string, boolean>>;
  provisioning: Record<string, Record<string, boolean>>;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: '2',
    name: 'Dark Mode',
    key: 'dark_mode',
    description: 'Allow users to switch between light and dark themes',
    enabled: true,
    rollout_percentage: 100,
    created_at: '2024-02-10T09:00:00Z',
    updated_at: '2024-12-15T11:20:00Z',
  },
];

/**
 * Get flag storage from localStorage
 */
export function getFlagStorage(): FlagStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: Ensure provisioning object exists
      if (!parsed.provisioning) {
        parsed.provisioning = {};
        saveFlagStorage(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error loading flag storage:', err);
  }

  // Initialize with defaults if not present
  const initial: FlagStorage = {
    global: {},
    orgs: {},
    provisioning: {},
  };

  // Set global defaults from DEFAULT_FLAGS
  DEFAULT_FLAGS.forEach(flag => {
    initial.global[flag.key] = flag.enabled;
  });

  saveFlagStorage(initial);
  return initial;
}

/**
 * Save flag storage to localStorage
 */
export function saveFlagStorage(storage: FlagStorage): void {
  try {
    const jsonData = JSON.stringify(storage);
    localStorage.setItem(STORAGE_KEY, jsonData);
    console.log('[FeatureFlags] Storage saved:', storage);
    // Dispatch event for other components to react (same tab)
    window.dispatchEvent(new CustomEvent('featureFlagsChanged'));
    // For cross-tab updates, the 'storage' event will fire automatically
  } catch (err) {
    console.error('Error saving flag storage:', err);
  }
}

/**
 * Get resolved flag value for a specific organisation
 * Priority: Global disabled (master switch) > Org override > Global enabled > Default
 *
 * Global disabled acts as a master switch - it disables the feature everywhere
 * but preserves org overrides, so they become active again when global is re-enabled.
 */
export function getResolvedFlag(
  flagKey: string,
  orgId: string | null,
  defaultValue: boolean = false
): boolean {
  const storage = getFlagStorage();

  // MASTER SWITCH: If global is explicitly disabled, that overrides everything
  // (but org overrides remain stored and will become active if global is re-enabled)
  if (storage.global[flagKey] === false) {
    return false;
  }

  // If org context exists, check for org override
  if (orgId && storage.orgs[orgId]?.[flagKey] !== undefined) {
    return storage.orgs[orgId][flagKey];
  }

  // Fall back to global value (if enabled or not set)
  if (storage.global[flagKey] !== undefined) {
    return storage.global[flagKey];
  }

  // Ultimate fallback to default
  return defaultValue;
}

/**
 * Set global flag value (Superadmin only)
 */
export function setGlobalFlag(flagKey: string, enabled: boolean): void {
  const storage = getFlagStorage();
  storage.global[flagKey] = enabled;
  saveFlagStorage(storage);
}

/**
 * Set org-specific flag override (Org Admin)
 */
export function setOrgFlag(orgId: string, flagKey: string, enabled: boolean): void {
  const storage = getFlagStorage();

  if (!storage.orgs[orgId]) {
    storage.orgs[orgId] = {};
  }

  storage.orgs[orgId][flagKey] = enabled;
  saveFlagStorage(storage);
}

/**
 * Set org provisioning status (Superadmin)
 */
export function setOrgProvisioning(orgId: string, flagKey: string, provisioned: boolean): void {
  const storage = getFlagStorage();

  if (!storage.provisioning) {
    storage.provisioning = {};
  }
  if (!storage.provisioning[orgId]) {
    storage.provisioning[orgId] = {};
  }

  storage.provisioning[orgId][flagKey] = provisioned;

  // If unprovisioning, we might want to ensure the flag is effectively off
  // But the resolution logic handles that.

  saveFlagStorage(storage);
}

/**
 * Remove org-specific override (reset to global default)
 */
export function removeOrgFlag(orgId: string, flagKey: string): void {
  const storage = getFlagStorage();

  if (storage.orgs[orgId]) {
    delete storage.orgs[orgId][flagKey];

    // Clean up empty org objects
    if (Object.keys(storage.orgs[orgId]).length === 0) {
      delete storage.orgs[orgId];
    }

    saveFlagStorage(storage);
  }
}

/**
 * Check if a flag has an org-specific override
 */
export function hasOrgOverride(orgId: string | null, flagKey: string): boolean {
  if (!orgId) return false;

  const storage = getFlagStorage();
  return storage.orgs[orgId]?.[flagKey] !== undefined;
}

/**
 * Get all flags with resolved values for display
 */
export function getAllFlagsWithResolution(orgId: string | null): FeatureFlag[] {
  const storage = getFlagStorage();
  console.log('[FeatureFlags] Resolving flags for orgId:', orgId, 'Storage:', storage);

  return DEFAULT_FLAGS.map(flag => {
    // Determine provisioning status
    // Default to true if not set, to allow existing flags to work
    let isProvisioned = true;
    if (orgId) {
      if (storage.provisioning && storage.provisioning[orgId] && storage.provisioning[orgId][flag.key] !== undefined) {
        isProvisioned = storage.provisioning[orgId][flag.key];
        console.log(`[FeatureFlags] Flag ${flag.key} provisioning for org ${orgId}:`, isProvisioned);
      } else {
        console.log(`[FeatureFlags] Flag ${flag.key} has no explicit provisioning for org ${orgId}, defaulting to true`);
      }
    }

    // Resolve value
    // Priority: Global disabled (master switch) > Provisioning > Org override > Global > Default

    // Check if global is explicitly disabled (master switch)
    const globalValue = storage.global[flag.key];
    const globalDisabled = globalValue === false;

    let enabled = getResolvedFlag(flag.key, orgId, flag.enabled);
    let resolutionSource: 'global' | 'override' | 'provisioning_restriction' | 'global_disabled' = 'global';

    if (orgId) {
      if (hasOrgOverride(orgId, flag.key)) {
        resolutionSource = 'override';
      }

      if (!isProvisioned) {
        enabled = false;
        resolutionSource = 'provisioning_restriction';
      }
    }

    // MASTER SWITCH: Global disabled overrides everything (but org overrides stay stored)
    if (globalDisabled) {
      enabled = false;
      // Keep the resolutionSource to show WHY it's disabled
      // If there was an override, it's now overridden by global
      if (resolutionSource === 'override') {
        resolutionSource = 'global_disabled';
      }
    }

    return {
      ...flag,
      enabled,
      provisioned: isProvisioned,
      resolutionSource,
    };
  });
}

/**
 * Get default flags (for initialization)
 */
export function getDefaultFlags(): FeatureFlag[] {
  return DEFAULT_FLAGS;
}
