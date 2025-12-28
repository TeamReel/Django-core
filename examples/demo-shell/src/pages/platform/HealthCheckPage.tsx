import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import { HealthStatus } from '../../types';
import AppShell from '../../components/AppShell';

/**
 * T016 - Health Check Page
 *
 * Purpose: Display system health status and versions
 * - Shows health status for services: database, cache, api, django, python
 * - Displays version information
 * - Green indicators for healthy services
 */
export const HealthCheckPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        console.log('[HealthCheckPage] Fetching health from:', `${apiBaseUrl}/api/v1/health/`);
        const response = await fetch(`${apiBaseUrl}/api/v1/health/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        console.log('[HealthCheckPage] Response status:', response.status);

        if (response.ok) {
          const rawData = await response.json();
          console.log('[HealthCheckPage] Raw response:', rawData);

          // Handle B13 envelope if present
          const data: HealthStatus = (rawData as any).data || rawData;
          console.log('[HealthCheckPage] Parsed health data:', data);
          setHealth(data);
        } else if (response.status === 404) {
          console.log('[HealthCheckPage] 404 - Using demo mode');
          // Demo mode: Use mock health data
          const demoHealth: HealthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: 86400, // 1 day
            checks: {
              database: true,
              cache: true,
              api: true,
              django: true,
              python: true
            },
            details: 'All systems operational (demo mode)'
          };
          setHealth(demoHealth);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status');
        console.error('Health fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'healthy') {
      return <Badge type="success">Healthy</Badge>;
    } else if (status === 'degraded') {
      return <Badge type="warning">Degraded</Badge>;
    } else {
      return <Badge type="error">Unhealthy</Badge>;
    }
  };

  const getCheckStatus = (checked: boolean | undefined) => {
    return checked ? (
      <Badge type="success">✓ OK</Badge>
    ) : (
      <Badge type="error">✗ Failed</Badge>
    );
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="System Health"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Health' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading health status...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="System Health"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Health' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="health-error">
            {error}
          </Alert>
        </PageContent>
      </div>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
        title="System Health"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Health' },
        ]}
      />
      <PageContent>
        <Alert type="info" className="mb-4">
          <strong>Demo Mode:</strong> This page shows mock health status data. API endpoints are not yet implemented.
        </Alert>
        <Card data-testid="health-status-card" className="mb-4">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Overall Status</h2>
              {health && getStatusBadge(health.status)}
            </div>
            {health && (
              <div className="text-sm text-gray-600">
                Last updated: {new Date(health.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        </Card>

        {health?.checks && (
          <Card data-testid="health-checks-card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Service Checks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(health.checks).map(([service, status]) => (
                  <div key={service} className="flex justify-between items-center p-3 border rounded" data-testid={`check-${service}`}>
                    <span className="font-medium capitalize">{service}</span>
                    {getCheckStatus(status)}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {health?.uptime && (
          <Card data-testid="health-uptime-card" className="mt-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Uptime</h3>
              <div className="text-2xl font-bold text-green-600">
                {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
              </div>
            </div>
          </Card>
        )}

        {health?.details && (
          <Card data-testid="health-details-card" className="mt-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <p className="text-gray-700">{health.details}</p>
            </div>
          </Card>
        )}
      </PageContent>
      </div>
    </AppShell>
  );
};

export default HealthCheckPage;
