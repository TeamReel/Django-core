import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Alert,
  Table,
  Button,
} from '@django-core/design-system';

/**
 * T013 - Feature Flags Page
 *
 * Purpose: Show org-scoped flags with toggles and rollout percentages
 * - Displays enabled/disabled status
 * - Shows rollout percentages for beta features
 * - Respects B08 permissions (viewer read-only)
 */

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export const FeatureFlagsPage: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role and flags
  useEffect(() => {
    const fetchFlagsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current user role
        const userResponse = await fetch('/api/users/me/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role);
        }

        // Fetch feature flags
        const flagsResponse = await fetch('/api/features/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (flagsResponse.ok) {
          const flagsData = await flagsResponse.json();
          setFlags(flagsData.results || flagsData);
        } else {
          throw new Error(`API error: ${flagsResponse.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch feature flags');
        console.error('Flags fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlagsData();
  }, []);

  // Toggle flag state
  const handleToggleFlag = async (flagId: string, currentState: boolean) => {
    if (userRole === 'viewer') {
      alert('Viewers cannot modify feature flags. Contact an administrator.');
      return;
    }

    try {
      const response = await fetch(`/api/features/${flagId}/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled: !currentState }),
      });

      if (response.ok) {
        // Update local state
        setFlags(
          flags.map((flag) =>
            flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
          )
        );
      } else {
        throw new Error(`Failed to toggle flag: ${response.status}`);
      }
    } catch (err) {
      console.error('Toggle flag error:', err);
      alert('Failed to toggle feature flag');
    }
  };

  // Feature descriptions
  const featureDescriptions: Record<string, string> = {
    'dark-mode': 'Enable dark theme for all users',
    'advanced-analytics': 'Show advanced analytics dashboard',
    'custom-domains': 'Allow custom domain configuration',
    'api-keys': 'Enable API key management',
    'webhooks': 'Enable webhook integrations',
    'sso': 'Enable single sign-on',
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Feature Flags"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Feature Flags' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading feature flags...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <AppShell>
      <div>
      <PageHeader
        title="Feature Flags"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Feature Flags' },
        ]}
      />

      <PageContent>
        {error && (
          <Alert type="warning" className="mb-4" data-testid="flags-warning">
            {error}
          </Alert>
        )}

        {userRole === 'viewer' && (
          <Alert type="info" className="mb-4" data-testid="flags-viewer-notice">
            <strong>Read-only view:</strong> You can view feature flags but cannot modify them.
            Contact an administrator to make changes.
          </Alert>
        )}

        {/* Flags table */}
        {flags.length > 0 ? (
          <Table
            columns={[
              {
                key: 'name',
                label: 'Feature',
              },
              {
                key: 'status',
                label: 'Status',
              },
              {
                key: 'rollout',
                label: 'Rollout %',
              },
              {
                key: 'description',
                label: 'Description',
              },
              {
                key: 'actions',
                label: 'Actions',
              },
            ]}
            rows={flags.map((flag) => ({
              id: flag.id,
              name: (
                <div>
                  <div className="font-semibold" data-testid={`flag-name-${flag.id}`}>
                    {flag.name}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {flag.key}
                  </div>
                </div>
              ),
              status: (
                <Badge
                  variant={flag.enabled ? 'success' : 'warning'}
                  data-testid={`flag-status-${flag.id}`}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
              rollout: (
                <div data-testid={`flag-rollout-${flag.id}`}>
                  <div className="text-sm font-semibold">{flag.rollout_percentage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${flag.rollout_percentage}%` }}
                    />
                  </div>
                </div>
              ),
              description: (
                <p className="text-sm text-gray-600" data-testid={`flag-desc-${flag.id}`}>
                  {featureDescriptions[flag.key] || flag.description || '-'}
                </p>
              ),
              actions: (
                <Button
                  variant={flag.enabled ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={userRole === 'viewer'}
                  onClick={() => handleToggleFlag(flag.id, flag.enabled)}
                  data-testid={`flag-toggle-${flag.id}`}
                >
                  {flag.enabled ? 'Disable' : 'Enable'}
                </Button>
              ),
            }))}
            data-testid="flags-table"
          />
        ) : (
          <Alert type="info" data-testid="flags-empty">
            No feature flags configured yet.
          </Alert>
        )}

        {/* Info section */}
        <Card className="mt-6">
          <h3 className="text-lg font-semibold mb-2">About Feature Flags</h3>
          <p className="text-sm text-gray-600 mb-2">
            Feature flags allow you to enable or disable features for your organisation
            without deploying new code. Use rollout percentages to gradually release new
            features to a subset of users.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>
              <strong>Enabled:</strong> Feature is available to all users in your organisation
            </li>
            <li>
              <strong>Disabled:</strong> Feature is hidden from all users
            </li>
            <li>
              <strong>Rollout %:</strong> Percentage of users who see this feature (for gradual release)
            </li>
          </ul>
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default FeatureFlagsPage;
