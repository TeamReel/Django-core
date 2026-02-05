/**
 * FeatureFlagsCard - Reusable component for managing feature flags at org/project level
 *
 * Used in OrganisationDetailPage and ProjectDetailPage (club settings)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
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
        setGlobalFlags(globalData.results || globalData || []);
      }

      // Fetch scope-specific flags
      const scopeRes = await fetch(
        `${baseUrl}/api/v1/settings/feature-flags/?scope_type=${scopeType}&${scopeType === 'ORGANISATION' ? 'organisation' : 'project'}=${scopeId}`,
        { credentials: 'include' }
      );
      if (scopeRes.ok) {
        const scopeData = await scopeRes.json();
        setFlags(scopeData.results || scopeData || []);
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

  // Merge global and scope flags
  const mergedFlags = globalFlags.map(gf => {
    const scopeFlag = flags.find(f => f.key === gf.key);
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
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
          {scopeType === 'ORGANISATION' ? 'ORG' : 'PROJECT'}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Manage feature flags for <strong className="text-white">{scopeName}</strong>.
        {scopeType === 'PROJECT' && ' These override organisation settings.'}
      </p>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {mergedFlags.length === 0 ? (
        <p className="text-gray-500 text-sm">No feature flags available.</p>
      ) : (
        <div className="space-y-3">
          {mergedFlags.map(flag => {
            const effectiveEnabled = flag.hasOverride ? flag.scopeEnabled : flag.globalEnabled;
            const isUpdating = updating === flag.key;

            return (
              <div
                key={flag.key}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium capitalize">
                      {flag.key.replace(/_/g, ' ')}
                    </span>
                    {flag.hasOverride && (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        Override
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{flag.description}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className={`${flag.globalEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                      Global: {flag.globalEnabled ? 'On' : 'Off'}
                    </span>
                    {flag.hasOverride && (
                      <span className={`${flag.scopeEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                        {scopeType === 'ORGANISATION' ? 'Org' : 'Project'}: {flag.scopeEnabled ? 'On' : 'Off'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Effective status badge */}
                  <span className={`text-xs px-2 py-1 rounded ${
                    effectiveEnabled
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {effectiveEnabled ? 'Enabled' : 'Disabled'}
                  </span>

                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggle(flag.key, effectiveEnabled ?? false, flag.scopeFlagId)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isUpdating
                        ? 'bg-gray-600 text-gray-400 cursor-wait'
                        : effectiveEnabled
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isUpdating ? '...' : effectiveEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        💡 Tip: {scopeType === 'ORGANISATION'
          ? 'Organisation settings apply to all clubs unless overridden at project level.'
          : 'Project settings override both global and organisation settings.'}
      </p>
    </div>
  );
};

export default FeatureFlagsCard;
