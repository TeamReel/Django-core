/**
 * FeatureFlagsCard - Reusable component for managing feature flags at org/project level
 *
 * Used in OrganisationDetailPage and ProjectDetailPage (club settings)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  fetchFlagsForScope,
  createScopeOverride,
  updateOrgOverride,
  ScopeType
} from '../../utils/featureFlagsApi';

interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  scope_type: string;
}

interface FeatureFlagsCardProps {
  scopeType: 'ORGANISATION' | 'PROJECT';
  scopeId: string;
  scopeName: string;
  title?: string;
}

const FeatureFlagsCard: React.FC<FeatureFlagsCardProps> = ({
  scopeType,
  scopeId,
  scopeName,
  title = 'Feature Flags',
}) => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [globalFlags, setGlobalFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = getApiBaseUrl();

      // Fetch global flags to show what's available
      const globalRes = await fetch(`${baseUrl}/api/v1/settings/feature-flags/?scope_type=GLOBAL`, {
        credentials: 'include',
      });
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        // Handle B13 response envelope: data.results or data.data.results or results or data
        const globalArray = globalData?.data?.results || globalData?.results || globalData?.data || globalData;
        setGlobalFlags(Array.isArray(globalArray) ? globalArray : []);
      }

      // Fetch scope-specific flags
      const scopeRes = await fetch(
        `${baseUrl}/api/v1/settings/feature-flags/?scope_type=${scopeType}&${scopeType === 'ORGANISATION' ? 'organisation' : 'project'}=${scopeId}`,
        { credentials: 'include' }
      );
      if (scopeRes.ok) {
        const scopeData = await scopeRes.json();
        // Handle B13 response envelope
        const scopeArray = scopeData?.data?.results || scopeData?.results || scopeData?.data || scopeData;
        setFlags(Array.isArray(scopeArray) ? scopeArray : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    if (scopeId) {
      fetchData();
    }
  }, [scopeId, fetchData]);

  const handleToggle = async (flagKey: string, currentEnabled: boolean, flagId?: string) => {
    setUpdating(flagKey);
    try {
      if (flagId) {
        // Update existing override
        await updateOrgOverride(flagId, !currentEnabled);
      } else {
        // Create new override
        await createScopeOverride(scopeType as ScopeType, scopeId, flagKey, !currentEnabled);
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setUpdating(null);
    }
  };

  const isThemeFlagKey = (key: string): boolean => {
    const normalized = String(key || '').toLowerCase();
    return normalized.includes('dark_mode') || normalized.includes('dark_theme');
  };

  const filteredGlobalFlags = globalFlags.filter((flag) => !isThemeFlagKey(flag.key));
  const filteredScopeFlags = flags.filter((flag) => !isThemeFlagKey(flag.key));

  // Merge global and scope flags
  const mergedFlags = filteredGlobalFlags.map(gf => {
    const scopeFlag = filteredScopeFlags.find(f => f.key === gf.key);
    return {
      key: gf.key,
      description: gf.description,
      globalEnabled: gf.enabled,
      scopeEnabled: scopeFlag?.enabled,
      scopeFlagId: scopeFlag?.id,
      hasOverride: !!scopeFlag,
    };
  });

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-600 border-t-blue-600 rounded-full"></div>
          <p className="text-gray-400 mt-4">Loading feature flags...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Alert variant="info" className="mb-4">
        <strong>{scopeType === 'ORGANISATION' ? 'Organisation' : 'Project/Club'} Feature Flags:</strong>
        <ul className="mt-2 ml-4 list-disc space-y-1">
          <li><strong>Global Setting</strong>: The baseline value from global app settings.</li>
          <li><strong>{scopeType === 'ORGANISATION' ? 'Organisation' : 'Project'} Setting</strong>: Your {scopeType === 'ORGANISATION' ? 'organisation' : 'club'} override (if configured).</li>
          <li><strong>Effective Value</strong>: The actual active setting for {scopeName}.</li>
          <li className="text-amber-700 dark:text-amber-400">
            ⚠️ If a global flag is <strong>disabled</strong>, it overrides all {scopeType === 'ORGANISATION' ? 'organisation' : 'project'} settings.
          </li>
        </ul>
      </Alert>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {mergedFlags.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No feature flags available.
        </div>
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Feature Flag' },
            { key: 'global_setting', label: 'Global Setting' },
            { key: 'scope_setting', label: `${scopeType === 'ORGANISATION' ? 'Org' : 'Project'} Setting` },
            { key: 'effective_value', label: 'Effective Value' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={mergedFlags.map(flag => {
            const globalValue = flag.globalEnabled;
            const scopeValue = flag.scopeEnabled;
            const effectiveValue = flag.hasOverride ? scopeValue : globalValue;
            const isGlobalDisabled = globalValue === false;
            const isUpdating = updating === flag.key;

            // Determine if toggle should be disabled
            let isDisabled = false;
            let disabledReason = '';

            // Cannot enable if global is disabled
            if (isGlobalDisabled && !effectiveValue) {
              isDisabled = true;
              disabledReason = `Cannot enable: Global setting is disabled. ${scopeType === 'ORGANISATION' ? 'Org' : 'Project'} must be more restrictive.`;
            }

            return {
              id: flag.key,
              name: (
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {flag.key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{flag.description}</div>
                </div>
              ),
              global_setting: (
                <Badge variant={globalValue ? 'success' : 'default'}>
                  {globalValue ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              scope_setting: flag.hasOverride ? (
                <Badge variant={scopeValue ? 'success' : 'default'}>
                  {scopeValue ? 'Enabled' : 'Disabled'}
                </Badge>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm italic">
                  Inherited from global
                </span>
              ),
              effective_value: isGlobalDisabled && scopeValue === true ? (
                <div>
                  <Badge variant="default">Disabled</Badge>
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span></span>
                    <span>Overridden by global</span>
                  </div>
                </div>
              ) : (
                <Badge variant={effectiveValue ? 'success' : 'default'}>
                  {effectiveValue ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              actions: (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant={effectiveValue ? 'outline' : 'primary'}
                    disabled={isDisabled || isUpdating}
                    title={isDisabled ? disabledReason : undefined}
                    onClick={() => handleToggle(flag.key, effectiveValue ?? false, flag.scopeFlagId)}
                  >
                    {isUpdating ? '...' : effectiveValue ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              ),
            };
          })}
        />
      )}
    </Card>
  );
};

export default FeatureFlagsCard;
